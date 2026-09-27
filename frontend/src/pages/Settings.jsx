import React, { useState } from 'react';
import { useQoSContext } from '../context/QoSContext';
import { Settings as SettingsIcon, Server, Globe, RefreshCw, Moon, Cpu, Layers } from 'lucide-react';

const Settings = () => {
  const { qosData } = useQoSContext();

  const [capacity, setCapacity] = useState(qosData?.capacity_mbps || 100);
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMsg('Settings updated successfully.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>System & Network Configuration</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Manage network capacity defaults, diagnostic target hosts, and view system specifications.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Configuration Form */}
        <div className="table-container" style={{ padding: '28px' }}>
          <form onSubmit={handleSave}>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                <Server size={18} style={{ color: 'var(--accent-blue)' }} />
                Configured Network Capacity (Mbps)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '1rem',
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Default: 100 Mbps. Controls the network saturation threshold for QoS allocation.
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                <Globe size={18} style={{ color: 'var(--accent-cyan)' }} />
                Target Host for ICMP Latency Ping
              </label>
              <input
                type="text"
                value={pingTarget}
                onChange={(e) => setPingTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '1rem',
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Default: 8.8.8.8 (Google Public DNS). Measures live RTT latency and packet loss.
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                <RefreshCw size={18} style={{ color: '#34d399' }} />
                API Polling Intervals
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Network Telemetry Polling</div>
                  <strong style={{ fontSize: '1rem' }}>2 Seconds</strong>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>QoS & Status Polling</div>
                  <strong style={{ fontSize: '1rem' }}>3 Seconds</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                <Moon size={18} style={{ color: '#c084fc' }} />
                UI Theme
              </label>
              <div style={{ padding: '12px 16px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-pill status-full">Dark Theme Active</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button type="submit" className="btn btn-primary">
                <SettingsIcon size={16} />
                Save Configuration
              </button>
              {savedMsg && <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: '600' }}>{savedMsg}</span>}
            </div>

          </form>
        </div>

        {/* Project Architecture Overview Card */}
        <div className="table-container" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Cpu size={20} style={{ color: 'var(--accent-blue)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>System Architecture Specifications</h3>
          </div>

          <table className="qos-table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Network Capacity</td>
                <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>100.0 Mbps</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Traffic Classes</td>
                <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>4 Preset Flows</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>QoS Strategy</td>
                <td>
                  <span className="priority-badge priority-high">Priority-Aware Weighted Fair Share</span>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Backend Framework</td>
                <td style={{ fontWeight: '600' }}>Python 3 (Flask + Flask-CORS)</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Frontend Framework</td>
                <td style={{ fontWeight: '600' }}>React + Vite + Recharts</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>System Monitoring</td>
                <td style={{ fontWeight: '600' }}>psutil + OS ICMP Ping</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Simulation Modes</td>
                <td style={{ fontWeight: '600' }}>Normal (70 Mbps) / Congested (120 Mbps) / Custom</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Settings;
