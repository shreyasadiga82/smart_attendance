"""System stats monitor with Raspberry Pi thermal and throttling awareness."""
import os
import subprocess
import psutil
from typing import Dict, Any, Optional
from app.config import settings


class SystemStatsService:
    @staticmethod
    def is_raspberry_pi() -> bool:
        if settings.PROFILE == "pi3":
            return True
        try:
            with open("/proc/device-tree/model", "r") as f:
                model = f.read().lower()
                return "raspberry pi" in model
        except Exception:
            return False

    @classmethod
    def get_cpu_temperature(cls) -> Optional[float]:
        try:
            # Standard Linux thermal zone (Raspberry Pi OS)
            if os.path.exists("/sys/class/thermal/thermal_zone0/temp"):
                with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
                    return round(float(f.read().strip()) / 1000.0, 1)
        except Exception:
            pass

        try:
            # vcgencmd measure_temp fallback on Raspberry Pi
            output = subprocess.check_output(["vcgencmd", "measure_temp"], text=True)
            # output format: temp=45.2'C
            if "temp=" in output:
                return float(output.split("=")[1].split("'")[0])
        except Exception:
            pass

        return None

    @classmethod
    def get_throttled_status(cls) -> Optional[Dict[str, Any]]:
        """Checks Raspberry Pi under-voltage and thermal throttling state via vcgencmd."""
        try:
            output = subprocess.check_output(["vcgencmd", "get_throttled"], text=True).strip()
            # output format: throttled=0x0
            if "throttled=" in output:
                code_hex = output.split("=")[1]
                code = int(code_hex, 16)
                return {
                    "raw_code": code_hex,
                    "under_voltage_detected": bool(code & 0x1),
                    "arm_freq_capped": bool(code & 0x2),
                    "currently_throttled": bool(code & 0x4),
                    "soft_temp_limit_active": bool(code & 0x8),
                    "under_voltage_occurred": bool(code & 0x10000),
                    "arm_freq_capped_occurred": bool(code & 0x20000),
                    "throttling_occurred": bool(code & 0x40000),
                    "soft_temp_limit_occurred": bool(code & 0x80000),
                }
        except Exception:
            pass
        return None

    @classmethod
    def get_all_stats(cls) -> Dict[str, Any]:
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/") if os.name != "nt" else psutil.disk_usage("C:\\")

        is_pi = cls.is_raspberry_pi()
        cpu_temp = cls.get_cpu_temperature()
        throttled = cls.get_throttled_status() if is_pi else None

        return {
            "is_pi": is_pi,
            "cpu_percent": cpu_percent,
            "ram_percent": mem.percent,
            "ram_used_mb": round(mem.used / (1024 * 1024), 1),
            "ram_total_mb": round(mem.total / (1024 * 1024), 1),
            "disk_percent": disk.percent,
            "cpu_temp": cpu_temp,
            "throttling": throttled,
        }
