"""
ConfigReader Package for AIAnveshana Framework.

Contains format-specific configuration readers:
- json_reader.py  -> read_json_config
- xml_reader.py   -> read_xml_config
- txt_reader.py   -> read_txt_config
- excel_reader.py -> read_excel_config
"""

import os
from typing import Any, Dict, Optional, Union

from .json_reader import read_json_config
from .xml_reader import read_xml_config
from .txt_reader import read_txt_config
from .excel_reader import read_excel_config


def read_config(
    config_path: str,
    delimiter: str = "|",
    sheet_name: Optional[Union[str, int]] = 0
) -> Dict[str, Any]:
    """
    Main auto-dispatcher function reading configuration files based on extension.
    Supports .json, .xml, .txt, .xlsx, .xls formats.
    """
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found at path: '{config_path}'")

    ext = os.path.splitext(config_path)[1].lower()

    if ext == ".json":
        return read_json_config(config_path)
    elif ext == ".xml":
        return read_xml_config(config_path)
    elif ext in [".txt", ".cfg", ".ini", ".csv", ".log"]:
        return read_txt_config(config_path, delimiter=delimiter)
    elif ext in [".xlsx", ".xls"]:
        return read_excel_config(config_path, sheet_name=sheet_name)
    else:
        raise ValueError(
            f"Unsupported configuration file extension: '{ext}'. "
            "Supported formats: .json, .xml, .txt, .xlsx, .xls"
        )


__all__ = [
    "read_config",
    "read_json_config",
    "read_xml_config",
    "read_txt_config",
    "read_excel_config",
]
