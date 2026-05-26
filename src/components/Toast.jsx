import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

let toastHandler = null;

export function showToast(message, type = 'success', duration = 3000) {
  if (toastHandler) toastHandler(message, type, duration);
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastHandler = (message, type, duration) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    };
    return () => { toastHandler = null; };
  }, []);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />
  };

  const colors = {
    success: { bg: 'rgba(72, 187, 120, 0.15)', border: 'var(--success)', color: 'var(--success)' },
    error: { bg: 'rgba(245, 101, 101, 0.15)', border: 'var(--danger)', color: 'var(--danger)' },
    warning: { bg: 'rgba(237, 137, 54, 0.15)', border: 'var(--warning)', color: 'var(--warning)' },
    info: { bg: 'rgba(99, 179, 237, 0.15)', border: 'var(--info)', color: 'var(--info)' }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '380px' }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1.2rem',
              borderRadius: '14px',
              background: colors[toast.type].bg,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${colors[toast.type].border}`,
              color: 'var(--text)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              cursor: 'pointer'
            }}
            onClick={() => removeToast(toast.id)}
          >
            <span style={{ color: colors[toast.type].color, flexShrink: 0 }}>{icons[toast.type]}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1 }}>{toast.message}</span>
            <X size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
