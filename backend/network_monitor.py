"""
SmartQoS Network Monitor Module
Provides live network metrics collection including byte rates (Mbps), interface info, ICMP latency, jitter, and packet loss.
"""

import collections
import datetime
import re
import subprocess
import sys
import time
from typing import Any, Dict, Optional, Tuple

import psutil

from backend.config import DEFAULT_PING_TARGET, LATENCY_HISTORY_MAX_LEN, PING_COUNT


def convert_bytes_to_mbps(bytes_diff: int, time_delta_sec: float) -> float:
    """
    Converts byte difference over time delta into Megabits per second (Mbps).
    Formula: (bytes * 8) / (1,000,000 * time_delta_sec)
    """
    if time_delta_sec <= 0 or bytes_diff <= 0:
        return 0.0
    bits = bytes_diff * 8.0
    mbps = bits / (1_000_000.0 * time_delta_sec)
    return round(mbps, 2)


class NetworkMonitorInstance:
    """
    Instance class for network monitoring with state persistence.
    Tracks byte counters, active network interface, ICMP latency, bounded jitter, and packet loss.
    """

    def __init__(self, history_maxlen: int = LATENCY_HISTORY_MAX_LEN):
        self.latency_history: collections.deque[float] = collections.deque(maxlen=history_maxlen)
        self.prev_bytes_sent: Optional[int] = None
        self.prev_bytes_recv: Optional[int] = None
        self.prev_time: Optional[float] = None

    def get_active_interface(self) -> str:
        """
        Sensibly identifies the primary active non-loopback network interface.
        Returns interface name or 'System Default' as fallback.
        """
        try:
            stats = psutil.net_if_stats()
            addrs = psutil.net_if_addrs()

            for iface_name, iface_stats in stats.items():
                if not iface_stats.isup:
                    continue
                # Skip loopback interface names
                if "loopback" in iface_name.lower() or iface_name.lower().startswith("lo"):
                    continue

                iface_addrs = addrs.get(iface_name, [])
                for addr in iface_addrs:
                    # Look for IPv4 address (family 2 or AF_INET)
                    if getattr(addr, "family", None) in (2, getattr(psutil, "AF_INET", 2)):
                        if not addr.address.startswith("127."):
                            return iface_name
            return "System Default"
        except Exception:
            return "System Default"

    def update_byte_rates(self) -> Tuple[float, float]:
        """
        Updates byte counters and calculates current upload/download rates in Mbps.
        Returns (download_mbps, upload_mbps).
        """
        try:
            io_counters = psutil.net_io_counters()
            curr_sent = io_counters.bytes_sent
            curr_recv = io_counters.bytes_recv
            curr_time = time.time()

            if self.prev_bytes_sent is None or self.prev_bytes_recv is None or self.prev_time is None:
                self.prev_bytes_sent = curr_sent
                self.prev_bytes_recv = curr_recv
                self.prev_time = curr_time
                return (0.0, 0.0)

            time_delta = curr_time - self.prev_time
            sent_diff = max(0, curr_sent - self.prev_bytes_sent)
            recv_diff = max(0, curr_recv - self.prev_bytes_recv)

            self.prev_bytes_sent = curr_sent
            self.prev_bytes_recv = curr_recv
            self.prev_time = curr_time

            upload_mbps = convert_bytes_to_mbps(sent_diff, time_delta)
            download_mbps = convert_bytes_to_mbps(recv_diff, time_delta)

            return (download_mbps, upload_mbps)
        except Exception:
            return (0.0, 0.0)

    def ping_host(self, host: str = DEFAULT_PING_TARGET, count: int = PING_COUNT) -> Tuple[Optional[float], Optional[float], Optional[float], bool, Optional[str]]:
        """
        Executes ping command to measure latency, packet loss, and compute jitter.
        Returns (latency_ms, jitter_ms, packet_loss_percent, available, reason).
        """
        try:
            if sys.platform.startswith("win"):
                cmd = ["ping", "-n", str(count), "-w", "1000", host]
            else:
                cmd = ["ping", "-c", str(count), "-W", "1", host]

            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=count * 2)

            output = proc.stdout

            if proc.returncode != 0 and not output:
                return (None, None, None, False, f"Ping execution failed with exit code {proc.returncode}")

            # Parse packet loss percentage
            loss_match = re.search(r"(\d+)%\s*(?:packet\s*)?loss", output, re.IGNORECASE)
            if not loss_match:
                # Windows alternative format: Lost = X (Y% loss)
                loss_match = re.search(r"Lost\s*=\s*\d+\s*\((\d+)%\s*loss\)", output, re.IGNORECASE)

            packet_loss = float(loss_match.group(1)) if loss_match else (0.0 if proc.returncode == 0 else 100.0)

            # Parse RTT latency values
            # Matches time=18ms, time=18.4ms, time<1ms
            latencies = []
            for match in re.finditer(r"time[=|<]\s*([\d.]+)\s*ms", output, re.IGNORECASE):
                try:
                    latencies.append(float(match.group(1)))
                except ValueError:
                    pass

            if not latencies:
                # Try parsing average latency line e.g. Average = 15ms or rtt min/avg/max = 10/15/20 ms
                avg_match = re.search(r"Average\s*=\s*([\d.]+)\s*ms", output, re.IGNORECASE)
                if not avg_match:
                    avg_match = re.search(r"min/avg/max[^\n=]*=\s*[\d.]+/([\d.]+)/", output, re.IGNORECASE)
                if avg_match:
                    latencies.append(float(avg_match.group(1)))

            if not latencies:
                return (None, None, packet_loss, False, "Ping output contained no valid latency measurements")

            avg_latency = round(sum(latencies) / len(latencies), 2)
            self.latency_history.append(avg_latency)

            # Calculate jitter from latency history
            jitter = self.calculate_jitter()

            return (avg_latency, jitter, packet_loss, True, None)

        except subprocess.TimeoutExpired:
            return (None, None, 100.0, False, f"Ping request to '{host}' timed out")
        except Exception as err:
            return (None, None, None, False, f"Ping operation error: {str(err)}")

    def calculate_jitter(self) -> Optional[float]:
        """
        Calculates jitter as the average absolute difference between consecutive latency samples.
        Returns None if fewer than 2 samples exist.
        """
        valid_samples = [s for s in self.latency_history if isinstance(s, (int, float))]
        if len(valid_samples) < 2:
            return None

        diffs = [abs(valid_samples[i] - valid_samples[i - 1]) for i in range(1, len(valid_samples))]
        avg_jitter = sum(diffs) / len(diffs)
        return round(avg_jitter, 2)

    def get_network_metrics(self, host: str = DEFAULT_PING_TARGET) -> Dict[str, Any]:
        """
        Collects comprehensive live network metrics.
        Never fabricates fake data; returns null for unavailable measurements.
        """
        download_mbps, upload_mbps = self.update_byte_rates()
        active_iface = self.get_active_interface()
        latency_ms, jitter_ms, packet_loss_percent, available, reason = self.ping_host(host=host)

        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        return {
            "mode": "LIVE" if available else "UNAVAILABLE",
            "available": available,
            "download_mbps": download_mbps,
            "upload_mbps": upload_mbps,
            "latency_ms": latency_ms,
            "jitter_ms": jitter_ms,
            "packet_loss_percent": packet_loss_percent,
            "active_interface": active_iface,
            "timestamp": timestamp,
            "reason": reason,
        }


# Alias for backward compatibility
NetworkMonitor = NetworkMonitorInstance
