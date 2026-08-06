"""
Excel Configuration Reader Module for AIAnveshana Framework.
"""

import os
from typing import Any, Dict, Optional, Union


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


def read_excel_config(file_path: str, sheet_name: Optional[Union[str, int]] = 0) -> Dict[str, Any]:
    """
    Reads an Excel (.xlsx, .xls) configuration file (Key in Col A, Value in Col B) into a dictionary.

    Parameters:
        file_path (str): File path to Excel configuration file.
        sheet_name (str or int, optional): Excel sheet name or 0-based index.

    Returns:
        Dict[str, Any]: Dictionary containing key-value configuration.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel configuration file not found at path: '{file_path}'")

    try:
        import openpyxl
    except ImportError:
        raise ImportError("openpyxl is required to read Excel files. Install via 'pip install openpyxl'.")

    wb = openpyxl.load_workbook(file_path, data_only=True)
    if isinstance(sheet_name, int):
        sheet = wb.worksheets[sheet_name]
    elif isinstance(sheet_name, str):
        sheet = wb[sheet_name]
    else:
        sheet = wb.active

    config_dict: Dict[str, Any] = {}
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return config_dict

    start_idx = 0
    first_row = [str(cell).strip().lower() if cell is not None else "" for cell in rows[0][:2]]
    if len(first_row) >= 2 and first_row[0] in ["key", "setting", "parameter", "name"] and first_row[1] in ["value", "val", "data", "setting"]:
        start_idx = 1

    for row in rows[start_idx:]:
        if not row or len(row) < 2:
            continue
        key_cell = row[0]
        val_cell = row[1]

        if key_cell is not None:
            key = str(key_cell).strip()
            if key and not key.startswith("#"):
                val = "" if val_cell is None else val_cell
                if isinstance(val, str):
                    val = _parse_value(val)
                config_dict[key] = val

    wb.close()
    return config_dict
