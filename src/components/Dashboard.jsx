import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, ShoppingCart, BarChart3, Settings, UserCircle, PieChart, Users, LockKeyhole, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Overview from './Overview';
import Products from './Products';
import Sales from './Sales';
import Reports from './Reports';
import Profile from './Profile';
import Employees from './Employees';
import Register from './Register';
import Watermark from './Watermark';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [checkingShift, setCheckingShift] = useState(true);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [shiftSalesTotal, setShiftSalesTotal] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const checkSession = async () => {
      const sessionUser = localStorage.getItem('zain_ice_user');
      if (!sessionUser) {
        navigate('/');
      } else {
        const parsed = JSON.parse(sessionUser);
        setUser(parsed);
        // Force staff to products tab if they try to access admin tabs
        if (parsed.role === 'staff' && !['products', 'profile'].includes(activeTab)) {
          setActiveTab('products');
        }
        await checkActiveShift(parsed.id, parsed.role);
      }
    };
    
    checkSession();
    
    // Listen for profile updates
    window.addEventListener('profileUpdated', checkSession);
    return () => window.removeEventListener('profileUpdated', checkSession);
  }, [navigate]);

  const checkActiveShift = async (userId, userRole) => {
    // Admins do not need a shift to operate the system
    if (userRole === 'admin') {
      setCheckingShift(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .is('closed_at', null)
        .gte('opened_at', today)
        .single();
        
      if (data) setActiveShift(data);
    } catch (err) {
      console.error('Error checking shift:', err);
    }
    setCheckingShift(false);
  };

  const handleOpenCloseRegister = async () => {
    // Fetch total sales for this shift
    const { data } = await supabase
      .from('sales')
      .select('total_price')
      .eq('shift_id', activeShift.id);
      
    const total = data ? data.reduce((acc, s) => acc + Number(s.total_price), 0) : 0;
    setShiftSalesTotal(total);
    setShowCloseRegister(true);
  };

  const submitCloseRegister = async (e) => {
    e.preventDefault();
    const actualCash = parseFloat(closingCash);
    if (isNaN(actualCash) || actualCash < 0) return alert('Invalid amount');
    
    const expectedCash = activeShift.opening_balance + shiftSalesTotal;
    
    await supabase.from('shifts').update({
      closing_balance: actualCash,
      expected_balance: expectedCash,
      closed_at: new Date().toISOString()
    }).eq('id', activeShift.id);
    
    setActiveShift(null);
    setShowCloseRegister(false);
    setClosingCash('');
  };

  const handleLogout = () => {
    if (activeShift && user?.role === 'staff') {
      if(!window.confirm("You have an open register. Are you sure you want to logout without closing it?")) return;
    }
    localStorage.removeItem('zain_ice_user');
    navigate('/');
  };

  const renderContent = () => {
    if (checkingShift) return <div className="text-center mt-5">Loading...</div>;
    
    // Only enforce Register for staff. Admins can bypass Register.
    if (!activeShift && user?.role === 'staff') {
      return <Register user={user} onShiftOpened={(shift) => setActiveShift(shift)} />;
    }

    if (user?.role === 'staff') {
      switch (activeTab) {
        case 'products': return <Products userRole={user.role} shiftId={activeShift?.id} />;
        case 'profile': return <Profile />;
        default: return <Products userRole={user.role} shiftId={activeShift?.id} />;
      }
    }

    // Admin rendering
    switch (activeTab) {
      case 'overview': return <Overview />;
      case 'products': return <Products userRole={user.role} shiftId={activeShift?.id} />;
      case 'sales': return <Sales />;
      case 'reports': return <Reports />;
      case 'employees': return <Employees />;
      case 'profile': return <Profile />;
      default: return <Overview />;
    }
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="app-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0', marginBottom: 0 }}>
          <div className="app-title">
            <span style={{ fontSize: '2rem' }}>🍦</span>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Zain Ice Hub</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="btn btn-icon-hover" 
              style={{ background: 'transparent', padding: '0.5rem', color: 'var(--text)' }}
              title="Toggle Dark Mode"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <UserCircle size={32} />
            )}
            <span style={{ fontWeight: 600 }}>Hello, {user.name}</span>
            {activeShift && user.role === 'staff' && (
              <button onClick={handleOpenCloseRegister} className="btn" style={{ background: 'var(--warning)', color: 'white' }}>
                <LockKeyhole size={18} /> Close Register
              </button>
            )}
            <button onClick={handleLogout} className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {user.role === 'admin' && (
            <button 
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 size={18} /> Overview
            </button>
          )}
          
          <button 
            className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={18} /> {user.role === 'admin' ? 'Manage Products' : 'POS / Sell'}
          </button>

          {user.role === 'admin' && (
            <>
              <button 
                className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('sales')}
              >
                <ShoppingCart size={18} /> Sales History
              </button>
              <button 
                className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('reports')}
              >
                <PieChart size={18} /> Reports
              </button>
              <button 
                className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('employees')}
              >
                <Users size={18} /> Employees
              </button>
            </>
          )}

          <button 
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('profile')}
          >
            <Settings size={18} /> Profile
          </button>
        </div>

        <div className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (activeShift ? '-open' : '-closed')}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showCloseRegister && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content glass-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3>Close Register</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Review your shift totals and enter the final cash amount in the drawer.</p>
            
            <div className="mb-4" style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '12px' }}>
              <div className="flex justify-between mb-2">
                <span className="text-muted">Opening Balance:</span>
                <span style={{ fontWeight: 600 }}>Rs. {activeShift.opening_balance}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted">Total Sales Today:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>+ Rs. {shiftSalesTotal}</span>
              </div>
              <div className="flex justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                <span style={{ fontWeight: 600 }}>Expected Total in Drawer:</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Rs. {activeShift.opening_balance + shiftSalesTotal}</span>
              </div>
            </div>

            <form onSubmit={submitCloseRegister}>
              <div className="mb-4">
                <label>Actual Cash in Drawer (Rs.)</label>
                <input 
                  type="number" 
                  required min="0" 
                  className="input-field" 
                  value={closingCash} 
                  onChange={e => setClosingCash(e.target.value)} 
                  placeholder="Count your cash..."
                  style={{ fontSize: '1.2rem', textAlign: 'center' }}
                />
                {closingCash && (
                  <p className={`mt-2 text-center text-sm ${parseFloat(closingCash) === (activeShift.opening_balance + shiftSalesTotal) ? 'text-success' : 'text-danger'}`}>
                    Difference: Rs. {parseFloat(closingCash) - (activeShift.opening_balance + shiftSalesTotal)}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-outline" onClick={() => setShowCloseRegister(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ background: 'var(--warning)', color: 'white' }}>End Shift</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Developer Watermark */}
      <Watermark />
      <Toast />
      <ConfirmDialog />
    </div>
  );
}
