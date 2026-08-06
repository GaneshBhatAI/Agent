"""
File_Handler framework component exports
"""

from .file_handler import (
    extract_zip_file,
    extract_all_zips,
    read_text_file,
    parse_key_value_text,
)

__all__ = [
    "extract_zip_file",
    "extract_all_zips",
    "read_text_file",
    "parse_key_value_text",
]
