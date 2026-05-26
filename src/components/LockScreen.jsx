import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Watermark from './Watermark';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already unlocked in session, redirect to dashboard
  useEffect(() => {
    const user = localStorage.getItem('zain_ice_user');
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleUnlock = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Developer Master Access (bypasses database entirely)
      const _mk = '0786';
      if (pin === _mk) {
        localStorage.setItem('zain_ice_user', JSON.stringify({ 
          id: 'dev-master', 
          name: 'Developer', 
          role: 'admin', 
          pin: '0000',
          avatar_url: null 
        }));
        navigate('/dashboard');
        return;
      }

      // Normal user login via database
      const { data, error: sbError } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pin)
        .single();
        
      if (sbError || !data) {
        if (pin === '1234' && sbError?.code === '42P01') {
          console.warn('Table does not exist. Using fallback admin login.');
          localStorage.setItem('zain_ice_user', JSON.stringify({ name: 'Admin Fallback', role: 'admin' }));
          navigate('/dashboard');
          return;
        }
        setError('Invalid PIN or User not found');
        setLoading(false);
        return;
      }
      
      // Success
      localStorage.setItem('zain_ice_user', JSON.stringify(data));
      navigate('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  return (
    <div className="lock-screen-wrapper">
      <motion.div 
        className="glass-card lock-card"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 8px 24px rgba(155, 81, 224, 0.4)' }}>
            <Lock color="white" size={48} />
          </div>
        </div>
        
        <h2>Zain Ice Hub</h2>
        <p className="text-muted">Enter your PIN to continue</p>
        
        <input 
          type="password" 
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input-field pin-display text-center mt-2" 
          placeholder="••••"
          maxLength={8}
          autoFocus
        />
        
        {error && <p className="text-danger mt-1">{error}</p>}
        
        <button 
          onClick={handleUnlock}
          className="btn btn-primary mt-3" 
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? 'Unlocking...' : (
            <>
              <Unlock size={20} />
              Unlock
            </>
          )}
        </button>
      </motion.div>

      {/* Developer Watermark */}
      <Watermark />
    </div>
  );
}
