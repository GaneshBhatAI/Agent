import os
import platform
import socket
import sys
from typing import Dict
import psutil


class SystemInfo:
    @staticmethod
    def get_hostname() -> str:
        try:
            return socket.gethostname()
        except Exception:
            return "unknown-host"

    @staticmethod
    def get_ip_address() -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "127.0.0.1"

    @staticmethod
    def get_operating_system() -> str:
        try:
            return f"{platform.system()} {platform.release()} ({platform.machine()})"
        except Exception:
            return "Windows"

    @staticmethod
    def get_python_version() -> str:
        return platform.python_version()

    @staticmethod
    def get_cpu_usage() -> float:
        try:
            return float(psutil.cpu_percent(interval=None))
        except Exception:
            return 0.0

    @staticmethod
    def get_memory_usage() -> float:
        try:
            return float(psutil.virtual_memory().percent)
        except Exception:
            return 0.0

    @staticmethod
    def get_disk_usage(path: str = ".") -> float:
        try:
            target_path = path if os.path.exists(path) else "."
            return float(psutil.disk_usage(target_path).percent)
        except Exception:
            return 0.0

    @classmethod
    def collect_metrics(cls, workspace_path: str = ".") -> Dict[str, any]:
        return {
            "hostname": cls.get_hostname(),
            "ip_address": cls.get_ip_address(),
            "operating_system": cls.get_operating_system(),
            "python_version": cls.get_python_version(),
            "cpu_usage": cls.get_cpu_usage(),
            "memory_usage": cls.get_memory_usage(),
            "disk_usage": cls.get_disk_usage(workspace_path),
        }
