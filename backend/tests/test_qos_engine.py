"""
Automated unit and integration test suite for SmartQoS QoS engine and REST API.
"""

import pytest
from backend.qos_engine import allocate_bandwidth, validate_inputs
from backend.app import app


# ============================================================================
# 1. QoS Engine Unit Tests
# ============================================================================

def test_1_normal_demand_below_capacity():
    """1. Normal demand below capacity: satisfy all requested bandwidths, no congestion."""
    capacity = 100.0
    flows = [
        {"name": "Video Call", "priority": "HIGH", "weight": 5, "requested_mbps": 20},
        {"name": "Gaming", "priority": "HIGH", "weight": 4, "requested_mbps": 15},
        {"name": "Browsing", "priority": "MEDIUM", "weight": 2, "requested_mbps": 15},
        {"name": "Download", "priority": "LOW", "weight": 1, "requested_mbps": 20},
    ]
    res = allocate_bandwidth(capacity, flows)
    assert res["congestion"] is False
    assert res["total_demand_mbps"] == 70.0
    assert res["total_allocated_mbps"] == 70.0
    assert res["unused_capacity_mbps"] == 30.0
    assert res["utilization_percentage"] == 70.0
    for alloc in res["allocations"]:
        assert alloc["allocated_mbps"] == alloc["requested_mbps"]
        assert alloc["unmet_demand_mbps"] == 0.0
        assert alloc["status"] == "Fully Allocated"


def test_2_demand_exactly_equal_to_capacity():
    """2. Demand exactly equal to capacity: satisfy all demand, 100% utilization, no congestion."""
    capacity = 100.0
    flows = [
        {"name": "Video Call", "priority": "HIGH", "weight": 5, "requested_mbps": 50},
        {"name": "Download", "priority": "LOW", "weight": 1, "requested_mbps": 50},
    ]
    res = allocate_bandwidth(capacity, flows)
    assert res["congestion"] is False
    assert res["total_demand_mbps"] == 100.0
    assert res["total_allocated_mbps"] == 100.0
    assert res["unused_capacity_mbps"] == 0.0
    assert res["utilization_percentage"] == 100.0
    assert res["allocations"][0]["status"] == "Fully Allocated"
    assert res["allocations"][1]["status"] == "Fully Allocated"


def test_3_demand_greater_than_capacity():
    """3. Demand greater than capacity: triggers congestion flag and throttling/partial allocation."""
    capacity = 100.0
    flows = [
        {"name": "Video Call", "priority": "HIGH", "weight": 5, "requested_mbps": 35},
        {"name": "Gaming", "priority": "HIGH", "weight": 4, "requested_mbps": 30},
        {"name": "Browsing", "priority": "MEDIUM", "weight": 2, "requested_mbps": 25},
        {"name": "Download", "priority": "LOW", "weight": 1, "requested_mbps": 30},
    ]  # Total demand = 120 > 100
    res = allocate_bandwidth(capacity, flows)
    assert res["congestion"] is True
    assert res["total_demand_mbps"] == 120.0
    assert res["total_allocated_mbps"] == 100.0
    assert res["unused_capacity_mbps"] == 0.0
    assert res["utilization_percentage"] == 100.0


def test_4_high_priority_receives_preference():
    """4. High-priority traffic receives preference over lower-priority traffic."""
    capacity = 50.0
    flows = [
        {"name": "Video Call", "priority": "HIGH", "weight": 5, "requested_mbps": 40},
        {"name": "Download", "priority": "LOW", "weight": 1, "requested_mbps": 40},
    ]
    res = allocate_bandwidth(capacity, flows)
    high_alloc = res["allocations"][0]
    low_alloc = res["allocations"][1]

    # HIGH priority gets 40 Mbps fully satisfied; LOW priority gets remaining 10 Mbps
    assert high_alloc["allocated_mbps"] == 40.0
    assert high_alloc["status"] == "Fully Allocated"
    assert low_alloc["allocated_mbps"] == 10.0
    assert low_alloc["status"] == "Partially Allocated"


def test_5_allocation_never_exceeds_requested_bandwidth():
    """5. Allocation never exceeds requested bandwidth for any flow."""
    capacity = 100.0
    flows = [
        {"name": "Small High Priority", "priority": "HIGH", "weight": 10, "requested_mbps": 5},
        {"name": "Large High Priority", "priority": "HIGH", "weight": 1, "requested_mbps": 80},
    ]
    res = allocate_bandwidth(capacity, flows)
    small_flow = res["allocations"][0]
    large_flow = res["allocations"][1]

    assert small_flow["allocated_mbps"] == 5.0  # Must be capped at request (5), not 100 * 10/11
    assert large_flow["allocated_mbps"] == 80.0


def test_6_total_allocation_never_exceeds_capacity():
    """6. Total allocation never exceeds total available capacity."""
    capacity = 75.0
    flows = [
        {"name": "Flow 1", "priority": "HIGH", "weight": 5, "requested_mbps": 50},
        {"name": "Flow 2", "priority": "HIGH", "weight": 5, "requested_mbps": 50},
        {"name": "Flow 3", "priority": "MEDIUM", "weight": 2, "requested_mbps": 50},
    ]
    res = allocate_bandwidth(capacity, flows)
    assert res["total_allocated_mbps"] <= capacity
    assert res["total_allocated_mbps"] == 75.0


