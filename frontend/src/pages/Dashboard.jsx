import React from 'react';
import { useQoSContext } from '../context/QoSContext';
import MetricCard from '../components/MetricCard';
import StatusBanner from '../components/StatusBanner';
import CapacityBar from '../components/CapacityBar';
import TrafficTable from '../components/TrafficTable';
import AllocationChart from '../components/AllocationChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

import { Server, Activity, CheckCircle, Zap } from 'lucide-react';

const Dashboard = () => {
  const { qosData, networkStatus, backendOnline, isBackendOnline, isLoading, healthError, qosError, refreshAll } = useQoSContext();

  const isOnline = backendOnline !== undefined ? backendOnline : isBackendOnline;

  if (!isOnline) {
    return <ErrorState message={healthError} onRetry={refreshAll} />;
  }

  if (isLoading && !qosData) {
    return <LoadingState message="Fetching QoS bandwidth allocation data..." />;
  }

  const capacity = qosData?.capacity_mbps || 100;
  const demand = qosData?.total_demand_mbps || 0;
  const allocated = qosData?.total_allocated_mbps || 0;
  const isCongested = qosData?.congestion || false;
  const statusText = isCongested ? 'CONGESTED' : 'NORMAL';

  return (
    <div>
      {/* Non-blocking warning banner if QoS poll temporarily failed */}
      {qosError && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
          ⚠️ {qosError} Displaying last known allocation data.
        </div>
      )}

      {/* 4 Prominent Summary Cards */}
      <div className="grid-cards">
        <MetricCard
          title="Network Capacity"
          value={capacity}
          unit="Mbps"
          subtext="Configured max bandwidth limit"
          icon={Server}
          color="var(--accent-blue)"
        />
        <MetricCard
          title="Current Demand"
          value={demand}
          unit="Mbps"
          subtext={`Sum of ${qosData?.traffic?.length || 4} application requests`}
          icon={Activity}
          color={isCongested ? '#ef4444' : 'var(--accent-cyan)'}
        />
        <MetricCard
          title="Allocated Bandwidth"
          value={allocated}
          unit="Mbps"
          subtext={`${qosData?.utilization_percent || 0}% capacity utilization`}
          icon={Zap}
          color="#34d399"
        />
        <MetricCard
          title="Network Status"
          value={statusText}
          statusType={statusText}
          subtext={isCongested ? 'Adaptive QoS Throttling Active' : 'Optimal Capacity Served'}
          icon={CheckCircle}
        />
      </div>

      {/* Large Status Banner */}
      <StatusBanner
        status={networkStatus?.network_status || statusText}
        congestion={isCongested}
        message={networkStatus?.message}
        demandMbps={demand}
        capacityMbps={capacity}
      />

      {/* Capacity Utilization Progress Bar */}
      <CapacityBar
        capacity={capacity}
        demand={demand}
        allocated={allocated}
        congestion={isCongested}
      />

      {/* Recharts Allocation Visualization */}
      <AllocationChart trafficList={qosData?.traffic} />

      {/* Detailed Traffic Allocation Table */}
      <TrafficTable trafficList={qosData?.traffic} />
    </div>
  );
};

export default Dashboard;
