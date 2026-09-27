import React from 'react';
import { useQoSContext } from '../context/QoSContext';
import NetworkMetricCard from '../components/NetworkMetricCard';
import LiveNetworkChart from '../components/LiveNetworkChart';
import StatusBanner from '../components/StatusBanner';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

import { Download, Upload, Clock, Activity, AlertOctagon, Network } from 'lucide-react';

const NetworkHealth = () => {
  const { networkMetrics, networkStatus, liveHistory, backendOnline, isBackendOnline, healthError, networkError, isLoading, refreshAll } = useQoSContext();

  const isOnline = backendOnline !== undefined ? backendOnline : isBackendOnline;

  if (!isOnline) {
    return <ErrorState message={healthError} onRetry={refreshAll} />;
  }

  if (isLoading && !networkMetrics) {
    return <LoadingState message="Collecting live network performance metrics..." />;
  }

  const isLiveAvailable = networkMetrics?.available !== false;
  const reason = networkMetrics?.reason || networkError;

  return (
    <div>
      {networkError && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
          ⚠️ {networkError} Live metrics may be temporarily delayed.
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Live Network Telemetry & Performance</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Real-time operating system socket byte rates and ICMP diagnostic measurements
          </p>
        </div>
        <span className={isLiveAvailable ? 'badge badge-live' : 'badge badge-offline'}>
          {isLiveAvailable ? 'LIVE NETWORK ACTIVE' : 'MONITORING UNAVAILABLE'}
        </span>
      </div>

      <StatusBanner
        status={networkStatus?.network_status || 'NORMAL'}
        congestion={networkStatus?.congestion}
        message={networkStatus?.message}
        demandMbps={networkStatus?.total_demand_mbps}
        capacityMbps={networkStatus?.capacity_mbps}
      />

      <div className="grid-cards">
        <NetworkMetricCard
          title="Download Speed"
          value={networkMetrics?.download_mbps}
          unit="Mbps"
          available={true}
          icon={Download}
          color="var(--accent-blue)"
          subtext="Byte diff over 2s polling window"
        />

        <NetworkMetricCard
          title="Upload Speed"
          value={networkMetrics?.upload_mbps}
          unit="Mbps"
          available={true}
          icon={Upload}
          color="#10b981"
          subtext="Byte diff over 2s polling window"
        />

        <NetworkMetricCard
          title="Round-Trip Latency"
          value={networkMetrics?.latency_ms}
          unit="ms"
          available={isLiveAvailable}
          reason={reason}
          icon={Clock}
          color="#fbbf24"
          subtext="Target: 8.8.8.8 (ICMP Ping)"
        />

        <NetworkMetricCard
          title="Latency Jitter"
          value={networkMetrics?.jitter_ms}
          unit="ms"
          available={isLiveAvailable && networkMetrics?.jitter_ms !== null}
          reason={networkMetrics?.jitter_ms === null ? 'Insufficient RTT samples (<2)' : reason}
          icon={Activity}
          color="#c084fc"
          subtext="Avg diff over 10-sample window"
        />

        <NetworkMetricCard
          title="Packet Loss"
          value={networkMetrics?.packet_loss_percent}
          unit="%"
          available={isLiveAvailable}
          reason={reason}
          icon={AlertOctagon}
          color="#f87171"
          subtext="Failed vs total ping attempts"
        />

        <NetworkMetricCard
          title="Active Interface"
          value={networkMetrics?.active_interface || 'System Default'}
          available={true}
          icon={Network}
          color="var(--accent-cyan)"
          subtext="Primary host interface"
        />
      </div>

      <LiveNetworkChart history={liveHistory} />
    </div>
  );
};

export default NetworkHealth;
