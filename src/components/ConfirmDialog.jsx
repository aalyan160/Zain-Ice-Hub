import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

let confirmHandler = null;

export function showConfirm(message) {
  return new Promise((resolve) => {
    if (confirmHandler) confirmHandler(message, resolve);
  });
}

export default function ConfirmDialog() {
  const [state, setState] = useState({ visible: false, message: '', resolver: null });

  useState(() => {
    confirmHandler = (message, resolve) => {
      setState({ visible: true, message, resolver: resolve });
    };
  });

  const handleResponse = (result) => {
    if (state.resolver) state.resolver(result);
    setState({ visible: false, message: '', resolver: null });
  };

  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9998
          }}
          onClick={() => handleResponse(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="glass-card"
            style={{ width: '90%', maxWidth: '380px', textAlign: 'center', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '50%', 
              background: 'rgba(245, 101, 101, 0.12)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' 
            }}>
              <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Are you sure?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{state.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => handleResponse(false)}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, background: 'var(--danger)', color: 'white' }} 
                onClick={() => handleResponse(true)}
              >
                Yes, Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
