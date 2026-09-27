import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#f8fafc',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        }}
      >
        <p style={{ fontWeight: '700', marginBottom: '6px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.85rem', margin: '2px 0' }}>
            {entry.name}: <strong>{entry.value} Mbps</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AllocationChart = ({ trafficList }) => {
  if (!trafficList || trafficList.length === 0) return null;

  const chartData = trafficList.map((item) => ({
    name: item.name,
    Requested: item.requested_mbps ?? 0,
    Allocated: item.allocated_mbps ?? 0,
  }));

  return (
    <div className="table-container" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 className="table-title">Adaptive Bandwidth Allocation (Requested vs Allocated)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Visualizing how the QoS engine throttles lower priority demand during congestion
        </p>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" unit=" Mbps" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="Requested" fill="#6366f1" radius={[6, 6, 0, 0]} name="Requested (Mbps)" />
            <Bar dataKey="Allocated" fill="#10b981" radius={[6, 6, 0, 0]} name="Allocated (Mbps)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AllocationChart;
