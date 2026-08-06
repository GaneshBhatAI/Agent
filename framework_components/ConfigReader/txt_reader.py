"""
Text Configuration Reader Module for AIAnveshana Framework.
"""

import os
from typing import Any, Dict


def _parse_value(val: str) -> Any:
    """Helper to convert string values into appropriate Python types (int, float, bool)."""
    if not isinstance(val, str):
        return val
    cleaned = val.strip()
    if cleaned.lower() == "true":
        return True
    if cleaned.lower() == "false":
        return False
    try:
        return int(cleaned)
    except ValueError:
        pass
    try:
        return float(cleaned)
    except ValueError:
        pass
    return cleaned


def read_txt_config(file_path: str, delimiter: str = "|") -> Dict[str, Any]:
    """
    Reads a delimited text configuration file (default '|') into a Python dictionary.
    Ignores blank lines and comment lines starting with # or //.

    Parameters:
        file_path (str): File path to text configuration file.
        delimiter (str): Key-value separator character (default '|').

    Returns:
        Dict[str, Any]: Dictionary containing key-value configuration.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Text configuration file not found at path: '{file_path}'")

    config_dict: Dict[str, Any] = {}
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or stripped.startswith("//"):
                continue

            sep = delimiter
            if sep not in stripped and "=" in stripped:
                sep = "="

            parts = stripped.split(sep, 1)
            if len(parts) == 2:
                key = parts[0].strip()
                val = parts[1].strip()
                config_dict[key] = _parse_value(val)
            else:
                key = parts[0].strip()
                config_dict[key] = True

    return config_dict
