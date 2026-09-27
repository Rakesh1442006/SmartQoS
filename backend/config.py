"""
SmartQoS Configuration Module
Defines default network capacity, priority levels, traffic classes, and Phase 2 monitoring settings.
"""

from typing import Any, Dict, List

# Default total network capacity in Mbps
DEFAULT_CAPACITY_MBPS: float = 100.0

# Priority levels in order of precedence (highest to lowest)
PRIORITY_ORDER: List[str] = ["HIGH", "MEDIUM", "LOW"]

# Network Monitoring Configuration
DEFAULT_PING_TARGET: str = "8.8.8.8"
PING_TIMEOUT_SEC: float = 1.0
PING_COUNT: int = 4
LATENCY_HISTORY_MAX_LEN: int = 10

# Network Status Thresholds for DEGRADED classification
LATENCY_DEGRADED_MS: float = 150.0
JITTER_DEGRADED_MS: float = 30.0
PACKET_LOSS_DEGRADED_PERCENT: float = 5.0

# Preset Simulation Scenarios
SIMULATION_MODES: Dict[str, List[Dict[str, Any]]] = {
    "normal": [
        {
            "id": "video_call",
            "name": "Video Call",
            "priority": "HIGH",
            "category": "Real-time",
            "weight": 5,
            "requested_mbps": 20.0,
        },
        {
            "id": "online_gaming",
            "name": "Online Gaming",
            "priority": "HIGH",
            "category": "Real-time",
            "weight": 4,
            "requested_mbps": 15.0,
        },
        {
            "id": "web_browsing",
            "name": "Web Browsing",
            "priority": "MEDIUM",
            "category": "Interactive",
            "weight": 2,
            "requested_mbps": 15.0,
        },
        {
            "id": "file_download",
            "name": "File Download",
            "priority": "LOW",
            "category": "Bulk Data",
            "weight": 1,
            "requested_mbps": 20.0,
        },
    ],
    "congested": [
        {
            "id": "video_call",
            "name": "Video Call",
            "priority": "HIGH",
            "category": "Real-time",
            "weight": 5,
            "requested_mbps": 35.0,
        },
        {
            "id": "online_gaming",
            "name": "Online Gaming",
            "priority": "HIGH",
            "category": "Real-time",
            "weight": 4,
            "requested_mbps": 30.0,
        },
        {
            "id": "web_browsing",
            "name": "Web Browsing",
            "priority": "MEDIUM",
            "category": "Interactive",
            "weight": 2,
            "requested_mbps": 25.0,
        },
        {
            "id": "file_download",
            "name": "File Download",
            "priority": "LOW",
            "category": "Bulk Data",
            "weight": 1,
            "requested_mbps": 30.0,
        },
    ],
}

# Default traffic classes configuration (points to 'congested' scenario for Phase 1 compatibility)
DEFAULT_TRAFFIC_CLASSES: List[Dict[str, Any]] = SIMULATION_MODES["congested"]
