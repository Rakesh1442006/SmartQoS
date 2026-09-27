"""
SmartQoS Engine Module
Implements deterministic, priority-aware weighted bandwidth allocation algorithm.
"""

from typing import Any, Dict, List
from backend.config import PRIORITY_ORDER


def validate_inputs(capacity_mbps: float, traffic_flows: List[Dict[str, Any]]) -> None:
    """
    Validates input parameters for bandwidth allocation.
    Raises ValueError with explanatory message if inputs are invalid.
    """
    if not isinstance(capacity_mbps, (int, float)) or isinstance(capacity_mbps, bool):
        raise ValueError("Network capacity must be a numeric value.")

    if capacity_mbps <= 0:
        raise ValueError("Network capacity must be strictly greater than 0 Mbps.")

    if not isinstance(traffic_flows, list):
        raise ValueError("Traffic flows must be provided as a list.")

    if len(traffic_flows) == 0:
        raise ValueError("Traffic flows list cannot be empty.")

    valid_priorities = set(PRIORITY_ORDER)

    for idx, flow in enumerate(traffic_flows):
        if not isinstance(flow, dict):
            raise ValueError(f"Traffic flow at index {idx} must be a dictionary.")

        # Check required fields
        for field in ["name", "priority", "weight", "requested_mbps"]:
            if field not in flow:
                raise ValueError(f"Traffic flow at index {idx} missing required field '{field}'.")

        # Validate name
        if not isinstance(flow["name"], str) or not flow["name"].strip():
            raise ValueError(f"Traffic flow at index {idx} has invalid name.")

        # Validate priority
        priority = str(flow["priority"]).strip().upper()
        if priority not in valid_priorities:
            raise ValueError(
                f"Traffic flow '{flow.get('name')}' has invalid priority '{flow['priority']}'. "
                f"Must be one of {list(valid_priorities)}."
            )

        # Validate weight
        weight = flow["weight"]
        if not isinstance(weight, (int, float)) or isinstance(weight, bool) or weight <= 0:
            raise ValueError(f"Traffic flow '{flow.get('name')}' weight must be a positive number (> 0).")

        # Validate requested_mbps
        requested = flow["requested_mbps"]
        if not isinstance(requested, (int, float)) or isinstance(requested, bool) or requested < 0:
            raise ValueError(
                f"Traffic flow '{flow.get('name')}' requested bandwidth must be a non-negative number (>= 0)."
            )


