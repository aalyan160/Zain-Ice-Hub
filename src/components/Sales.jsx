import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Share2, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';
import { showToast } from './Toast';
import { showConfirm } from './ConfirmDialog';
import Spinner from './Spinner';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState({});
  const [branches, setBranches] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedBranch]);

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*').order('name');
    if (data) setBranches(data);
  };

  const fetchData = async () => {
    setLoading(true);
    // Fetch products to map names
    const { data: prodData } = await supabase.from('products').select('*');
    const prodMap = {};
    prodData?.forEach(p => prodMap[p.id] = p.name);
    setProducts(prodMap);

    // Fetch sales for selected date and branch
    let query = supabase
      .from('sales')
      .select('*')
      .eq('sale_date', selectedDate);

    if (selectedBranch !== 'All') {
      query = query.eq('branch_id', selectedBranch);
    }
      
    const { data: salesData } = await query.order('created_at', { ascending: false });
    setSales(salesData || []);
    setLoading(false);
  };

  const handleShare = () => {
    const totalEarnings = sales.reduce((acc, s) => acc + Number(s.total_price), 0);
    const totalSold = sales.reduce((acc, s) => acc + s.quantity, 0);
    const branchName = selectedBranch === 'All' ? 'All Branches' : branches.find(b => b.id === selectedBranch)?.name || 'Unknown';
    
    let text = `*Zain Ice Hub - Sales Report*\nBranch: ${branchName}\nDate: ${format(new Date(selectedDate), 'MMM do, yyyy')}\n\n`;
    text += `*Total Items Sold:* ${formatCurrency(totalSold)}\n`;
    text += `*Total Earnings:* Rs. ${formatCurrency(totalEarnings)}\n\n`;
    
    // Detailed breakdown
    const breakdown = {};
    sales.forEach(s => {
      const name = products[s.product_id] || 'Unknown';
      if (!breakdown[name]) breakdown[name] = { qty: 0, total: 0 };
      breakdown[name].qty += s.quantity;
      breakdown[name].total += Number(s.total_price);
    });
    
    Object.keys(breakdown).forEach(name => {
      text += `- ${name}: ${formatCurrency(breakdown[name].qty)} (Rs. ${formatCurrency(breakdown[name].total)})\n`;
    });
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDeleteSale = async (sale) => {
    const confirmed = await showConfirm(`Delete this sale of ${sale.quantity} items? Stock will be returned to the product stock for its branch.`);
    if (confirmed) {
      try {
        // Fetch current branch inventory for the product
        if (sale.branch_id) {
          const { data: inv } = await supabase
            .from('branch_inventory')
            .select('stock')
            .eq('product_id', sale.product_id)
            .eq('branch_id', sale.branch_id)
            .single();
            
          if (inv) {
            await supabase
              .from('branch_inventory')
              .update({ stock: inv.stock + sale.quantity })
              .eq('product_id', sale.product_id)
              .eq('branch_id', sale.branch_id);
          }
        }
        
        await supabase.from('sales').delete().eq('id', sale.id);
        setSales(sales.filter(s => s.id !== sale.id));
        showToast('Sale deleted & stock reverted', 'success');
      } catch (err) {
        console.error("Error deleting sale:", err);
        showToast('Failed to delete the sale.', 'error');
      }
    }
  };

  const totalEarnings = sales.reduce((acc, s) => acc + Number(s.total_price), 0);
  const totalSold = sales.reduce((acc, s) => acc + s.quantity, 0);

  return (
    <div>
      <div className="glass-card mb-4">
        <div className="flex justify-between items-center flex-wrap gap-3 mb-3">
          <div>
            <h2>Sales History</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              {formatCurrency(totalSold)} sold on {format(new Date(selectedDate), 'MMM do, yyyy')} • Rs. {formatCurrency(totalEarnings)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Branch Selector */}
            <div className="flex items-center gap-2" style={{ background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid var(--card-border)' }}>
              <Filter size={16} className="text-primary" />
              <select 
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text)', cursor: 'pointer' }}
              >
                <option value="All">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Date Calendar */}
            <div className="flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.8)', padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid var(--card-border)' }}>
              <Calendar size={18} className="text-primary" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text)' }}
              />
            </div>

            <button className="btn btn-whatsapp" onClick={handleShare}>
              <Share2 size={18} /> Share
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner text="Loading sales..." />
        ) : sales.length === 0 ? (
          <div className="text-center py-4" style={{ border: '1px dashed var(--card-border)', borderRadius: '12px' }}>
            <p className="text-muted">No sales matching these criteria on this date.</p>
          </div>
        ) : (
          <motion.div 
            style={{ overflowX: 'auto' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Branch</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Quantity</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Total Price</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Time</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: 500 }}>{products[sale.product_id] || 'Unknown'}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', background: 'var(--card-bg)', padding: '2px 8px', borderRadius: '10px' }}>
                        {sale.branch_id ? branches.find(b => b.id === sale.branch_id)?.name || 'Unknown' : 'Global'}
                      </span>
                    </td>
                    <td>{formatCurrency(sale.quantity)}</td>
                    <td>Rs. {formatCurrency(sale.total_price)}</td>
                    <td className="text-muted">{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-sm btn-icon-hover" 
                        style={{ background: 'var(--danger)', color: 'white', padding: '0.4rem' }} 
                        onClick={() => handleDeleteSale(sale)}
                        title="Delete Sale & Revert Stock"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
