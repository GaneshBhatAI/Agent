"""
Bot Utilities Module for AIAnveshana Framework.

Provides helper functions for auto-detecting bot script name, date formatting (DDMMMYYYY),
OS username, and device hostname.
"""

import inspect
import os
import socket
import sys
from datetime import datetime


def get_bot_name() -> str:
    """
    Automatically detects and returns the script file name of the caller without extension.
    Example: running 'Master_Bot.py' returns 'Master_Bot'.
    """
    try:
        # Inspect caller stack to find main executing script
        for frame_info in inspect.stack():
            filename = frame_info.filename
            if filename and not filename.startswith("<") and not "inspect" in filename:
                base_name = os.path.basename(filename)
                stem = os.path.splitext(base_name)[0]
                if stem and stem != "bot_utils":
                    return stem
    except Exception:
        pass

    if sys.argv and sys.argv[0]:
        base_name = os.path.basename(sys.argv[0])
        return os.path.splitext(base_name)[0]

    return "Master_Bot"


def get_date_str(fmt: str = "%d%b%Y") -> str:
    """
    Returns current timestamp formatted as DDMMMYYYY (e.g. 06AUG2026).
    """
    return datetime.now().strftime(fmt).upper()


def get_username() -> str:
    """
    Returns current OS logged-in username.
    """
    try:
        return os.getlogin()
    except Exception:
        return os.environ.get("USERNAME") or os.environ.get("USER") or "AutomationUser"


def get_device_name() -> str:
    """
    Returns system machine hostname.
    """
    return os.environ.get("COMPUTERNAME") or socket.gethostname()
