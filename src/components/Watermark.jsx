import React from 'react';

export default function Watermark() {
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      zIndex: 1000,
      pointerEvents: 'none',
      background: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(10px)',
      padding: '4px 8px',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.5)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
        lineHeight: 1
      }}>
        <span style={{ fontSize: '0.45rem', fontWeight: 700, color: 'var(--text)', opacity: 0.5, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '1px' }}>
          Developed By
        </span>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'linear-gradient(45deg, #1e3c72, #2a5298)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.5px' }}>
          ALITECH
        </span>
      </div>
      
      {/* CSS Logo replacing the image */}
      <div style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)',
          transform: 'rotate(45deg)'
        }} />
        <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.75rem', fontFamily: 'monospace', zIndex: 1, letterSpacing: '-0.5px' }}>
          A<span style={{ color: '#4a90e2' }}>.</span>
        </span>
      </div>
    </div>
  );
}
