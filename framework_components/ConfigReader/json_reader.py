"""
JSON Configuration Reader Module for AIAnveshana Framework.
"""

import json
import os
from typing import Any, Dict


def read_json_config(file_path: str) -> Dict[str, Any]:
    """
    Reads a JSON configuration file and returns a Python dictionary.

    Parameters:
        file_path (str): File path to JSON configuration file.

    Returns:
        Dict[str, Any]: Dictionary containing JSON configuration.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"JSON configuration file not found at path: '{file_path}'")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError(f"JSON configuration in '{file_path}' must be a dictionary object.")

    return data
