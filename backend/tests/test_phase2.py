"""
Automated unit and integration test suite for SmartQoS Phase 2.
Tests network monitoring calculations, jitter, packet loss, simulation manager, status determination, and new API endpoints.
"""

from unittest.mock import MagicMock, patch
import pytest

from backend.app import app
from backend.network_monitor import NetworkMonitorInstance, convert_bytes_to_mbps
from backend.simulation import SimulationManager


# ============================================================================
# 1. Network Monitor Unit Tests
# ============================================================================

def test_convert_bytes_to_mbps():
    """Verify bytes to Mbps conversion formula."""
    # 1,250,000 bytes over 1 second = 10,000,000 bits = 10.0 Mbps
    mbps = convert_bytes_to_mbps(1_250_000, 1.0)
    assert mbps == 10.0

    # Zero bytes or zero time delta
    assert convert_bytes_to_mbps(0, 1.0) == 0.0
    assert convert_bytes_to_mbps(1000, 0.0) == 0.0
    assert convert_bytes_to_mbps(-500, 1.0) == 0.0


def test_jitter_calculation_bounded_history():
    """Verify bounded latency history and jitter calculation."""
    monitor = NetworkMonitorInstance(history_maxlen=5)

    # Fewer than 2 samples: jitter should be None
    assert monitor.calculate_jitter() is None
    monitor.latency_history.append(20.0)
    assert monitor.calculate_jitter() is None

    # 2 samples: |30 - 20| = 10.0 ms
    monitor.latency_history.append(30.0)
    assert monitor.calculate_jitter() == 10.0

    # 3 samples: 20, 30, 25. diffs: |30-20|=10, |25-30|=5. avg = (10+5)/2 = 7.5 ms
    monitor.latency_history.append(25.0)
    assert monitor.calculate_jitter() == 7.5

    # Verify history maxlen (5)
    for lat in [40.0, 50.0, 60.0]:
        monitor.latency_history.append(lat)
    assert len(monitor.latency_history) == 5


@patch("subprocess.run")
def test_ping_host_success(mock_run):
    """Test ping measurement success with mocked subprocess output."""
    mock_proc = MagicMock()
    mock_proc.returncode = 0
    mock_proc.stdout = "Reply from 8.8.8.8: bytes=32 time=15.5ms TTL=117\nReply from 8.8.8.8: bytes=32 time=20.5ms TTL=117\nLost = 0 (0% loss)"
    mock_run.return_value = mock_proc

    monitor = NetworkMonitorInstance()
    lat, jit, loss, available, reason = monitor.ping_host("8.8.8.8", count=2)

    assert available is True
    assert lat == 18.0  # (15.5 + 20.5) / 2
    assert loss == 0.0
    assert reason is None


@patch("subprocess.run")
def test_ping_host_failure_returns_unavailable(mock_run):
    """Test ping failure returns available=False and null values without crashing."""
    mock_proc = MagicMock()
    mock_proc.returncode = 1
    mock_proc.stdout = "Request timed out.\nLost = 4 (100% loss)"
    mock_run.return_value = mock_proc

    monitor = NetworkMonitorInstance()
    lat, jit, loss, available, reason = monitor.ping_host("8.8.8.8", count=4)

    assert available is False
    assert lat is None
    assert loss == 100.0
    assert reason is not None


# ============================================================================
# 2. Simulation Manager & Network Status Unit Tests
# ============================================================================

def test_simulation_manager_modes():
    """Verify normal and congested simulation modes."""
    mgr = SimulationManager(default_mode="normal")

    # Normal mode: demand 70 Mbps <= capacity 100 Mbps
    norm_res = mgr.get_qos_result()
    assert norm_res["simulation_mode"] == "normal"
    assert norm_res["total_demand_mbps"] == 70.0
    assert norm_res["congestion"] is False
    assert norm_res["utilization_percent"] == 70.0

    # Switch to congested mode: demand 120 Mbps > capacity 100 Mbps
    cong_res = mgr.set_mode("congested")
    assert cong_res["simulation_mode"] == "congested"
    assert cong_res["total_demand_mbps"] == 120.0
    assert cong_res["congestion"] is True
    assert cong_res["utilization_percent"] == 100.0


def test_simulation_manager_invalid_mode():
    """Verify invalid mode rejection."""
    mgr = SimulationManager()
    with pytest.raises(ValueError, match="Invalid simulation mode"):
        mgr.set_mode("invalid_mode")


def test_network_status_classification():
    """Verify network status rules: CONGESTED, DEGRADED, UNAVAILABLE, NORMAL."""
    mgr = SimulationManager(default_mode="normal")

    # 1. NORMAL state
    live_normal = {"available": True, "latency_ms": 20.0, "jitter_ms": 5.0, "packet_loss_percent": 0.0}
    status_norm = mgr.get_network_status(live_normal)
    assert status_norm["network_status"] == "NORMAL"

    # 2. CONGESTED state (demand exceeds capacity)
    mgr.set_mode("congested")
    status_cong = mgr.get_network_status(live_normal)
    assert status_cong["network_status"] == "CONGESTED"
    assert status_cong["congestion"] is True

    # Reset to normal mode for DEGRADED test
    mgr.set_mode("normal")

    # 3. DEGRADED state (high latency > 150 ms)
    live_degraded = {"available": True, "latency_ms": 180.0, "jitter_ms": 5.0, "packet_loss_percent": 0.0}
    status_deg = mgr.get_network_status(live_degraded)
    assert status_deg["network_status"] == "DEGRADED"

    # 4. UNAVAILABLE state
    live_unavail = {"available": False, "reason": "Network down"}
    status_unavail = mgr.get_network_status(live_unavail)
    assert status_unavail["network_status"] == "UNAVAILABLE"


# ============================================================================
# 3. API Integration Tests (Phase 2)
# ============================================================================

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_get_network(client):
    """Test GET /api/network endpoint."""
    response = client.get("/api/network")
    assert response.status_code == 200
    data = response.get_json()
    assert "mode" in data
    assert "download_mbps" in data
    assert "upload_mbps" in data
    assert "timestamp" in data


def test_api_get_status(client):
    """Test GET /api/status endpoint."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.get_json()
    assert "network_status" in data
    assert "message" in data
    assert "congestion" in data
    assert "capacity_mbps" in data
    assert "total_demand_mbps" in data


def test_api_post_qos_mode(client):
    """Test POST /api/qos/mode endpoint."""
    # Switch to normal mode
    res_norm = client.post("/api/qos/mode", json={"mode": "normal"})
    assert res_norm.status_code == 200
    data_norm = res_norm.get_json()
    assert data_norm["simulation_mode"] == "normal"
    assert data_norm["congestion"] is False
    assert data_norm["total_demand_mbps"] == 70.0

    # Switch to congested mode
    res_cong = client.post("/api/qos/mode", json={"mode": "congested"})
    assert res_cong.status_code == 200
    data_cong = res_cong.get_json()
    assert data_cong["simulation_mode"] == "congested"
    assert data_cong["congestion"] is True
    assert data_cong["total_demand_mbps"] == 120.0

    # Test invalid mode
    res_invalid = client.post("/api/qos/mode", json={"mode": "extreme"})
    assert res_invalid.status_code == 400
    data_inv = res_invalid.get_json()
    assert data_inv["error"] == "Validation Error"
