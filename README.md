# SmartQoS: Adaptive Bandwidth Allocation and QoS System for Shared Networks

## Problem Statement
In shared networks with fixed total bandwidth, concurrent network activities (such as video conferencing, online gaming, web browsing, and large downloads) compete for limited network capacity. Without Quality of Service (QoS) management, critical real-time communications suffer from packet loss, latency, and jitter caused by bulk background data downloads consuming an unproportional share of network capacity.

## Objectives
SmartQoS provides an intelligent, adaptive bandwidth allocation engine and network monitoring framework that dynamically manages bandwidth distribution during network congestion. It prioritizes critical real-time traffic (e.g., video calls and gaming) while ensuring lower-priority bulk transfers (e.g., file downloads) are fairly allocated leftover capacity without unnecessary starvation.

## Key Features
- **Deterministic Priority-Aware Weighted Fair Share QoS Engine**: Prioritizes `HIGH` > `MEDIUM` > `LOW` priority tiers and distributes constrained bandwidth based on relative weights.
- **Dynamic Scenario Simulation**: Toggle between `NORMAL` (70 Mbps demand) and `CONGESTED` (120 Mbps demand) modes or simulate custom traffic requests.
- **Live Network Telemetry**: Collects real-time system byte rates (Mbps), ICMP round-trip time (RTT latency), bounded jitter, packet loss, and active network interface information using `psutil`.
- **System Health Evaluator**: Automatically classifies network health into `NORMAL`, `CONGESTED`, `DEGRADED`, or `UNAVAILABLE`.
- **Modern Dark Control Dashboard**: Polished React + Vite interface with Recharts visualization, traffic allocation breakdown tables, and real-time polling charts.

---

## System Architecture

```
                  +----------------------------------+
                  |         React Dashboard          |
                  |          (Vite / JSX)            |
                  +----------------+-----------------+
                                   |
                         HTTP REST API Requests
                                   |
                                   v
                  +----------------------------------+
                  |         Flask Backend            |
                  |           (app.py)               |
                  +--------+----------------+--------+
                           |                |
             Live Metrics  |                | Simulation State
                           v                v
            +-------------------+    +--------------------+
            | Network Monitor   |    | Simulation Manager |
            | (network_monitor) |    |   (simulation.py)  |
            | - Byte Rates      |    +---------+----------+
            | - ICMP Latency    |              |
            | - Jitter          |              v
            | - Packet Loss     |    +--------------------+
            | - Interface Info  |    |     QoS Engine     |
            +-------------------+    |   (qos_engine.py)  |
                                     +--------------------+
```

---

## QoS Allocation Algorithm

1. **Calculate Total Demand**:
   $$\text{Total Demand} = \sum_{i} \text{Requested Mbps}_i$$

2. **Detect Congestion**:
   $$\text{Congestion} = (\text{Total Demand} > \text{Capacity})$$

3. **Priority-Aware Weighted Allocation**:
   - **No Congestion** ($\text{Total Demand} \le \text{Capacity}$): Grants 100% of requested demand to all flows.
   - **Congested Network** ($\text{Total Demand} > \text{Capacity}$):
     - Iterates through priority tiers in order: `HIGH` $\rightarrow$ `MEDIUM` $\rightarrow$ `LOW`.
     - For a priority tier $F_{\text{tier}}$:
       - If $\sum_{f \in F_{\text{tier}}} \text{Demand}(f) \le \text{Capacity}_{\text{remaining}}$: Grant 100% demand to tier flows.
       - If $\sum_{f \in F_{\text{tier}}} \text{Demand}(f) > \text{Capacity}_{\text{remaining}}$: Distribute remaining capacity proportionally based on weights:
         $$\text{Share}_i = \text{Capacity}_{\text{remaining}} \times \frac{\text{Weight}_i}{\sum_{j \in \text{active}} \text{Weight}_j}$$
     - Iteratively caps allocations so no flow receives more than requested. Leftover capacity propagates to lower priority tiers.

4. **Flow Status Assignment**:
   - `Fully Allocated`: $\text{Allocated Mbps} = \text{Requested Mbps}$
   - `Partially Allocated`: $0 < \text{Allocated Mbps} < \text{Requested Mbps}$
   - `Throttled`: $\text{Allocated Mbps} = 0$ (when $\text{Requested Mbps} > 0$)

