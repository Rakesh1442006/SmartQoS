import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getHealth, getQoS, getNetwork, getStatus, setQoSMode, simulateQoS } from '../services/api';

const QoSContext = createContext(null);

export const QoSProvider = ({ children }) => {
  // Granular state definitions
  const [backendOnline, setBackendOnline] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const [qosData, setQosData] = useState(null);
  const [qosError, setQosError] = useState(null);

  const [networkMetrics, setNetworkMetrics] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  const [networkStatus, setNetworkStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const [liveHistory, setLiveHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // In-flight concurrency protection refs
  const inFlightHealth = useRef(false);
  const inFlightQoS = useRef(false);
  const inFlightNetwork = useRef(false);

  /**
   * 1. Primary Health Check Endpoint (/api/health)
   * Sole authority for setting backendOnline state.
   */
  const checkHealth = useCallback(async () => {
    if (inFlightHealth.current) return;
    inFlightHealth.current = true;

    try {
      await getHealth();
      setBackendOnline(true);
      setHealthError(null);
      if (import.meta.env.DEV) {
        console.log('[SmartQoS] Health: OK');
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[SmartQoS] Health: FAILED', err);
      }
      setBackendOnline(false);
      setHealthError('Unable to connect to SmartQoS backend at http://127.0.0.1:5000.');
    } finally {
      inFlightHealth.current = false;
      setIsLoading(false);
    }
  }, []);

  /**
   * 2. QoS Allocations & Status Polling (/api/qos, /api/status)
   * Never sets backendOnline to false if /api/health is reachable.
   */
  const fetchQoSAndStatus = useCallback(async () => {
    if (inFlightQoS.current) return;
    inFlightQoS.current = true;

    try {
      const qosRes = await getQoS();
      setQosData(qosRes);
      setQosError(null);
      if (import.meta.env.DEV) {
        console.log('[SmartQoS] QoS: OK');
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[SmartQoS] QoS fetch warning:', err);
      }
      setQosError('QoS data fetch failed temporarily.');
      // Preserve previous qosData if available
    }

    try {
      const statusRes = await getStatus();
      setNetworkStatus(statusRes);
      setStatusError(null);
    } catch (err) {
      setStatusError('Status data fetch failed temporarily.');
    } finally {
      inFlightQoS.current = false;
    }
  }, []);

  /**
   * 3. Network Telemetry Polling (/api/network)
   * Never sets backendOnline to false.
   */
  const fetchNetworkMetrics = useCallback(async () => {
    if (inFlightNetwork.current) return;
    inFlightNetwork.current = true;

    try {
      const netRes = await getNetwork();
      setNetworkMetrics(netRes);
      setNetworkError(null);

      if (import.meta.env.DEV) {
        console.log('[SmartQoS] Network: OK');
      }

      // Append sample to bounded history (last 30 samples)
      setLiveHistory((prev) => {
        const timeLabel = new Date(netRes.timestamp || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const newItem = {
          time: timeLabel,
          download: netRes.download_mbps || 0,
          upload: netRes.upload_mbps || 0,
          latency: netRes.latency_ms !== null ? netRes.latency_ms : null,
        };
        const updated = [...prev, newItem];
        return updated.slice(-30);
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[SmartQoS] Network metrics fetch warning:', err);
      }
      setNetworkError('Network telemetry unavailable.');
      setNetworkMetrics((prev) => prev || {
        mode: 'UNAVAILABLE',
        available: false,
        reason: 'Network metrics request timed out or failed',
      });
    } finally {
      inFlightNetwork.current = false;
    }
  }, []);

  /**
   * Manual refresh helper
   */
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([checkHealth(), fetchQoSAndStatus(), fetchNetworkMetrics()]);
    setIsLoading(false);
  }, [checkHealth, fetchQoSAndStatus, fetchNetworkMetrics]);

  /**
   * Toggle simulation preset mode ('normal' or 'congested')
   */
  const changeMode = async (mode) => {
    setIsLoading(true);
    try {
      const result = await setQoSMode(mode);
      setQosData(result);
      await fetchQoSAndStatus();
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to switch simulation mode.';
      setQosError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Custom simulation execution
   */
  const runSimulation = async (payload) => {
    setIsLoading(true);
    try {
      const result = await simulateQoS(payload);
      setQosData(result);
      await fetchQoSAndStatus();
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to execute custom simulation.';
      setQosError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Centralized polling timers
   * Health: ~5000ms
   * Network telemetry: ~2000ms
   * QoS & Status: ~3000ms
   */
  useEffect(() => {
    // Initial fetch
    checkHealth();
    fetchQoSAndStatus();
    fetchNetworkMetrics();

    const healthInterval = setInterval(checkHealth, 5000);
    const qosInterval = setInterval(fetchQoSAndStatus, 3000);
    const networkInterval = setInterval(fetchNetworkMetrics, 2000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(qosInterval);
      clearInterval(networkInterval);
    };
  }, [checkHealth, fetchQoSAndStatus, fetchNetworkMetrics]);

  const value = {
    backendOnline,
    isBackendOnline: backendOnline, // alias for backwards compatibility
    healthError,
    qosData,
    qosError,
    networkMetrics,
    networkError,
    networkStatus,
    statusError,
    liveHistory,
    isLoading,
    error: healthError || qosError || networkError,
    refreshAll,
    changeMode,
    runSimulation,
  };

  return <QoSContext.Provider value={value}>{children}</QoSContext.Provider>;
};

export const useQoSContext = () => {
  const context = useContext(QoSContext);
  if (!context) {
    throw new Error('useQoSContext must be used within a QoSProvider');
  }
  return context;
};
