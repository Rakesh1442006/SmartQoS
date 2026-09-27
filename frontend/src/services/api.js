import axios from 'axios';

// Base URL for SmartQoS Flask Backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

/**
 * Health check API endpoint
 */
export const getHealth = async () => {
  const response = await apiClient.get('/api/health');
  return response.data;
};

/**
 * Live network monitoring metrics endpoint
 */
export const getNetwork = async () => {
  const response = await apiClient.get('/api/network');
  return response.data;
};

/**
 * Combined network health status endpoint
 */
export const getStatus = async () => {
  const response = await apiClient.get('/api/status');
  return response.data;
};

/**
 * Active QoS scenario allocation endpoint
 */
export const getQoS = async () => {
  const response = await apiClient.get('/api/qos');
  return response.data;
};

/**
 * Toggle simulation preset mode ('normal' or 'congested')
 */
export const setQoSMode = async (mode) => {
  const response = await apiClient.post('/api/qos/mode', { mode });
  return response.data;
};

/**
 * Custom traffic scenario simulation endpoint
 */
export const simulateQoS = async (payload) => {
  const response = await apiClient.post('/api/qos/simulate', payload);
  return response.data;
};

export default apiClient;
