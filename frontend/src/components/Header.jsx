import React from 'react';
import { useQoSContext } from '../context/QoSContext';
import { Wifi, Cpu } from 'lucide-react';

const Header = ({ pageTitle }) => {
  const { backendOnline, isBackendOnline, networkMetrics, qosData } = useQoSContext();

  const isOnline = backendOnline !== undefined ? backendOnline : isBackendOnline;
  const isLive = networkMetrics && networkMetrics.mode === 'LIVE';
  const modeName = qosData?.simulation_mode ? qosData.simulation_mode.toUpperCase() : 'SIMULATION';

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{pageTitle || 'Dashboard'}</h1>
        <span className="header-subtitle">SmartQoS Adaptive Allocation & Network Management</span>
      </div>

      <div className="header-right">
        {/* Backend Online / Offline Status */}
        {isOnline ? (
          <span className="badge badge-online">
            <span className="pulse-dot"></span>
            System Online
          </span>
        ) : (
          <span className="badge badge-offline">
            Backend Offline
          </span>
        )}

        {/* Live vs Simulation Mode Indicator */}
        {isLive ? (
          <span className="badge badge-live">
            <Wifi size={14} />
            LIVE NETWORK
          </span>
        ) : (
          <span className="badge badge-sim">
            <Cpu size={14} />
            SIMULATION ({modeName})
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
