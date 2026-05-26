import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, ShoppingBag, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../lib/utils';
import { showToast } from './Toast';
import { showConfirm } from './ConfirmDialog';
import Spinner from './Spinner';

export default function Products({ userRole = 'admin', shiftId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', category: 'Regular' });
  const [sellQuantities, setSellQuantities] = useState({});
  const [sellingId, setSellingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = formData.name;
    const price = Number(formData.price);
    const stock = Number(formData.stock);
    const category = formData.category || 'Regular';

    if (editingId) {
      await supabase.from('products').update({ name, price, stock, category }).eq('id', editingId);
    } else {
      await supabase.from('products').insert([{ name, price, stock, category }]);
    }

    setShowModal(false);
    setFormData({ name: '', price: '', stock: '', category: 'Regular' });
    setEditingId(null);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('This product and its data will be permanently removed.');
    if (confirmed) {
      await supabase.from('products').delete().eq('id', id);
      showToast('Product deleted successfully', 'success');
      fetchProducts();
    }
  };

  const handleSell = async (product, qty) => {
    if (product.stock < qty) {
      showToast('Not enough stock!', 'error');
      return;
    }
    
    setSellingId(product.id);
    
    try {
      const { data: latestProduct, error: fetchErr } = await supabase
        .from('products')
        .select('stock')
        .eq('id', product.id)
        .single();
        
      if (fetchErr || !latestProduct || latestProduct.stock < qty) {
        showToast('Transaction failed: Not enough stock available.', 'error');
        setSellingId(null);
        return;
      }

      const salePayload = {
        product_id: product.id,
        quantity: qty,
        total_price: product.price * qty,
        sale_date: new Date().toISOString().split('T')[0],
        ...(shiftId && { shift_id: shiftId })
      };

      await supabase.from('products').update({ stock: latestProduct.stock - qty }).eq('id', product.id);
      await supabase.from('sales').insert([salePayload]);
      
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, stock: p.stock - qty } : p
      ));

      setSellQuantities(prev => ({ ...prev, [product.id]: 1 }));
      showToast(`Sold ${qty}x ${product.name} — Rs. ${product.price * qty}`, 'success');
      fetchProducts();
    } catch (err) {
      console.error("Sale transaction error:", err);
      showToast('Error processing sale.', 'error');
    } finally {
      setSellingId(null);
    }
  };

  const openEdit = (product) => {
    setFormData({ name: product.name, price: product.price, stock: product.stock, category: product.category || 'Regular' });
    setEditingId(product.id);
    setShowModal(true);
  };

  const categories = ['All', ...new Set(products.map(p => p.category || 'Regular'))];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || (p.category || 'Regular') === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>{userRole === 'admin' ? 'Manage Products' : 'Point of Sale'}</h2>
        {userRole === 'admin' && (
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData({ name: '', price: '', stock: '', category: 'Regular' }); setShowModal(true); }}>
            <Plus size={18} /> Add New Product
          </button>
        )}
      </div>

      <div className="glass-card mb-4" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Search products..." 
          style={{ maxWidth: '300px', margin: 0 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilterCategory(cat)}
              className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '20px', padding: '0.25rem 1rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner text="Loading products..." />
      ) : (
        <div className="grid-3">
          <AnimatePresence>
            {filteredProducts.map(product => (
              <motion.div 
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card"
                style={{
                  border: product.stock < 5 ? '1px solid var(--danger)' : undefined,
                  boxShadow: product.stock < 5 ? '0 0 15px rgba(229, 62, 62, 0.2)' : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h3>
                    <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>
                      Rs. {formatCurrency(product.price)}
                    </p>
                    <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '2px 8px', background: 'var(--card-bg)', borderRadius: '10px', marginTop: '4px' }}>
                      {product.category || 'Regular'}
                    </span>
                  </div>
                  <div style={{ 
                    background: product.stock < 5 ? 'rgba(229, 62, 62, 0.1)' : 'var(--bg-gradient)', 
                    color: product.stock < 5 ? 'var(--danger)' : 'inherit',
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    textAlign: 'center',
                    minWidth: '60px',
                    border: product.stock < 5 ? '1px solid var(--danger)' : 'none'
                  }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Stock</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {formatCurrency(product.stock)}
                      {product.stock < 5 && <span style={{display: 'block', fontSize: '0.6rem', marginTop: '-2px'}}>LOW</span>}
                    </div>
                  </div>
                </div>

              <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    min="1" 
                    className="input-field" 
                    style={{ width: '60px', padding: '0.4rem', borderRadius: '8px', textAlign: 'center' }}
                    value={sellQuantities[product.id] || 1}
                    onChange={(e) => setSellQuantities({...sellQuantities, [product.id]: parseInt(e.target.value) || 1})}
                  />
                  <button 
                    className="btn btn-sm btn-outline btn-icon-hover" 
                    onClick={() => handleSell(product, sellQuantities[product.id] || 1)}
                    disabled={sellingId === product.id}
                    style={{ opacity: sellingId === product.id ? 0.6 : 1, pointerEvents: sellingId === product.id ? 'none' : 'auto' }}
                  >
                    {sellingId === product.id ? '...' : 'Sell'}
                  </button>
                </div>
                {userRole === 'admin' && (
                  <>
                    <button className="btn btn-sm btn-primary btn-icon-hover" onClick={() => openEdit(product)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn btn-sm btn-icon-hover" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => handleDelete(product.id)}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px' }}>
            <h3 className="mb-3">{editingId ? 'Edit Product' : 'New Product'}</h3>
            <form onSubmit={handleSave}>
              <div className="mb-2">
                <label className="text-muted" style={{ fontSize: '0.9rem' }}>Product Name</label>
                <input 
                  required
                  className="input-field mt-1" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="mb-2">
                <label className="text-muted" style={{ fontSize: '0.9rem' }}>Price (Rs.)</label>
                <input 
                  required
                  type="number"
                  className="input-field mt-1" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label>Stock Quantity</label>
                <input type="number" required className="input-field" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="mb-4">
                <label>Category</label>
                <input type="text" className="input-field" placeholder="e.g. Regular, Special, Family Pack" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="flex justify-between gap-3">
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
