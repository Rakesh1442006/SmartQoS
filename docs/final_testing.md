# SmartQoS Final System Integration & Validation Report

---

## 1. Test Environment Specifications

| Component | Specification |
|---|---|
| **Operating System** | Windows (x64) |
| **Backend Runtime** | Python 3.14.6 (Flask 3.1.3, Flask-CORS 6.0.5, psutil 7.2.2) |
| **Frontend Framework** | React + Vite 8.3.1 + Axios + Recharts |
| **Test Framework** | Pytest 9.1.1 |
| **Backend Base URL** | `http://127.0.0.1:5000` |
| **Frontend URL** | `http://localhost:5173` |

---

## 2. Automated Backend Test Suite Results

All 24 automated unit and integration tests passed cleanly in `pytest`:

```
============================= test session starts =============================
platform win32 -- Python 3.14.6, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\Rakesh M G\OneDrive\Desktop\SmartQoS
collected 24 items

backend/tests/test_phase2.py::test_convert_bytes_to_mbps PASSED          [  4%]
backend/tests/test_phase2.py::test_jitter_calculation_bounded_history PASSED [  8%]
backend/tests/test_phase2.py::test_ping_host_success PASSED              [ 12%]
backend/tests/test_phase2.py::test_ping_host_failure_returns_unavailable PASSED [ 16%]
backend/tests/test_phase2.py::test_simulation_manager_modes PASSED       [ 20%]
backend/tests/test_phase2.py::test_simulation_manager_invalid_mode PASSED [ 25%]
backend/tests/test_phase2.py::test_network_status_classification PASSED  [ 29%]
backend/tests/test_phase2.py::test_api_get_network PASSED                [ 33%]
backend/tests/test_phase2.py::test_api_get_status PASSED                 [ 37%]
backend/tests/test_phase2.py::test_api_post_qos_mode PASSED              [ 41%]
backend/tests/test_qos_engine.py::test_1_normal_demand_below_capacity PASSED [ 45%]
backend/tests/test_qos_engine.py::test_2_demand_exactly_equal_to_capacity PASSED [ 50%]
backend/tests/test_qos_engine.py::test_3_demand_greater_than_capacity PASSED [ 54%]
backend/tests/test_qos_engine.py::test_4_high_priority_receives_preference PASSED [ 58%]
backend/tests/test_qos_engine.py::test_5_allocation_never_exceeds_requested_bandwidth PASSED [ 62%]
backend/tests/test_qos_engine.py::test_6_total_allocation_never_exceeds_capacity PASSED [ 66%]
backend/tests/test_qos_engine.py::test_7_zero_or_invalid_input_is_rejected PASSED [ 70%]
backend/tests/test_qos_engine.py::test_8_different_weights_produce_different_allocation_behavior PASSED [ 75%]
backend/tests/test_qos_engine.py::test_9_lower_priority_traffic_not_starved_when_capacity_remains PASSED [ 79%]
backend/tests/test_qos_engine.py::test_10_changing_capacity_changes_allocation PASSED [ 83%]
backend/tests/test_qos_engine.py::test_api_health PASSED                 [ 87%]
backend/tests/test_qos_engine.py::test_api_get_default_qos PASSED        [ 91%]
backend/tests/test_qos_engine.py::test_api_post_simulate_success PASSED  [ 95%]
backend/tests/test_qos_engine.py::test_api_post_simulate_invalid_payload PASSED [100%]

============================= 24 passed in 14.34s =============================
```

---

## 3. REST API Endpoint Audit

| Endpoint | HTTP Method | Expected Status | Verified Result |
|---|---|---|---|
| `/api/health` | `GET` | `200 OK` | `{"service": "SmartQoS", "status": "ok"}` |
| `/api/network` | `GET` | `200 OK` | Returns live upload/download Mbps, RTT latency, jitter, packet loss, active interface |
| `/api/status` | `GET` | `200 OK` | Returns system status (`NORMAL`, `CONGESTED`, `DEGRADED`, `UNAVAILABLE`) & explanation |
| `/api/qos` | `GET` | `200 OK` | Returns active scenario QoS bandwidth allocations |
| `/api/qos/mode` | `POST` | `200 OK` | Toggles mode (`{"mode": "normal"}` or `{"mode": "congested"}`) & returns recalculated QoS |
| `/api/qos/simulate` | `POST` | `200 OK` / `400` | Accepts custom traffic array & returns recalculated QoS allocation |

