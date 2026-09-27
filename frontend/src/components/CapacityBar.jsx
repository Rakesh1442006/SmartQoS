import React from 'react';
import { Cpu, Server } from 'lucide-react';

const CapacityBar = ({ capacity, demand, allocated, congestion }) => {
  const cap = capacity || 100;
  const reqDemand = demand || 0;
  const alloc = allocated || 0;
  const unused = Math.max(0, cap - alloc);
  const excessDemand = Math.max(0, reqDemand - cap);

  const allocatedPercentage = Math.min(100, (alloc / cap) * 100);

  return (
    <div className="capacity-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontWeight: '700', fontSize: '1rem' }}>Network Capacity Utilization</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Configured Limit: <strong style={{ color: 'var(--text-primary)' }}>{cap} Mbps</strong>
        </span>
      </div>

      <div className="progress-bar-bg">
        <div
          className={`progress-bar-fill ${congestion ? 'fill-excess' : 'fill-allocated'}`}
          style={{ width: `${allocatedPercentage}%` }}
        ></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginTop: '12px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL DEMAND</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: congestion ? '#f87171' : 'var(--text-primary)' }}>
            {reqDemand} Mbps
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL ALLOCATED</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#34d399' }}>
            {alloc} Mbps
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {congestion ? 'EXCESS DEMAND' : 'UNUSED CAPACITY'}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: congestion ? '#f87171' : '#38bdf8' }}>
            {congestion ? `${excessDemand} Mbps` : `${unused} Mbps`}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UTILIZATION RATE</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
            {Math.round(allocatedPercentage)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacityBar;