def test_7_zero_or_invalid_input_is_rejected():
    """7. Zero or invalid input is rejected with clear ValueError."""
    # Negative capacity
    with pytest.raises(ValueError, match="strictly greater than 0"):
        allocate_bandwidth(-10.0, [{"name": "A", "priority": "HIGH", "weight": 1, "requested_mbps": 10}])

    # Zero capacity
    with pytest.raises(ValueError, match="strictly greater than 0"):
        allocate_bandwidth(0.0, [{"name": "A", "priority": "HIGH", "weight": 1, "requested_mbps": 10}])

    # Empty traffic list
    with pytest.raises(ValueError, match="cannot be empty"):
        allocate_bandwidth(100.0, [])

    # Invalid priority
    with pytest.raises(ValueError, match="invalid priority"):
        allocate_bandwidth(100.0, [{"name": "A", "priority": "URGENT", "weight": 1, "requested_mbps": 10}])

    # Negative weight
    with pytest.raises(ValueError, match="must be a positive number"):
        allocate_bandwidth(100.0, [{"name": "A", "priority": "HIGH", "weight": -5, "requested_mbps": 10}])

    # Zero weight
    with pytest.raises(ValueError, match="must be a positive number"):
        allocate_bandwidth(100.0, [{"name": "A", "priority": "HIGH", "weight": 0, "requested_mbps": 10}])

    # Negative requested bandwidth
    with pytest.raises(ValueError, match="non-negative number"):
        allocate_bandwidth(100.0, [{"name": "A", "priority": "HIGH", "weight": 1, "requested_mbps": -5}])


def test_8_different_weights_produce_different_allocation_behavior():
    """8. Different weights within same priority tier produce proportional allocation behavior."""
    capacity = 60.0
    flows = [
        {"name": "Heavy Weight", "priority": "HIGH", "weight": 3, "requested_mbps": 50},
        {"name": "Light Weight", "priority": "HIGH", "weight": 1, "requested_mbps": 50},
    ]  # Total demand = 100 > 60. Shares: 3/4 (45 Mbps) vs 1/4 (15 Mbps)
    res = allocate_bandwidth(capacity, flows)
    heavy = res["allocations"][0]
    light = res["allocations"][1]

    assert heavy["allocated_mbps"] == 45.0
    assert light["allocated_mbps"] == 15.0


def test_9_lower_priority_traffic_not_starved_when_capacity_remains():
    """9. Lower-priority traffic is not unnecessarily starved when capacity remains after higher priorities."""
    capacity = 100.0
    flows = [
        {"name": "High Priority", "priority": "HIGH", "weight": 5, "requested_mbps": 30},
        {"name": "Medium Priority", "priority": "MEDIUM", "weight": 2, "requested_mbps": 30},
        {"name": "Low Priority", "priority": "LOW", "weight": 1, "requested_mbps": 30},
    ]  # Total demand = 90 < 100. Capacity remaining after HIGH (70) and MEDIUM (40) is 40 > LOW (30).
    res = allocate_bandwidth(capacity, flows)
    low_alloc = res["allocations"][2]

    assert low_alloc["allocated_mbps"] == 30.0
    assert low_alloc["status"] == "Fully Allocated"


def test_10_changing_capacity_changes_allocation():
    """10. Changing network capacity dynamically changes the allocation result."""
    flows = [
        {"name": "Video Call", "priority": "HIGH", "weight": 5, "requested_mbps": 40},
        {"name": "Browsing", "priority": "MEDIUM", "weight": 2, "requested_mbps": 40},
    ]
    # At capacity 50: HIGH gets 40, MEDIUM gets 10
    res_50 = allocate_bandwidth(50.0, flows)
    assert res_50["allocations"][0]["allocated_mbps"] == 40.0
    assert res_50["allocations"][1]["allocated_mbps"] == 10.0

    # At capacity 80: HIGH gets 40, MEDIUM gets 40
    res_80 = allocate_bandwidth(80.0, flows)
    assert res_80["allocations"][0]["allocated_mbps"] == 40.0
    assert res_80["allocations"][1]["allocated_mbps"] == 40.0


# ============================================================================
# 2. REST API Integration Tests
# ============================================================================

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_health(client):
    """Test GET /api/health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data == {"status": "ok", "service": "SmartQoS"}


def test_api_get_default_qos(client):
    """Test GET /api/qos endpoint."""
    response = client.get("/api/qos")
    assert response.status_code == 200
    data = response.get_json()
    assert "capacity_mbps" in data
    assert data["capacity_mbps"] == 100.0
    assert len(data["allocations"]) == 4
    assert data["congestion"] is True  # Default total demand is 120 Mbps > 100 Mbps capacity


def test_api_post_simulate_success(client):
    """Test POST /api/qos/simulate endpoint with valid payload."""
    payload = {
        "capacity_mbps": 100,
        "traffic": [
            {"name": "Video Call", "priority": "HIGH", "weight": 5, "requested_mbps": 20},
            {"name": "File Download", "priority": "LOW", "weight": 1, "requested_mbps": 30},
        ]
    }
    response = client.post("/api/qos/simulate", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["total_demand_mbps"] == 50.0
    assert data["congestion"] is False


def test_api_post_simulate_invalid_payload(client):
    """Test POST /api/qos/simulate endpoint with malformed payload."""
    # Negative capacity
    payload = {
        "capacity_mbps": -50,
        "traffic": [{"name": "Test", "priority": "HIGH", "weight": 1, "requested_mbps": 10}]
    }
    response = client.post("/api/qos/simulate", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Validation Error"

    # Missing traffic
    response_missing = client.post("/api/qos/simulate", json={"capacity_mbps": 100})
    assert response_missing.status_code == 400
