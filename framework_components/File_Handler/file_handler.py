"""
===============================================================================
AIAnveshana Framework - File Handler Component
===============================================================================
Reusable module for ZIP extraction, text reading, and key-value text parsing.
"""

import os
import zipfile
import glob
from typing import List, Dict, Optional


def extract_zip_file(zip_path: str, extract_dir: str) -> List[str]:
    """
    Extracts a single ZIP file into extract_dir.
    Returns list of extracted file absolute paths.
    """
    os.makedirs(extract_dir, exist_ok=True)
    extracted_files = []

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
        for name in zip_ref.namelist():
            extracted_files.append(os.path.abspath(os.path.join(extract_dir, name)))

    return extracted_files


def extract_all_zips(input_dir: str, extract_dir: str) -> List[str]:
    """
    Extracts all ZIP files found in input_dir into extract_dir.
    Returns list of all extracted file paths.
    """
    os.makedirs(extract_dir, exist_ok=True)
    all_extracted = []

    zip_pattern = os.path.join(input_dir, "*.zip")
    zip_files = glob.glob(zip_pattern)

    for zip_path in zip_files:
        files = extract_zip_file(zip_path, extract_dir)
        all_extracted.extend(files)

    return all_extracted


def read_text_file(file_path: str, encoding: str = "utf-8") -> str:
    """
    Reads and returns the complete string content of a text file.
    """
    with open(file_path, "r", encoding=encoding, errors="replace") as f:
        return f.read()


def parse_key_value_text(text_content: str, delimiter: str = ":") -> Dict[str, str]:
    """
    Parses key-value text formatted lines (e.g., 'Key: Value').
    Returns a dictionary of stripped key-value pairs.
    """
    result = {}
    lines = text_content.strip().splitlines()

    for line in lines:
        line = line.strip()
        if not line or delimiter not in line:
            continue
        parts = line.split(delimiter, 1)
        key = parts[0].strip()
        val = parts[1].strip()
        result[key] = val

    return result
