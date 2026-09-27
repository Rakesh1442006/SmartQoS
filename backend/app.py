"""
SmartQoS REST API Application (Phase 2)
Flask application serving endpoints for health checks, live network monitoring,
simulation mode toggling, custom QoS simulation, and network status reporting.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS

from backend.config import DEFAULT_CAPACITY_MBPS
from backend.network_monitor import NetworkMonitorInstance
from backend.simulation import SimulationManager

app = Flask(__name__)
CORS(app)

# Global instances for simulation state and network monitoring
simulation_manager = SimulationManager(default_mode="congested")
network_monitor = NetworkMonitorInstance()


@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check endpoint.
    Returns backend service status.
    """
    return jsonify({
        "status": "ok",
        "service": "SmartQoS"
    }), 200


@app.route("/api/network", methods=["GET"])
def get_network_metrics():
    """
    Returns live network monitoring metrics (byte rates, latency, jitter, packet loss).
    Never fabricates fake data; returns null values with explanation if measurement fails.
    """
    try:
        metrics = network_monitor.get_network_metrics()
        return jsonify(metrics), 200
    except Exception as err:
        return jsonify({
            "mode": "UNAVAILABLE",
            "available": False,
            "download_mbps": 0.0,
            "upload_mbps": 0.0,
            "latency_ms": None,
            "jitter_ms": None,
            "packet_loss_percent": None,
            "active_interface": "System Default",
            "reason": f"Network monitoring exception: {str(err)}",
        }), 200


@app.route("/api/status", methods=["GET"])
def get_network_status():
    """
    Returns overall network status (NORMAL, CONGESTED, DEGRADED, UNAVAILABLE)
    and human-readable message.
    """
    try:
        live_metrics = network_monitor.get_network_metrics()
    except Exception:
        live_metrics = {"available": False, "reason": "Failed to collect live network metrics"}

    status = simulation_manager.get_network_status(live_metrics)
    return jsonify(status), 200


@app.route("/api/qos", methods=["GET"])
def get_qos():
    """
    Returns current active QoS scenario bandwidth allocation.
    Maintains full backward compatibility with Phase 1.
    """
    result = simulation_manager.get_qos_result()
    return jsonify(result), 200


@app.route("/api/qos/mode", methods=["POST"])
def set_qos_mode():
    """
    Switches simulation mode to 'normal' or 'congested'.
    Expects JSON body: {"mode": "normal"} or {"mode": "congested"}.
    """
    if not request.is_json:
        return jsonify({
            "error": "Invalid Request Format",
            "message": "Content-Type must be application/json."
        }), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "mode" not in data:
        return jsonify({
            "error": "Missing Required Field",
            "message": "Request payload must contain 'mode' field ('normal' or 'congested')."
        }), 400

    mode = data["mode"]
    try:
        result = simulation_manager.set_mode(mode)
        return jsonify(result), 200
    except ValueError as err:
        return jsonify({
            "error": "Validation Error",
            "message": str(err)
        }), 400
    except Exception as err:
        return jsonify({
            "error": "Internal Server Error",
            "message": str(err)
        }), 500


@app.route("/api/qos/simulate", methods=["POST"])
def simulate_qos():
    """
    Simulates bandwidth allocation for a custom network scenario.
    Expects JSON payload with 'capacity_mbps' and 'traffic' (list of flow definitions).
    """
    if not request.is_json:
        return jsonify({
            "error": "Invalid Request Format",
            "message": "Content-Type must be application/json."
        }), 400

    data = request.get_json(silent=True)
    if data is None or not isinstance(data, dict):
        return jsonify({
            "error": "Invalid JSON",
            "message": "Failed to parse JSON body."
        }), 400

    # Support 'capacity_mbps' (primary) or 'capacity' (alias)
    capacity = data.get("capacity_mbps", data.get("capacity", DEFAULT_CAPACITY_MBPS))

    # Support 'traffic' (primary) or 'traffic_flows' (alias)
    traffic = data.get("traffic", data.get("traffic_flows"))

    if traffic is None:
        return jsonify({
            "error": "Missing Required Field",
            "message": "Request payload must contain 'traffic' array."
        }), 400

    try:
        result = simulation_manager.set_custom_scenario(capacity, traffic)
        return jsonify(result), 200
    except ValueError as err:
        return jsonify({
            "error": "Validation Error",
            "message": str(err)
        }), 400
    except Exception as err:
        return jsonify({
            "error": "Internal Server Error",
            "message": str(err)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Not Found",
        "message": "The requested endpoint does not exist."
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "error": "Method Not Allowed",
        "message": "The HTTP method is not supported for this endpoint."
    }), 405


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
