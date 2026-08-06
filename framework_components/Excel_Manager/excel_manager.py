"""
===============================================================================
AIAnveshana Framework - Excel Manager Component
===============================================================================
Reusable module for creating, writing, and formatting Excel workbooks (.xlsx).
"""

import os
from typing import List, Dict, Union


def export_to_excel(
    data: List[Dict[str, str]],
    output_path: str,
    sheet_name: str = "Active Loans"
) -> str:
    """
    Exports a list of dictionaries into an Excel workbook (.xlsx).
    Automatically formats headers and auto-fits column widths.

    Parameters:
        data (list of dict): Data records to write.
        output_path (str): Full target file path for Excel workbook.
        sheet_name (str): Worksheet title.

    Returns:
        str: Absolute path of created Excel file.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    try:
        import pandas as pd
        df = pd.DataFrame(data)
        
        # Write to Excel using openpyxl engine
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)

            # Auto-adjust column widths for readability
            worksheet = writer.sheets[sheet_name]
            for col in worksheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                worksheet.column_dimensions[col_letter].width = max(max_len + 4, 12)

        return os.path.abspath(output_path)

    except Exception:
        # Fallback to openpyxl directly if pandas is unavailable
        try:
            import openpyxl
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = sheet_name

            if data:
                headers = list(data[0].keys())
                ws.append(headers)

                for row in data:
                    ws.append([row.get(h, "") for h in headers])

                for col in ws.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    col_letter = col[0].column_letter
                    ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

            wb.save(output_path)
            return os.path.abspath(output_path)

        except Exception as ex:
            raise RuntimeError(f"Failed to export Excel workbook: {ex}") from ex