---

## 4. Test Sequence Verification Results

### Test A — Normal Scenario Verification
- **Input**: Preset mode = `"normal"` (`POST /api/qos/mode`)
- **Capacity**: `100.0 Mbps`
- **Total Demand**: `70.0 Mbps`
- **Total Allocated**: `70.0 Mbps`
- **Unused Capacity**: `30.0 Mbps`
- **Utilization Rate**: `70.0%`
- **Congestion Status**: `False` (`NORMAL`)
- **Traffic Allocation Breakdown**:
  - Video Call (`HIGH`, w=5): 20.0 / 20.0 Mbps (`Fully Allocated`)
  - Online Gaming (`HIGH`, w=4): 15.0 / 15.0 Mbps (`Fully Allocated`)
  - Web Browsing (`MEDIUM`, w=2): 15.0 / 15.0 Mbps (`Fully Allocated`)
  - File Download (`LOW`, w=1): 20.0 / 20.0 Mbps (`Fully Allocated`)

### Test B — Congestion Scenario Verification
- **Input**: Preset mode = `"congested"` (`POST /api/qos/mode`)
- **Capacity**: `100.0 Mbps`
- **Total Demand**: `120.0 Mbps`
- **Total Allocated**: `100.0 Mbps`
- **Excess Demand**: `20.0 Mbps`
- **Utilization Rate**: `100.0%`
- **Congestion Status**: `True` (`CONGESTED`)
- **Traffic Allocation Breakdown**:
  - Video Call (`HIGH`, w=5): 35.0 / 35.0 Mbps (`Fully Allocated`)
  - Online Gaming (`HIGH`, w=4): 30.0 / 30.0 Mbps (`Fully Allocated`)
  - Web Browsing (`MEDIUM`, w=2): 25.0 / 25.0 Mbps (`Fully Allocated`)
  - File Download (`LOW`, w=1): 10.0 / 30.0 Mbps (`Partially Allocated`, Unmet = 20.0 Mbps)

### Test C — Custom Traffic Simulation Verification
- **Input**: Video Call = 10, Gaming = 10, Browsing = 10, Download = 10 (`POST /api/qos/simulate`)
- **Capacity**: `100.0 Mbps`
- **Total Demand**: `40.0 Mbps`
- **Total Allocated**: `40.0 Mbps`
- **Congestion Status**: `False` (`NORMAL`)
- **Result**: All 4 flows receive 100% of requested demand.

### Test D — Backend Offline & Automatic Recovery Verification
- **Execution**: Flask backend process stopped while React dashboard is active.
- **Result 1**: Health check poll detects failure after timeout, Header updates badge to `Backend Offline`, and `ErrorState` banner is rendered gracefully.
- **Execution**: Flask backend process restarted.
- **Result 2**: Next health poll succeeds, Header badge automatically restores to `System Online`, and dashboard resumes live data without manual browser refresh.

---

## 5. Network Telemetry Test

- **Byte Rate Conversion**: Verified $\text{Mbps} = (\Delta \text{Bytes} \times 8) / (1,000,000 \times \Delta t)$ using `psutil.net_io_counters()`.
- **Latency (RTT)**: ICMP ping to target `8.8.8.8` returns empirical RTT (e.g. `38.75 ms`).
- **Jitter**: Bounded 10-sample history calculates average absolute RTT difference (e.g. `3.61 ms`).
- **Packet Loss**: Calculated over 4 ping attempts (0.0%).
- **Fallback**: Returns `mode: "UNAVAILABLE"` with error reason if ICMP is blocked or target host is unreachable.

---

## 6. Frontend Production Build Result

`npm run build` executed in `frontend/`:

```
> frontend@0.0.0 build
> vite build

vite v8.3.1 building client environment for production...
✓ 2531 modules transformed.
rendering chunks...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-_Sn6yv3A.css    7.93 kB │ gzip:   2.21 kB
dist/assets/index-DUsLhkoB.js   724.61 kB │ gzip: 214.40 kB
✓ built in 6.25s
```

---

## 7. Conclusion

SmartQoS has successfully passed all unit, integration, simulation, offline recovery, and production build tests. The application is **functionally complete and ready for final project demonstration.**
