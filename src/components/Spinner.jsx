import React from 'react';
import { motion } from 'framer-motion';

export default function Spinner({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1.2rem' }}>
      <motion.div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid var(--card-border)',
          borderTopColor: 'var(--primary)',
          boxSizing: 'border-box'
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
