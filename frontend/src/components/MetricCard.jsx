import React from 'react';

const MetricCard = ({ title, value, unit, subtext, icon: Icon, color, statusType }) => {
  let valueColor = 'var(--text-primary)';
  if (statusType === 'NORMAL') valueColor = '#34d399';
  if (statusType === 'CONGESTED') valueColor = '#f87171';
  if (statusType === 'DEGRADED') valueColor = '#fbbf24';

  return (
    <div className="card">
      <div className="card-title">
        <span>{title}</span>
        {Icon && <Icon size={18} style={{ color: color || 'var(--text-muted)' }} />}
      </div>
      <div className="card-value" style={{ color: valueColor }}>
        {value} {unit && <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      {subtext && <div className="card-subtext">{subtext}</div>}
    </div>
  );
};

export default MetricCard;
