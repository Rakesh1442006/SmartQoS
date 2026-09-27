import React from 'react';

const NetworkMetricCard = ({ title, value, unit, available, icon: Icon, color, subtext, reason }) => {
  const isAvailable = available !== false && value !== null && value !== undefined;

  return (
    <div className="card">
      <div className="card-title">
        <span>{title}</span>
        {Icon && <Icon size={18} style={{ color: color || 'var(--text-muted)' }} />}
      </div>

      {isAvailable ? (
        <div className="card-value" style={{ color: 'var(--text-primary)' }}>
          {value} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>{unit}</span>
        </div>
      ) : (
        <div>
          <div className="card-value" style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
            Unavailable
          </div>
          {reason && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>{reason}</div>}
        </div>
      )}

      {subtext && <div className="card-subtext">{subtext}</div>}
    </div>
  );
};

export default NetworkMetricCard;
