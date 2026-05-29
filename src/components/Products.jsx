import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../lib/utils';
import { showToast } from './Toast';
import { showConfirm } from './ConfirmDialog';
import Spinner from './Spinner';

export default function Products({ userRole = 'admin', shiftId, userBranchId }) {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchStockMap, setBranchStockMap] = useState({}); // { product_id: { branch_id: stock } }
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', category: 'Regular' });
  const [branchStocks, setBranchStocks] = useState({}); // { branch_id: stock_qty }
  
  const [sellQuantities, setSellQuantities] = useState({});
  const [sellingId, setSellingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    fetchData();
  }, [userBranchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all products
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (prodErr) throw prodErr;
      const fetchedProducts = prodData || [];

      // 2. Fetch inventory and branches based on role
      if (userRole === 'admin') {
        const { data: branchData } = await supabase.from('branches').select('*').order('name');
        const { data: invData } = await supabase.from('branch_inventory').select('*');
        
        const bList = branchData || [];
        setBranches(bList);
        
        // Map product stocks: product_id -> branch_id -> stock
        const invMap = {};
        invData?.forEach(i => {
          if (!invMap[i.product_id]) invMap[i.product_id] = {};
          invMap[i.product_id][i.branch_id] = i.stock;
        });
        setBranchStockMap(invMap);
        setProducts(fetchedProducts);
      } else {
        // Staff view - fetch inventory for their branch only
        const { data: invData } = await supabase
          .from('branch_inventory')
          .select('*')
          .eq('branch_id', userBranchId);
          
        const stockMap = {};
        invData?.forEach(i => {
          stockMap[i.product_id] = i.stock;
        });
        
        // Only show products that exist in this branch's inventory
        const branchProducts = fetchedProducts
          .filter(p => stockMap[p.id] !== undefined)
          .map(p => ({
            ...p,
            stock: stockMap[p.id]
          }));
        setProducts(branchProducts);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      showToast('Error loading data.', 'error');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = formData.name;
    const price = Number(formData.price);
    const category = formData.category || 'Regular';

    try {
      let productId = editingId;
      
      // Save global product details
      if (editingId) {
        await supabase.from('products').update({ name, price, category }).eq('id', editingId);
      } else {
        const { data, error } = await supabase.from('products').insert([{ name, price, category }]).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Save branch stocks (only for branches where admin entered a value)
      const upsertData = branches
        .filter(b => branchStocks[b.id] !== undefined && branchStocks[b.id] !== '')
        .map(b => ({
          branch_id: b.id,
          product_id: productId,
          stock: Number(branchStocks[b.id] || 0)
        }));

      if (upsertData.length > 0) {
        await supabase.from('branch_inventory').upsert(upsertData, { onConflict: 'branch_id,product_id' });
      }

      showToast('Product saved successfully', 'success');
      setShowModal(false);
      setFormData({ name: '', price: '', category: 'Regular' });
      setBranchStocks({});
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error saving product.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('This product and its inventory across all branches will be permanently removed.');
    if (confirmed) {
      await supabase.from('products').delete().eq('id', id);
      showToast('Product deleted successfully', 'success');
      fetchData();
    }
  };

  const handleSell = async (product, qty) => {
    if (product.stock < qty) {
      showToast('Not enough stock!', 'error');
      return;
    }
    
    setSellingId(product.id);
    
    try {
      // 1. Fetch latest stock from branch_inventory
      const { data: latestInv, error: fetchErr } = await supabase
        .from('branch_inventory')
        .select('stock')
        .eq('product_id', product.id)
        .eq('branch_id', userBranchId)
        .single();
        
      if (fetchErr || !latestInv || latestInv.stock < qty) {
        showToast('Transaction failed: Not enough stock available.', 'error');
        setSellingId(null);
        return;
      }

      const salePayload = {
        product_id: product.id,
        branch_id: userBranchId,
        quantity: qty,
        total_price: product.price * qty,
        sale_date: new Date().toISOString().split('T')[0],
        ...(shiftId && { shift_id: shiftId })
      };

      // 2. Decrement stock from branch inventory
      await supabase
        .from('branch_inventory')
        .update({ stock: latestInv.stock - qty })
        .eq('product_id', product.id)
        .eq('branch_id', userBranchId);

      // 3. Record the sale
      await supabase.from('sales').insert([salePayload]);
      
      // Update local state instantly for UI responsiveness
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, stock: p.stock - qty } : p
      ));

      setSellQuantities(prev => ({ ...prev, [product.id]: '' }));
      showToast(`Sold ${qty}x ${product.name} — Rs. ${product.price * qty}`, 'success');
    } catch (err) {
      console.error("Sale transaction error:", err);
      showToast('Error processing sale.', 'error');
    } finally {
      setSellingId(null);
    }
  };

  const openEdit = (product) => {
    setFormData({ name: product.name, price: product.price, category: product.category || 'Regular' });
    
    // Set stock values for each branch in state
    const stocks = {};
    branches.forEach(b => {
      stocks[b.id] = branchStockMap[product.id]?.[b.id] || 0;
    });
    
    setBranchStocks(stocks);
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
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData({ name: '', price: '', category: 'Regular' }); setBranchStocks({}); setShowModal(true); }}>
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
            {filteredProducts.map(product => {
              // Determine low stock color alert
              let isLowStock = false;
              if (userRole === 'admin') {
                // If any branch is low stock (< 5)
                isLowStock = branches.some(b => (branchStockMap[product.id]?.[b.id] || 0) < 5);
              } else {
                isLowStock = product.stock < 5;
              }

              return (
                <motion.div 
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card"
                  style={{
                    border: isLowStock ? '1px solid var(--danger)' : undefined,
                    boxShadow: isLowStock ? '0 0 15px rgba(229, 62, 62, 0.2)' : undefined
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

                    {userRole === 'staff' && (
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
                    )}
                  </div>

                  {/* Admin Branch Inventory breakdown */}
                  {userRole === 'admin' && (
                    <div style={{ marginTop: '1rem', background: 'var(--card-bg)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>Branch Stock</div>
                      {branches.map(b => {
                        const stockAmt = branchStockMap[product.id]?.[b.id] || 0;
                        return (
                          <div key={b.id} className="flex justify-between items-center" style={{ fontSize: '0.85rem', padding: '2px 0' }}>
                            <span className="text-muted">{b.name}</span>
                            <span style={{ fontWeight: 600, color: stockAmt < 5 ? 'var(--danger)' : 'inherit' }}>
                              {formatCurrency(stockAmt)} {stockAmt < 5 ? '(LOW)' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    {userRole === 'staff' ? (
                      <div style={{ width: '100%' }}>
                        {/* Quick Sale Buttons */}
                        <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                          {[1, 2, 3, 5, 10].map(qty => (
                            <button 
                              key={qty}
                              className="btn btn-sm btn-primary btn-icon-hover"
                              onClick={() => handleSell(product, qty)}
                              disabled={sellingId === product.id || product.stock < qty}
                              style={{ 
                                flex: '1', 
                                minWidth: '45px',
                                opacity: (sellingId === product.id || product.stock < qty) ? 0.4 : 1,
                                pointerEvents: (sellingId === product.id || product.stock < qty) ? 'none' : 'auto',
                                padding: '0.5rem 0.3rem',
                                fontSize: '0.9rem'
                              }}
                            >
                              +{qty}
                            </button>
                          ))}
                        </div>
                        {/* Custom Quantity Row */}
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            min="1" 
                            className="input-field" 
                            style={{ width: '70px', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', fontSize: '1.1rem' }}
                            value={sellQuantities[product.id] !== undefined ? sellQuantities[product.id] : ''}
                            onChange={(e) => setSellQuantities({...sellQuantities, [product.id]: e.target.value === '' ? '' : parseInt(e.target.value) || ''})}
                            onFocus={(e) => e.target.select()}
                            placeholder="Qty"
                          />
                          <button 
                            className="btn btn-sm btn-outline btn-icon-hover" 
                            onClick={() => {
                              const qty = parseInt(sellQuantities[product.id]) || 0;
                              if (qty < 1) { showToast('Please enter quantity', 'error'); return; }
                              handleSell(product, qty);
                            }}
                            disabled={sellingId === product.id}
                            style={{ opacity: sellingId === product.id ? 0.6 : 1, pointerEvents: sellingId === product.id ? 'none' : 'auto' }}
                          >
                            {sellingId === product.id ? '...' : 'Sell'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-primary btn-icon-hover" onClick={() => openEdit(product)}>
                          <Edit2 size={14} /> Edit Product
                        </button>
                        <button className="btn btn-sm btn-icon-hover" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => handleDelete(product.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                <label className="text-muted" style={{ fontSize: '0.9rem' }}>Category</label>
                <input 
                  type="text" 
                  className="input-field mt-1" 
                  placeholder="e.g. Regular, Special" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                />
              </div>

              {/* Enter Branch Stock separate levels */}
              <div className="mb-4" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                <h4 className="mb-2" style={{ fontSize: '1rem' }}>Branch Stocks</h4>
                <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>Leave empty to skip a branch. Product will only appear in branches where you enter stock.</p>
                {branches.map(b => (
                  <div className="mb-2" key={b.id}>
                    <label className="text-muted" style={{ fontSize: '0.85rem' }}>{b.name} Stock Level</label>
                    <input 
                      type="number"
                      min="0"
                      className="input-field mt-1"
                      value={branchStocks[b.id] !== undefined ? branchStocks[b.id] : ''}
                      onChange={e => setBranchStocks({...branchStocks, [b.id]: e.target.value === '' ? undefined : (parseInt(e.target.value) || 0)})}
                      placeholder="Leave empty to skip"
                    />
                  </div>
                ))}
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
