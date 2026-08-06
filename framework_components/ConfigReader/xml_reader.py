"""
XML Configuration Reader Module for AIAnveshana Framework.
"""

import os
import xml.etree.ElementTree as ET
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


def read_xml_config(file_path: str) -> Dict[str, Any]:
    """
    Reads an XML configuration file and converts root child tags into a Python dictionary.

    Parameters:
        file_path (str): File path to XML configuration file.

    Returns:
        Dict[str, Any]: Dictionary containing XML key-value configuration.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"XML configuration file not found at path: '{file_path}'")

    tree = ET.parse(file_path)
    root = tree.getroot()
    config_dict: Dict[str, Any] = {}

    # Read root attributes
    for attr_key, attr_val in root.attrib.items():
        config_dict[attr_key] = _parse_value(attr_val)

    # Read child elements
    for child in root:
        tag = child.tag
        if len(child) > 0:
            nested_dict = {}
            for subchild in child:
                nested_dict[subchild.tag] = _parse_value(subchild.text or "")
            config_dict[tag] = nested_dict
        else:
            config_dict[tag] = _parse_value(child.text or "")

    return config_dict
