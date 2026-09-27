import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, ArrowUpRight } from 'lucide-react';

const TrafficTable = ({ trafficList }) => {
  if (!trafficList || trafficList.length === 0) {
    return (
      <div className="table-container" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No traffic flows available.
      </div>
    );
  }

  const getPriorityBadgeClass = (priority) => {
    const p = String(priority).toUpperCase();
    if (p === 'HIGH') return 'priority-badge priority-high';
    if (p === 'MEDIUM') return 'priority-badge priority-medium';
    return 'priority-badge priority-low';
  };

  const getStatusPill = (status, alloc, req) => {
    const s = String(status);
    if (s === 'Fully Allocated' || alloc >= req) {
      return (
        <span className="status-pill status-full">
          <CheckCircle size={14} />
          Fully Allocated
        </span>
      );
    }
    if (s === 'Partially Allocated' || alloc > 0) {
      return (
        <span className="status-pill status-partial">
          <AlertTriangle size={14} />
          Partially Allocated
        </span>
      );
    }
    return (
      <span className="status-pill status-throttled">
        <XCircle size={14} />
        Throttled
      </span>
    );
  };

  return (
    <div className="table-container">
      <div className="table-header-box">
        <div>
          <h3 className="table-title">Active Traffic Allocation Breakdown</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Dynamic QoS bandwidth distribution by priority tier and relative weights
          </p>
        </div>
      </div>

      <table className="qos-table">
        <thead>
          <tr>
            <th>Traffic Flow</th>
            <th>Priority</th>
            <th>Requested</th>
            <th>Allocated</th>
            <th>Unmet Demand</th>
            <th>Weight</th>
            <th>Allocation Status</th>
          </tr>
        </thead>
        <tbody>
          {trafficList.map((flow, index) => {
            const req = flow.requested_mbps ?? 0;
            const alloc = flow.allocated_mbps ?? 0;
            const unmet = flow.unmet_mbps ?? flow.unmet_demand_mbps ?? Math.max(0, req - alloc);

            return (
              <tr key={index}>
                <td style={{ fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowUpRight size={16} style={{ color: 'var(--accent-blue)' }} />
                    <div>
                      <div>{flow.name}</div>
                      {flow.category && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                          {flow.category}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={getPriorityBadgeClass(flow.priority)}>{flow.priority}</span>
                </td>
                <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{req} Mbps</td>
                <td style={{ fontFamily: 'monospace', fontWeight: '600', color: alloc < req ? '#fbbf24' : '#34d399' }}>
                  {alloc} Mbps
                </td>
                <td style={{ fontFamily: 'monospace', color: unmet > 0 ? '#f87171' : 'var(--text-muted)' }}>
                  {unmet} Mbps
                </td>
                <td style={{ fontFamily: 'monospace' }}>w={flow.weight}</td>
                <td>{getStatusPill(flow.status, alloc, req)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TrafficTable;
