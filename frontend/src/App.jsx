import React, { useState } from 'react';
import { QoSProvider } from './context/QoSContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import TrafficControl from './pages/TrafficControl';
import QoSAllocation from './pages/QoSAllocation';
import NetworkHealth from './pages/NetworkHealth';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'traffic-control':
        return 'Traffic Control & Simulation';
      case 'qos-allocation':
        return 'QoS Bandwidth Allocation';
      case 'network-health':
        return 'Network Health & Telemetry';
      case 'analytics':
        return 'QoS Analytics';
      case 'settings':
        return 'System Settings';
      default:
        return 'Dashboard';
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'traffic-control':
        return <TrafficControl />;
      case 'qos-allocation':
        return <QoSAllocation />;
      case 'network-health':
        return <NetworkHealth />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-wrapper">
        <Header pageTitle={getPageTitle()} />
        <main className="content-body">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QoSProvider>
      <AppContent />
    </QoSProvider>
  );
}

export default App;
