"""
Process Cleaner Module for AIAnveshana Framework.
"""

import os
import subprocess
from typing import List, Union


def _normalize_app(app_name: str) -> str:
    """Ensures app name is lowercased and ends with .exe on Windows."""
    clean = app_name.strip().lower()
    if os.name == "nt" and not clean.endswith(".exe"):
        return f"{clean}.exe"
    return clean


def application_clean(app_names: Union[str, List[str]], force: bool = False) -> bool:
    """
    Safely closes or kills applications passed as a comma-separated string or list.

    Example usage:
        application_clean("saplogon,excel,edge")

    Parameters:
        app_names (str or list): Comma-separated app names or list of strings.
        force (bool): If True, force kills immediately; if False, attempts soft termination first.

    Returns:
        bool: True when cleanup loop finishes.
    """
    if isinstance(app_names, str):
        app_list = [app.strip() for app in app_names.split(",") if app.strip()]
    else:
        app_list = list(app_names)

    if not app_list:
        return True

    try:
        import psutil

        for app in app_list:
            target_exe = _normalize_app(app)
            target_stem = os.path.splitext(target_exe)[0].lower()

            for proc in psutil.process_iter(attrs=["pid", "name"]):
                try:
                    pname = (proc.info.get("name") or "").lower()
                    pstem = os.path.splitext(pname)[0].lower()

                    if pname == target_exe or pstem == target_stem:
                        if force:
                            proc.kill()
                        else:
                            proc.terminate()
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

        return True

    except ImportError:
        for app in app_list:
            target_exe = _normalize_app(app)
            try:
                if os.name == "nt":
                    flag = "/F" if force else ""
                    cmd = f"taskkill {flag} /IM {target_exe} /T"
                    subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    target_stem = os.path.splitext(target_exe)[0]
                    flag = "-9" if force else "-15"
                    subprocess.run(["pkill", flag, "-f", target_stem], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

        return True
