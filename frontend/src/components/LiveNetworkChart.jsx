import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const LiveNetworkChart = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="table-container" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Collecting real-time network telemetry...
      </div>
    );
  }

  return (
    <div className="table-container" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="table-title">Real-Time Network Performance Telemetry</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Polling GET /api/network every 2s (Last 30 measurements)
          </p>
        </div>
        <span className="badge badge-live">LIVE MONITORING</span>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#94a3b8" unit=" Mbps" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" unit=" ms" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                color: '#f8fafc',
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="download" stroke="#3b82f6" strokeWidth={2} name="Download (Mbps)" dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="upload" stroke="#10b981" strokeWidth={2} name="Upload (Mbps)" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#fbbf24" strokeWidth={2} name="Latency (ms)" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LiveNetworkChart;
