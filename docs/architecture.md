# SmartQoS System Architecture & QoS Model (Phase 1 & Phase 2)

## System Overview
SmartQoS is an adaptive bandwidth allocation and network monitoring system designed for shared networks with constrained capacity. It dynamically manages traffic flows using a deterministic, priority-aware weighted fair sharing algorithm and provides real-time system network metrics.

```
                  +----------------------------------+
                  |         Client / UI              |
                  | GET /api/health                  |
                  | GET /api/network                 |
                  | GET /api/status                  |
                  | GET /api/qos                     |
                  | POST /api/qos/mode               |
                  | POST /api/qos/simulate           |
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

## Quality of Service (QoS) Model

### Network Capacity
- **Configured Capacity**: 100 Mbps (configurable per simulation request).

### Traffic Classes & Priorities
Traffic is categorized into three priority tiers (`HIGH` > `MEDIUM` > `LOW`) with assigned weights:

1. **Video Call** (`HIGH` priority, Real-time, Weight: 5)
2. **Online Gaming** (`HIGH` priority, Real-time, Weight: 4)
3. **Web Browsing** (`MEDIUM` priority, Interactive, Weight: 2)
4. **File Download** (`LOW` priority, Bulk Data, Weight: 1)

---

## Live Monitoring vs. Adaptive Simulation

| Component | Source | Description |
|---|---|---|
| **Live Metrics** | `psutil` + ICMP Ping | Measures actual system byte rates, active interface, latency (RTT), jitter, and packet loss. |
| **Adaptive Simulation** | `qos_engine.py` | Calculates QoS bandwidth allocations for configurable modes (`normal`, `congested`, `custom`). |
| **Network Status** | Combined Evaluator | Categorizes network status as `NORMAL`, `CONGESTED`, `DEGRADED`, or `UNAVAILABLE`. |

---

## Allocation Algorithm

```
                  +--------------------------+
                  |  Calculate Total Demand  |
                  +------------+-------------+
                               |
                   Demand <= Capacity?
                    /             \
                  YES             NO
                  /                 \
    +-----------------------+    +-----------------------+
    | Satisfy 100% Demand   |    | Congestion = True     |
    | Congestion = False    |    | Process by Priority:  |
    +-----------------------+    |  HIGH -> MEDIUM -> LOW|
                                 +-----------+-----------+
                                             |
                                 Tier Demand <= Remaining Cap?
                                  /                     \
                                YES                     NO
                                /                         \
                  +------------------------+  +--------------------------+
                  | Fully Satisfy Tier     |  | Distribute Capacity via  |
                  | Deduct from Remaining  |  | Weighted Allocation      |
                  +------------------------+  | (Iterative Cap Protection|
                                              +--------------------------+
```

### Algorithm Steps:
1. **Demand Evaluation**: Calculate total network demand as $\sum \text{requested\_mbps}$.
2. **Congestion Detection**: Check if $\text{total\_demand} > \text{available\_capacity}$.
3. **Uncongested Allocation**: If no congestion, allocate 100% of requested bandwidth to all traffic flows.
4. **Congested Allocation**:
   - Iterate through priority tiers (`HIGH`, `MEDIUM`, `LOW`).
   - For each tier:
     - If available capacity satisfies total tier demand, grant 100% of requested bandwidth to all tier flows.
     - If available capacity is less than total tier demand, distribute remaining capacity among tier flows proportionally based on flow weights:
       $$\text{Share}_i = \text{RemainingCapacity} \times \frac{\text{Weight}_i}{\sum_{j \in \text{active}} \text{Weight}_j}$$
     - Iteratively cap allocations so no flow exceeds its requested bandwidth. Any unused bandwidth within a tier is reallocated to other flows or lower priority tiers.
5. **Status Assignment**:
   - `Fully Allocated`: Flow received 100% of requested bandwidth.
   - `Partially Allocated`: Flow received > 0 Mbps but < requested bandwidth.
   - `Throttled`: Flow received 0 Mbps (when requested > 0 Mbps).
