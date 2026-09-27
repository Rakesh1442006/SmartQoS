import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

const ErrorState = ({ message, onRetry }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 'var(--radius-lg)',
      padding: '32px',
      margin: '24px 0',
      textAlign: 'center',
      color: '#f87171'
    }}>
      <AlertOctagon size={48} style={{ margin: '0 auto 16px auto', display: 'block' }} />
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>Unable to Connect to SmartQoS Backend</h3>
      <p style={{ fontSize: '0.95rem', color: '#cbd5e1', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
        {message || 'Make sure the Flask server is running on port 5000 (python -m backend.app).'}
      </p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          Retry Connection
        </button>
      )}
    </div>
  );
};

export default ErrorState;
