import React from 'react';
import { useQoSContext } from '../context/QoSContext';
import TrafficTable from '../components/TrafficTable';
import AllocationChart from '../components/AllocationChart';
import CapacityBar from '../components/CapacityBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

import { ShieldCheck, AlertCircle, Layers } from 'lucide-react';

const QoSAllocation = () => {
  const { qosData, backendOnline, isBackendOnline, isLoading, healthError, qosError, refreshAll } = useQoSContext();

  const isOnline = backendOnline !== undefined ? backendOnline : isBackendOnline;

  if (!isOnline) {
    return <ErrorState message={healthError} onRetry={refreshAll} />;
  }

  if (isLoading && !qosData) {
    return <LoadingState message="Loading QoS allocation analytics..." />;
  }

  const traffic = qosData?.traffic || [];
  const fullyAllocatedCount = traffic.filter((f) => f.status === 'Fully Allocated').length;
  const partiallyAllocatedCount = traffic.filter((f) => f.status === 'Partially Allocated').length;
  const throttledCount = traffic.filter((f) => f.status === 'Throttled').length;

  return (
    <div>
      {qosError && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
          ⚠️ {qosError} Displaying last known allocation data.
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>QoS Bandwidth Allocation Analytics</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Comprehensive view of priority-aware weighted bandwidth sharing across real-time, interactive, and bulk data traffic classes.
        </p>
      </div>

      <div className="grid-cards">
        <div className="card">
          <div className="card-title">
            <span>Fully Satisfied Flows</span>
            <ShieldCheck size={18} style={{ color: '#34d399' }} />
          </div>
          <div className="card-value" style={{ color: '#34d399' }}>
            {fullyAllocatedCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {traffic.length}</span>
          </div>
          <div className="card-subtext">Received 100% of requested bandwidth</div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Partially Throttled Flows</span>
            <AlertCircle size={18} style={{ color: '#fbbf24' }} />
          </div>
          <div className="card-value" style={{ color: '#fbbf24' }}>
            {partiallyAllocatedCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {traffic.length}</span>
          </div>
          <div className="card-subtext">Received weighted share during congestion</div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Fully Throttled Flows</span>
            <Layers size={18} style={{ color: '#f87171' }} />
          </div>
          <div className="card-value" style={{ color: '#f87171' }}>
            {throttledCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {traffic.length}</span>
          </div>
          <div className="card-subtext">0 Mbps allocated due to capacity exhaustion</div>
        </div>
      </div>

      <CapacityBar
        capacity={qosData?.capacity_mbps}
        demand={qosData?.total_demand_mbps}
        allocated={qosData?.total_allocated_mbps}
        congestion={qosData?.congestion}
      />

      <AllocationChart trafficList={traffic} />
      <TrafficTable trafficList={traffic} />
    </div>
  );
};

export default QoSAllocation;
