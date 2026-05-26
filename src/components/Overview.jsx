import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, ShoppingCart, TrendingUp, Filter } from 'lucide-react';
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
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*').order('name');
    if (data) setBranches(data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch total products count
      const { data: products } = await supabase.from('products').select('id');
      
      // 2. Fetch inventory to calculate low stock items
      const { data: branchInv } = await supabase.from('branch_inventory').select('*');

      let lowStockCount = 0;
      if (selectedBranch === 'All') {
        // Count products that have stock < 5 in at least one branch
        const lowStockProductIds = new Set(
          branchInv?.filter(item => item.stock < 5).map(item => item.product_id) || []
        );
        lowStockCount = lowStockProductIds.size;
      } else {
        // Count products with stock < 5 in the selected branch
        lowStockCount = branchInv?.filter(
          item => item.branch_id === selectedBranch && item.stock < 5
        ).length || 0;
      }

      // 3. Fetch sales with optional branch filter
      let salesQuery = supabase.from('sales').select('quantity, total_price');
      if (selectedBranch !== 'All') {
        salesQuery = salesQuery.eq('branch_id', selectedBranch);
      }
      const { data: sales } = await salesQuery;

      // 4. Fetch live shifts with optional branch filter
      let shiftsQuery = supabase.from('shifts').select('*, users(name, role)').is('closed_at', null);
      if (selectedBranch !== 'All') {
        shiftsQuery = shiftsQuery.eq('branch_id', selectedBranch);
      }
      const { data: allShifts } = await shiftsQuery;

      // Filter out admin shifts
      const shifts = allShifts ? allShifts.filter(s => s.users?.role === 'staff') : [];

      // Calculate stats
      if (products && sales) {
        setStats({
          totalProducts: products.length,
          lowStock: lowStockCount,
          totalSales: sales.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
          totalEarnings: sales.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
        });
      }

      // Calculate live shift balances
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
      } else {
        setOpenShifts([]);
      }
    } catch (err) {
      console.error("Error fetching overview data:", err);
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
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2>Dashboard Overview</h2>
        
        {/* Branch Filter dropdown */}
        <div className="flex items-center gap-2" style={{ background: 'var(--card-bg)', padding: '0.4rem 1rem', borderRadius: '99px', border: '1px solid var(--card-border)' }}>
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
      </div>
      
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
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>{shift.users?.name || 'Employee'}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Branch: {shift.branch_id ? branches.find(b => b.id === shift.branch_id)?.name || 'Unknown' : 'Global'}</span>
                  </div>
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
