import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState = ({ message }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px',
      color: 'var(--text-muted)',
      gap: '16px'
    }}>
      <Loader2 size={36} className="pulse-dot" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
      <div style={{ fontSize: '1rem', fontWeight: '500' }}>{message || 'Connecting to SmartQoS backend...'}</div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingState;
