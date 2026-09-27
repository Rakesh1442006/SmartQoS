"""
SmartQoS Simulation & Status Manager
Coordinates simulation modes ('normal', 'congested', 'custom'), invokes qos_engine.allocate_bandwidth,
and computes overall network health status.
"""

from typing import Any, Dict, List, Optional

from backend.config import (
    DEFAULT_CAPACITY_MBPS,
    JITTER_DEGRADED_MS,
    LATENCY_DEGRADED_MS,
    PACKET_LOSS_DEGRADED_PERCENT,
    SIMULATION_MODES,
)
from backend.qos_engine import allocate_bandwidth


class SimulationManager:
    """
    Manages active simulation scenarios and computes combined network status summaries.
    Delegates all bandwidth allocation logic to qos_engine.allocate_bandwidth.
    """

    def __init__(self, default_mode: str = "congested"):
        self.capacity_mbps: float = DEFAULT_CAPACITY_MBPS
        self.mode: str = default_mode.lower()
        if self.mode not in SIMULATION_MODES:
            self.mode = "congested"
        self.traffic_flows: List[Dict[str, Any]] = [dict(f) for f in SIMULATION_MODES[self.mode]]

    def set_mode(self, mode_name: str) -> Dict[str, Any]:
        """
        Sets simulation mode to 'normal' or 'congested'.
        Raises ValueError if mode is invalid.
        Returns calculated QoS allocation.
        """
        if not isinstance(mode_name, str):
            raise ValueError("Simulation mode must be a string ('normal' or 'congested').")

        clean_mode = mode_name.strip().lower()
        if clean_mode not in SIMULATION_MODES:
            raise ValueError(
                f"Invalid simulation mode '{mode_name}'. Supported modes: {list(SIMULATION_MODES.keys())}."
            )

        self.mode = clean_mode
        self.traffic_flows = [dict(f) for f in SIMULATION_MODES[clean_mode]]
        return self.get_qos_result()

    def set_custom_scenario(
        self, capacity_mbps: Optional[float] = None, traffic_flows: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Updates capacity and/or traffic flows for a custom simulation scenario.
        Returns calculated QoS allocation.
        """
        if capacity_mbps is not None:
            self.capacity_mbps = float(capacity_mbps)
        if traffic_flows is not None:
            self.traffic_flows = [dict(f) for f in traffic_flows]
        self.mode = "custom"

        return self.get_qos_result()

    def get_qos_result(self) -> Dict[str, Any]:
        """
        Invokes qos_engine.allocate_bandwidth and formats response for API compatibility.
        """
        raw_result = allocate_bandwidth(self.capacity_mbps, self.traffic_flows)

        # Build backwards-compatible & forward-compatible response dictionary
        formatted_flows = []
        for flow in raw_result["allocations"]:
            flow_copy = dict(flow)
            flow_copy["unmet_mbps"] = flow_copy.get("unmet_demand_mbps", 0.0)
            formatted_flows.append(flow_copy)

        return {
            "capacity_mbps": raw_result["capacity_mbps"],
            "total_demand_mbps": raw_result["total_demand_mbps"],
            "total_allocated_mbps": raw_result["total_allocated_mbps"],
            "unused_capacity_mbps": raw_result["unused_capacity_mbps"],
            "congestion": raw_result["congestion"],
            "congestion_status": raw_result["congestion_status"],
            "utilization_percent": raw_result["utilization_percentage"],
            "utilization_percentage": raw_result["utilization_percentage"],
            "simulation_mode": self.mode,
            "traffic": formatted_flows,
            "allocations": formatted_flows,
        }

    def get_network_status(self, live_metrics: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Evaluates system health into one of: CONGESTED, DEGRADED, UNAVAILABLE, or NORMAL.
        """
        qos_res = self.get_qos_result()
        is_congested = qos_res["congestion"]

        # Check for DEGRADED metrics if live metrics provided
        is_degraded = False
        degraded_reasons = []

        if live_metrics and live_metrics.get("available"):
            lat = live_metrics.get("latency_ms")
            jit = live_metrics.get("jitter_ms")
            loss = live_metrics.get("packet_loss_percent")

            if lat is not None and lat > LATENCY_DEGRADED_MS:
                is_degraded = True
                degraded_reasons.append(f"High latency ({lat} ms > {LATENCY_DEGRADED_MS} ms)")
            if jit is not None and jit > JITTER_DEGRADED_MS:
                is_degraded = True
                degraded_reasons.append(f"High jitter ({jit} ms > {JITTER_DEGRADED_MS} ms)")
            if loss is not None and loss > PACKET_LOSS_DEGRADED_PERCENT:
                is_degraded = True
                degraded_reasons.append(f"Significant packet loss ({loss}% > {PACKET_LOSS_DEGRADED_PERCENT}%)")

        is_unavailable = live_metrics is not None and not live_metrics.get("available", True)

        # Status Priority: CONGESTED -> DEGRADED -> UNAVAILABLE -> NORMAL
        if is_congested:
            status = "CONGESTED"
            msg = (
                f"Traffic demand ({qos_res['total_demand_mbps']} Mbps) exceeds configured network capacity "
                f"({qos_res['capacity_mbps']} Mbps). Adaptive QoS bandwidth allocation is active."
            )
        elif is_degraded:
            status = "DEGRADED"
            msg = f"Network degradation detected: {', '.join(degraded_reasons)}."
        elif is_unavailable:
            status = "UNAVAILABLE"
            reason = live_metrics.get("reason", "Network monitoring unreachable") if live_metrics else "Monitoring unavailable"
            msg = f"Live network monitoring is currently unavailable: {reason}."
        else:
            status = "NORMAL"
            msg = "Network is operating normally within configured capacity and latency parameters."

        return {
            "network_status": status,
            "status": status,
            "message": msg,
            "congestion": is_congested,
            "capacity_mbps": qos_res["capacity_mbps"],
            "total_demand_mbps": qos_res["total_demand_mbps"],
            "total_allocated_mbps": qos_res["total_allocated_mbps"],
            "utilization_percent": qos_res["utilization_percent"],
            "simulation_mode": self.mode,
        }
