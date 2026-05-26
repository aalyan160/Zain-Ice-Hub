import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PackageSearch, ShoppingCart, Wallet, TrendingUp, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';
import AnimatedCounter from './AnimatedCounter';
import Spinner from './Spinner';

export default function Overview() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalSales: 0,
    totalEarnings: 0
  });
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: products } = await supabase.from('products').select('stock');
      const { data: sales } = await supabase.from('sales').select('quantity, total_price');
      const { data: allShifts } = await supabase.from('shifts').select('*, users(name, role)').is('closed_at', null);
      
      // Filter out admin shifts (since admins no longer use registers)
      const shifts = allShifts ? allShifts.filter(s => s.users?.role === 'staff') : null;

      if (products && sales) {
        setStats({
          totalProducts: products.length,
          lowStock: products.filter(p => p.stock < 5).length,
          totalSales: sales.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
          totalEarnings: sales.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
        });
      }
      
      if (shifts) {
        const activeShifts = await Promise.all(shifts.map(async (shift) => {
          const { data: shiftSales } = await supabase.from('sales').select('total_price').eq('shift_id', shift.id);
          const currentSales = shiftSales ? shiftSales.reduce((acc, s) => acc + (Number(s.total_price) || 0), 0) : 0;
          return {
            ...shift,
            current_sales: currentSales,
            expected_total: (Number(shift.opening_balance) || 0) + currentSales
          };
        }));
        setOpenShifts(activeShifts);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  if (loading) return <Spinner text="Loading stats..." />;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
    >
      <h2 className="mb-3">Dashboard Overview</h2>
      
      <div className="grid-4 mb-4">
        <motion.div className="glass-card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Package size={24} className="mb-2 text-primary" style={{ margin: '0 auto' }} />
          <p className="text-muted mb-1">Total Products</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0 }}><AnimatedCounter value={stats.totalProducts} /></h2>
        </motion.div>
        
        <motion.div className="glass-card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ border: stats.lowStock > 0 ? '1px solid var(--danger)' : undefined }}>
          <Package size={24} className="mb-2 text-danger" style={{ margin: '0 auto' }} />
          <p className="text-muted mb-1">Low Stock Items</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: stats.lowStock > 0 ? 'var(--danger)' : 'inherit' }}><AnimatedCounter value={stats.lowStock} /></h2>
        </motion.div>

        <motion.div className="glass-card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <ShoppingCart size={24} className="mb-2 text-success" style={{ margin: '0 auto' }} />
          <p className="text-muted mb-1">Total Items Sold</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0 }}><AnimatedCounter value={stats.totalSales} /></h2>
        </motion.div>

        <motion.div className="glass-card text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <TrendingUp size={24} className="mb-2 text-warning" style={{ margin: '0 auto' }} />
          <p className="text-muted mb-1">Total Earnings</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0 }}><AnimatedCounter value={stats.totalEarnings} prefix="Rs. " /></h2>
        </motion.div>
      </div>

      {openShifts.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3">Live Shifts (Right Now)</h3>
          <div className="grid-3">
            {openShifts.map(shift => (
              <motion.div key={shift.id} className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex justify-between items-start mb-2">
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>{shift.users?.name || 'Employee'}</h4>
                  <span style={{ fontSize: '0.75rem', background: 'var(--card-bg)', padding: '2px 8px', borderRadius: '10px' }}>
                    Started: {new Date(shift.opened_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Opening Cash</span>
                  <span style={{ fontWeight: 500 }}>Rs. {shift.opening_balance}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Shift Sales</span>
                  <span style={{ fontWeight: 500, color: 'var(--success)' }}>+ Rs. {shift.current_sales}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', background: 'var(--card-bg)', padding: '0.5rem', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Expected Drawer</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Rs. {shift.expected_total}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
