import React, { useState, useEffect } from 'react';
import { useQoSContext } from '../context/QoSContext';
import StatusBanner from '../components/StatusBanner';
import TrafficTable from '../components/TrafficTable';
import AllocationChart from '../components/AllocationChart';
import ErrorState from '../components/ErrorState';
import { Sliders, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

const TrafficControl = () => {
  const { qosData, changeMode, runSimulation, backendOnline, isBackendOnline, healthError, qosError, refreshAll } = useQoSContext();

  const isOnline = backendOnline !== undefined ? backendOnline : isBackendOnline;

  const [capacity, setCapacity] = useState(100);
  const [videoCallReq, setVideoCallReq] = useState(35);
  const [gamingReq, setGamingReq] = useState(30);
  const [browsingReq, setBrowsingReq] = useState(25);
  const [downloadReq, setDownloadReq] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when qosData updates
  useEffect(() => {
    if (qosData && qosData.traffic) {
      setCapacity(qosData.capacity_mbps || 100);
      qosData.traffic.forEach((flow) => {
        const name = flow.name.toLowerCase();
        if (name.includes('video')) setVideoCallReq(flow.requested_mbps);
        if (name.includes('gaming')) setGamingReq(flow.requested_mbps);
        if (name.includes('browsing')) setBrowsingReq(flow.requested_mbps);
        if (name.includes('download')) setDownloadReq(flow.requested_mbps);
      });
    }
  }, [qosData]);

  if (!isOnline) {
    return <ErrorState message={healthError} onRetry={refreshAll} />;
  }

  const handleModeSwitch = async (mode) => {
    setIsSubmitting(true);
    try {
      await changeMode(mode);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSimulate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      capacity_mbps: Number(capacity),
      traffic: [
        { name: 'Video Call', priority: 'HIGH', category: 'Real-time', weight: 5, requested_mbps: Number(videoCallReq) },
        { name: 'Online Gaming', priority: 'HIGH', category: 'Real-time', weight: 4, requested_mbps: Number(gamingReq) },
        { name: 'Web Browsing', priority: 'MEDIUM', category: 'Interactive', weight: 2, requested_mbps: Number(browsingReq) },
        { name: 'File Download', priority: 'LOW', category: 'Bulk Data', weight: 1, requested_mbps: Number(downloadReq) },
      ],
    };

    try {
      await runSimulation(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCustomDemand = Number(videoCallReq) + Number(gamingReq) + Number(browsingReq) + Number(downloadReq);

  return (
    <div>
      {qosError && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
          ⚠️ {qosError}
        </div>
      )}

      {/* Page Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Adaptive Traffic Simulation & Control</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Toggle preset scenarios or adjust custom bandwidth requests to observe real-time priority-aware QoS allocation.
        </p>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="table-container" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>Preset Network Scenarios</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Triggers <code>POST /api/qos/mode</code> to load pre-configured network traffic states into the backend.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${qosData?.simulation_mode === 'normal' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleModeSwitch('normal')}
            disabled={isSubmitting}
          >
            <Zap size={16} />
            NORMAL NETWORK (70 Mbps Demand)
          </button>

          <button
            className={`btn ${qosData?.simulation_mode === 'congested' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => handleModeSwitch('congested')}
            disabled={isSubmitting}
          >
            <AlertTriangle size={16} />
            SIMULATE CONGESTION (120 Mbps Demand)
          </button>
        </div>
      </div>

      {/* Custom Traffic Sliders Form */}
      <div className="table-container" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Custom Traffic Demand Controls</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Adjust individual flow bandwidth requirements and simulate backend allocation
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Simulated Demand: </span>
            <strong style={{ fontSize: '1.1rem', color: totalCustomDemand > capacity ? '#f87171' : '#34d399' }}>
              {totalCustomDemand} Mbps
            </strong>
          </div>
        </div>

        <form onSubmit={handleCustomSimulate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            <div className="slider-group">
              <div className="slider-label">
                <span>Video Call (HIGH, w=5)</span>
                <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{videoCallReq} Mbps</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={videoCallReq}
                onChange={(e) => setVideoCallReq(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>Online Gaming (HIGH, w=4)</span>
                <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{gamingReq} Mbps</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={gamingReq}
                onChange={(e) => setGamingReq(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>Web Browsing (MEDIUM, w=2)</span>
                <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{browsingReq} Mbps</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={browsingReq}
                onChange={(e) => setBrowsingReq(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>File Download (LOW, w=1)</span>
                <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{downloadReq} Mbps</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={downloadReq}
                onChange={(e) => setDownloadReq(Number(e.target.value))}
                className="slider-input"
              />
            </div>

          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="pulse-dot" size={16} /> : <Sliders size={16} />}
              Calculate QoS Allocation
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Triggers <code>POST /api/qos/simulate</code>
            </span>
          </div>
        </form>
      </div>

      <StatusBanner
        status={qosData?.congestion ? 'CONGESTED' : 'NORMAL'}
        congestion={qosData?.congestion}
        demandMbps={qosData?.total_demand_mbps}
        capacityMbps={qosData?.capacity_mbps}
      />

      <AllocationChart trafficList={qosData?.traffic} />
      <TrafficTable trafficList={qosData?.traffic} />
    </div>
  );
};

export default TrafficControl;
