import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';

export default function Reports() {
  const [salesByProduct, setSalesByProduct] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    
    // Fetch products
    const { data: products } = await supabase.from('products').select('*');
    // Fetch all sales
    const { data: sales } = await supabase.from('sales').select('*');
    
    if (products && sales) {
      // 1. Sales by Product Table
      const prodStats = products.map(p => {
        const prodSales = sales.filter(s => s.product_id === p.id);
        const soldOverall = prodSales.reduce((acc, s) => acc + s.quantity, 0);
        const earningsOverall = prodSales.reduce((acc, s) => acc + Number(s.total_price), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const todaySales = prodSales.filter(s => s.sale_date === today);
        const soldToday = todaySales.reduce((acc, s) => acc + s.quantity, 0);
        const earningsToday = todaySales.reduce((acc, s) => acc + Number(s.total_price), 0);
        
        return {
          id: p.id,
          name: p.name,
          stock: p.stock,
          soldToday,
          soldOverall,
          earningsToday,
          earningsOverall
        };
      });
      setSalesByProduct(prodStats);

      // 2. Monthly Report Chart (Current month daily sales)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      const chartData = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const daySales = sales.filter(s => s.sale_date === dateStr);
        const totalSold = daySales.reduce((acc, s) => acc + s.quantity, 0);
        chartData.push({ day: i, sold: totalSold });
      }
      setMonthlyData(chartData);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
      }}
    >
      <motion.div 
        className="glass-card mb-4"
        variants={{
          hidden: { opacity: 0, x: -20 },
          visible: { opacity: 1, x: 0 }
        }}
      >
        <h3 className="mb-1">Sales by product</h3>
        <p className="text-muted mb-3">Stock and sales broken down per product.</p>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Sold today</th>
                  <th>Sold overall</th>
                  <th>Earnings today</th>
                  <th>Earnings overall</th>
                </tr>
              </thead>
              <tbody>
                {salesByProduct.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.stock}</td>
                    <td>{formatCurrency(p.soldToday)}</td>
                    <td>{formatCurrency(p.soldOverall)}</td>
                    <td>Rs. {formatCurrency(p.earningsToday)}</td>
                    <td>Rs. {formatCurrency(p.earningsOverall)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <motion.div 
        className="glass-card"
        variants={{
          hidden: { opacity: 0, x: 20 },
          visible: { opacity: 1, x: 0 }
        }}
      >
        <h3 className="mb-1">Monthly report</h3>
        <p className="text-muted mb-3">Units sold per day in this month</p>
        
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'var(--text-light)', fontSize: 12}} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'var(--text-light)', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: 'rgba(155, 81, 224, 0.1)'}} 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--card-shadow)' }}
              />
              <Bar 
                dataKey="sold" 
                fill="var(--secondary)" 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
