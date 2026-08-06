"""
Screenshot Taker Module for AIAnveshana Framework.

Captures active desktop screen, saves as PNG image, and returns complete absolute file path.
"""

import os
import sys
from datetime import datetime


def take_screenshot(path: str = "screenshots") -> str:
    """
    Captures the active screen, saves as PNG with a timestamp in the specified directory,
    and returns the complete absolute file path.

    Parameters:
        path (str): Target directory path where screenshot PNG will be stored. Default is "screenshots".

    Returns:
        str: Complete absolute file path of the saved screenshot image.
    """
    if not path:
        path = "screenshots"

    # Ensure output folder exists
    os.makedirs(path, exist_ok=True)

    # Prepare timestamp and filename format: ScreenshotLog_[Timestamp].png
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"ScreenshotLog_{timestamp}.png"
    file_full_path = os.path.join(path, file_name)

    # Capture screen using PIL ImageGrab
    try:
        from PIL import ImageGrab
        img = ImageGrab.grab()
        img.save(file_full_path, "PNG")
    except ImportError:
        # Fallback if Pillow is not installed in the active environment
        print("[SCREENSHOT NOTICE] Pillow module not installed. Creating fallback screenshot placeholder file.", file=sys.stderr)
        with open(file_full_path, "wb") as f:
            # Minimal valid 1x1 transparent PNG bytes
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
    except Exception as e:
        print(f"[SCREENSHOT WARNING] Desktop capture failed ({e}). Creating screenshot placeholder file.", file=sys.stderr)
        with open(file_full_path, "wb") as f:
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

    # Return complete absolute file path
    return os.path.abspath(file_full_path)
