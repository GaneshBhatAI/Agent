"""
===============================================================================
AIAnveshana Framework - Child Bot Template
===============================================================================
Sub-process bot invoked by Master_Bot to execute specific business logic tasks.
Accepts 'dicUserConfig' configuration dictionary.
"""

import os
import sys
import traceback

# Add root directory to sys.path for clean imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from framework_components.ConfigReader import read_config
from framework_components.Logger import log
from framework_components.Utilities import get_bot_name, get_date_str

# Debug flag: Set to True when testing Child Bot directly
isDebug = False
config_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "samples", "sample_config.xlsx"))


def execute_child_bot(dicUserConfig: dict = None) -> bool:
    """
    Executes specific business logic task for Child Bot.

    Parameters:
        dicUserConfig (dict, optional): User configuration dictionary loaded from Master Bot.

    Returns:
        bool: True if child bot task completed successfully.
    """
    global isDebug, config_file_path

    # If debugging or dicUserConfig not passed, load directly from config file
    if isDebug or not dicUserConfig:
        dicUserConfig = read_config(config_file_path)

    process_name = dicUserConfig.get("ProcessName", get_bot_name())
    log_folder = dicUserConfig.get("LogFolder", "logs")

    log("Child Bot execution started.", log_folder, process_name, "Child_Bot", "INFO")

    try:
        # -------------------------------------------------------------
        # BUSINESS PROCESS STEP(S)
        # -------------------------------------------------------------
        app_name = dicUserConfig.get("ApplicationName", "Sample App")
        timeout = dicUserConfig.get("TimeoutSeconds", 60)

        log(f"Processing data for '{app_name}' with timeout {timeout}s...", log_folder, process_name, "Child_Bot", "INFO")
        
        # Example business task simulation
        log("Child Bot business logic processed successfully.", log_folder, process_name, "Child_Bot", "INFO")
        return True

    except Exception as ex:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        tb_list = traceback.extract_tb(exc_tb)
        if tb_list:
            last_frame = tb_list[-1]
            err_file = os.path.basename(last_frame.filename)
            err_line = last_frame.lineno
        else:
            err_file = "Child_Bot.py"
            err_line = "Unknown"

        formatted_err = f"Exception in {err_file} at Line {err_line}: {ex}"
        log(formatted_err, log_folder, process_name, "Child_Bot", "EXCEPTION", exception=ex)
        raise Exception(formatted_err) from ex


if __name__ == "__main__":
    isDebug = True
    execute_child_bot()
