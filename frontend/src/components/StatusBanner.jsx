import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const StatusBanner = ({ status, congestion, message, demandMbps, capacityMbps }) => {
  const isCongested = congestion || status === 'CONGESTED';
  const isDegraded = status === 'DEGRADED';
  const isUnavailable = status === 'UNAVAILABLE';

  let bannerClass = 'normal';
  let Icon = CheckCircle2;
  let title = '🟢 NETWORK OPERATING NORMALLY';
  let desc = 'All requested traffic can currently be served within available capacity.';

  if (isCongested) {
    bannerClass = 'congested';
    Icon = AlertOctagon;
    title = '🔴 CONGESTION DETECTED';
    desc = `Traffic demand (${demandMbps || 120} Mbps) exceeds available capacity (${capacityMbps || 100} Mbps). Adaptive QoS prioritizes higher-priority traffic when demand exceeds capacity.`;
  } else if (isDegraded) {
    bannerClass = 'degraded';
    Icon = AlertTriangle;
    title = '🟡 NETWORK PERFORMANCE DEGRADED';
    desc = message || 'Live network performance parameters (latency/jitter/loss) exceed optimal thresholds.';
  } else if (isUnavailable) {
    bannerClass = 'degraded';
    Icon = Info;
    title = '⚪ MONITORING METRICS UNAVAILABLE';
    desc = message || 'Live monitoring metrics are currently unavailable. QoS simulation engine is running.';
  } else if (message) {
    desc = message;
  }

  return (
    <div className={`status-banner ${bannerClass}`}>
      <Icon size={28} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <div className="banner-title">{title}</div>
        <div className="banner-desc">{desc}</div>
      </div>
    </div>
  );
};

export default StatusBanner;
