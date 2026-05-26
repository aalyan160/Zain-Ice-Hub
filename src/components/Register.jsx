import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

export default function Register({ user, onShiftOpened }) {
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(balance);
    
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('shifts')
        .insert([{
          user_id: user.id,
          branch_id: user.branch_id,
          opening_balance: amount
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      onShiftOpened(data);
    } catch (err) {
      console.error('Supabase Insert Error:', err);
      setError(`Database Error: ${err.message || err.details || 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-center items-center"
      style={{ minHeight: '60vh' }}
    >
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <div className="mb-4 flex justify-center">
          <div style={{ padding: '16px', background: 'rgba(30, 144, 255, 0.1)', borderRadius: '50%', color: 'var(--info)' }}>
            <Wallet size={48} />
          </div>
        </div>
        <h2 className="mb-2">Open Register</h2>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
          Welcome, {user?.name}. Please enter the starting cash in your drawer to begin your shift.
        </p>

        <form onSubmit={handleOpenRegister}>
          <div className="mb-4 text-left">
            <label className="text-muted mb-1" style={{ display: 'block', fontSize: '0.85rem' }}>Opening Cash Balance (Rs.)</label>
            <input 
              type="number" 
              required
              min="0"
              className="input-field" 
              style={{ fontSize: '1.2rem', textAlign: 'center' }}
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
            />
          </div>

          {error && <p className="text-danger mb-3" style={{ fontSize: '0.9rem' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Opening...' : 'Start Shift'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
