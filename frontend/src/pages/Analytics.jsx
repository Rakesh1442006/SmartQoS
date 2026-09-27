import React from 'react';
import { useQoSContext } from '../context/QoSContext';
import AllocationChart from '../components/AllocationChart';
import CapacityBar from '../components/CapacityBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const Analytics = () => {
  const { qosData, backendOnline, isBackendOnline, isLoading, healthError, refreshAll } = useQoSContext();

  const isOnline = backendOnline !== undefined ? backendOnline : isBackendOnline;

  if (!isOnline) {
    return <ErrorState message={healthError} onRetry={refreshAll} />;
  }

  if (isLoading && !qosData) {
    return <LoadingState message="Loading QoS Analytics..." />;
  }

  const traffic = qosData?.traffic || [];

  const priorityDataMap = {};
  traffic.forEach((flow) => {
    const p = flow.priority || 'LOW';
    const alloc = flow.allocated_mbps || 0;
    priorityDataMap[p] = (priorityDataMap[p] || 0) + alloc;
  });

  const pieData = [
    { name: 'HIGH Priority', value: priorityDataMap['HIGH'] || 0, color: '#ef4444' },
    { name: 'MEDIUM Priority', value: priorityDataMap['MEDIUM'] || 0, color: '#f59e0b' },
    { name: 'LOW Priority', value: priorityDataMap['LOW'] || 0, color: '#10b981' },
  ].filter((item) => item.value > 0);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>QoS Bandwidth Analytics</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Detailed performance breakdown of current session bandwidth utilization and priority share distribution.
        </p>
      </div>

      <CapacityBar
        capacity={qosData?.capacity_mbps}
        demand={qosData?.total_demand_mbps}
        allocated={qosData?.total_allocated_mbps}
        congestion={qosData?.congestion}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        <div className="table-container" style={{ padding: '24px' }}>
          <h3 className="table-title" style={{ marginBottom: '16px' }}>Allocated Bandwidth by Priority Tier</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} Mbps`, 'Allocated']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 className="table-title" style={{ marginBottom: '16px' }}>Traffic Priority Distribution</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="priority-badge priority-high">HIGH PRIORITY (Real-time)</span>
              <strong style={{ fontFamily: 'monospace', color: '#fca5a5' }}>
                {priorityDataMap['HIGH'] || 0} Mbps Allocated
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="priority-badge priority-medium">MEDIUM PRIORITY (Interactive)</span>
              <strong style={{ fontFamily: 'monospace', color: '#fcd34d' }}>
                {priorityDataMap['MEDIUM'] || 0} Mbps Allocated
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="priority-badge priority-low">LOW PRIORITY (Bulk Data)</span>
              <strong style={{ fontFamily: 'monospace', color: '#6ee7b7' }}>
                {priorityDataMap['LOW'] || 0} Mbps Allocated
              </strong>
            </div>
          </div>
        </div>

      </div>

      <AllocationChart trafficList={traffic} />
    </div>
  );
};

export default Analytics;
