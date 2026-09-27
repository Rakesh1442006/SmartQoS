import React from 'react';
import { 
  LayoutDashboard, 
  Sliders, 
  PieChart, 
  Activity, 
  BarChart2, 
  Settings as SettingsIcon,
  ShieldAlert
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'traffic-control', label: 'Traffic Control', icon: Sliders },
    { id: 'qos-allocation', label: 'QoS Allocation', icon: PieChart },
    { id: 'network-health', label: 'Network Health', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <ShieldAlert size={22} />
        </div>
        <div>
          <div className="logo-title">SmartQoS</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adaptive Bandwidth</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