---

## Traffic Classes & Preset Scenarios

| Traffic Class | Priority Tier | Category | Weight | Normal Request (Mbps) | Congested Request (Mbps) |
|---|---|---|---|---|---|
| **Video Call** | HIGH | Real-time | 5 | 20.0 | 35.0 |
| **Online Gaming** | HIGH | Real-time | 4 | 15.0 | 30.0 |
| **Web Browsing** | MEDIUM | Interactive | 2 | 15.0 | 25.0 |
| **File Download** | LOW | Bulk Data | 1 | 20.0 | 30.0 |
| **TOTAL DEMAND** | | | | **70.0 Mbps** | **120.0 Mbps** |

- **Configured Capacity**: 100.0 Mbps

---

## Scenarios & Example Responses

### Example 1: Normal Scenario (70 Mbps Demand $\le$ 100 Mbps Capacity)
- **Status**: `NORMAL` | **Utilization**: 70.0% | **Unused Capacity**: 30.0 Mbps
- **Allocations**:
  - Video Call: 20.0 / 20.0 Mbps (`Fully Allocated`)
  - Online Gaming: 15.0 / 15.0 Mbps (`Fully Allocated`)
  - Web Browsing: 15.0 / 15.0 Mbps (`Fully Allocated`)
  - File Download: 20.0 / 20.0 Mbps (`Fully Allocated`)

### Example 2: Congested Scenario (120 Mbps Demand $>$ 100 Mbps Capacity)
- **Status**: `CONGESTED` | **Utilization**: 100.0% | **Excess Demand**: 20.0 Mbps
- **Allocations**:
  - Video Call: 35.0 / 35.0 Mbps (`Fully Allocated`)
  - Online Gaming: 30.0 / 30.0 Mbps (`Fully Allocated`)
  - Web Browsing: 25.0 / 25.0 Mbps (`Fully Allocated`)
  - File Download: 10.0 / 30.0 Mbps (`Partially Allocated`, Unmet = 20.0 Mbps)

---

## Technology Stack

- **Backend**: Python 3.14, Flask 3.1, Flask-CORS 6.0, psutil 7.2
- **Frontend**: React 18, Vite 8.3, Axios 1.7, Recharts 2.15, Lucide-React 0.475
- **Testing**: Pytest 9.1

---

## REST API Summary

| Endpoint | Method | Payload / Parameters | Description |
|---|---|---|---|
| `/api/health` | `GET` | None | Primary connectivity check (`{"service": "SmartQoS", "status": "ok"}`). |
| `/api/network` | `GET` | None | Returns live network metrics (Mbps, RTT latency, jitter, loss, interface). |
| `/api/status` | `GET` | None | Returns overall network health status (`NORMAL`, `CONGESTED`, `DEGRADED`, `UNAVAILABLE`). |
| `/api/qos` | `GET` | None | Returns calculated QoS bandwidth allocations for active scenario. |
| `/api/qos/mode` | `POST` | `{"mode": "normal"}` or `{"mode": "congested"}` | Switches preset simulation mode. |
| `/api/qos/simulate` | `POST` | `{"capacity_mbps": 100, "traffic": [...]}` | Simulates custom traffic requests. |

---

## How to Run the Application

### 1. Terminal 1 — Start Flask Backend
```bash
cd SmartQoS
.\venv\Scripts\Activate.ps1
python -m backend.app
```
*Backend runs at: `http://127.0.0.1:5000`*

### 2. Terminal 2 — Start React Frontend
```bash
cd SmartQoS/frontend
npm run dev
```
*Frontend runs at: `http://localhost:5173`*

---

## Testing & Production Build

### Run Backend Unit & Integration Tests
```bash
python -m pytest backend/tests/ -v
```
*(All 24 tests pass)*

### Build Production Frontend Bundle
```bash
cd frontend
npm run build
```

---

## Future Scope (Extensions)
*(The following items represent potential future enhancements beyond the current scope)*
- Hardware router OS integration (e.g. OpenWrt / Linux tc / iptables queue management).
- Multi-tenant user authentication and enterprise access policies.
- Historical network metric persistence using a relational database (PostgreSQL / SQLite).
- Deep Packet Inspection (DPI) for automated application traffic classification.