def allocate_bandwidth(capacity_mbps: float, traffic_flows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes bandwidth allocations for traffic flows based on network capacity,
    flow priorities (HIGH > MEDIUM > LOW), and relative weights.

    Algorithm Overview:
    1. Validates inputs and calculates total bandwidth demand.
    2. Determines network congestion status (total_demand > capacity).
    3. If no congestion: Satisfies 100% of requested demand for all flows.
    4. If congested: Iterates through priority tiers in descending order (HIGH to LOW):
       - If tier demand <= remaining capacity: fully allocates demand to tier flows.
       - If tier demand > remaining capacity: distributes remaining capacity among tier flows
         proportionally based on weights using iterative capping (ensuring no flow exceeds requested bandwidth).
       - Any unused capacity propagates to lower priority tiers.
    5. Calculates final metrics, unmet demand, and allocation status for each flow:
       - 'Fully Allocated': allocation == request
       - 'Partially Allocated': 0 < allocation < request
       - 'Throttled': allocation == 0 (when request > 0)
    """
    # 1. Input Validation
    validate_inputs(capacity_mbps, traffic_flows)

    capacity = float(capacity_mbps)
    total_demand = sum(float(f["requested_mbps"]) for f in traffic_flows)
    congestion = total_demand > capacity

    # Dictionary mapping id(flow_dict) -> allocated_mbps
    allocated_map: Dict[int, float] = {}

    if not congestion:
        # Full allocation for all flows
        for flow in traffic_flows:
            allocated_map[id(flow)] = float(flow["requested_mbps"])
    else:
        # Congestion handling: priority-aware weighted fair allocation
        remaining_capacity = capacity

        for priority in PRIORITY_ORDER:
            tier_flows = [
                f for f in traffic_flows
                if str(f["priority"]).strip().upper() == priority
            ]

            if not tier_flows:
                continue

            if remaining_capacity <= 1e-9:
                for f in tier_flows:
                    allocated_map[id(f)] = 0.0
                continue

            tier_demand = sum(float(f["requested_mbps"]) for f in tier_flows)

            if tier_demand <= remaining_capacity:
                # Fully satisfy all flows in this priority tier
                for f in tier_flows:
                    allocated_map[id(f)] = float(f["requested_mbps"])
                remaining_capacity -= tier_demand
            else:
                # Constrained tier: perform iterative weighted distribution
                active_flows = list(tier_flows)
                tier_remaining_cap = remaining_capacity
                tier_allocations = {id(f): 0.0 for f in tier_flows}

                while tier_remaining_cap > 1e-9 and active_flows:
                    total_weight = sum(float(f["weight"]) for f in active_flows)
                    if total_weight <= 0:
                        break

                    # Check for flows that reach full requested bandwidth under weighted share
                    exceeded = []
                    for f in active_flows:
                        f_req = float(f["requested_mbps"])
                        f_already = tier_allocations[id(f)]
                        f_needed = f_req - f_already
                        tentative_share = tier_remaining_cap * (float(f["weight"]) / total_weight)

                        if tentative_share >= f_needed:
                            exceeded.append((f, f_needed))

                    if not exceeded:
                        # Distribute share to all active flows; none hit their request cap
                        for f in active_flows:
                            share = tier_remaining_cap * (float(f["weight"]) / total_weight)
                            tier_allocations[id(f)] += share
                        tier_remaining_cap = 0.0
                        break
                    else:
                        # Cap the exceeded flows and adjust remaining tier capacity
                        for f, f_needed in exceeded:
                            tier_allocations[id(f)] += f_needed
                            tier_remaining_cap -= f_needed
                            active_flows.remove(f)

                # Store tier allocations into main map and deduct from global remaining capacity
                for f in tier_flows:
                    allocated_map[id(f)] = tier_allocations[id(f)]

                allocated_in_tier = sum(tier_allocations.values())
                remaining_capacity -= allocated_in_tier

    # 5. Format results
    flow_results = []
    for flow in traffic_flows:
        req = float(flow["requested_mbps"])
        alloc_raw = allocated_map.get(id(flow), 0.0)

        # Avoid minor floating point imprecision
        alloc = min(req, round(alloc_raw, 2))
        req_rounded = round(req, 2)
        unmet = round(max(0.0, req_rounded - alloc), 2)

        if req_rounded == 0 or alloc >= req_rounded:
            status = "Fully Allocated"
        elif alloc > 0:
            status = "Partially Allocated"
        else:
            status = "Throttled"

        flow_res = {
            "name": flow["name"],
            "priority": str(flow["priority"]).strip().upper(),
            "weight": flow["weight"],
            "requested_mbps": req_rounded,
            "allocated_mbps": alloc,
            "unmet_demand_mbps": unmet,
            "status": status,
        }
        if "category" in flow:
            flow_res["category"] = flow["category"]
        if "id" in flow:
            flow_res["id"] = flow["id"]

        flow_results.append(flow_res)

    total_allocated = round(sum(f["allocated_mbps"] for f in flow_results), 2)
    total_demand_rounded = round(total_demand, 2)
    cap_rounded = round(capacity, 2)
    utilization = round((total_allocated / cap_rounded) * 100.0, 2) if cap_rounded > 0 else 0.0

    return {
        "capacity_mbps": cap_rounded,
        "total_demand_mbps": total_demand_rounded,
        "total_allocated_mbps": total_allocated,
        "unused_capacity_mbps": round(max(0.0, cap_rounded - total_allocated), 2),
        "congestion": congestion,
        "congestion_status": congestion,
        "utilization_percentage": utilization,
        "allocations": flow_results,
    }
