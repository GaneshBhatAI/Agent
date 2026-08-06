"""
===============================================================================
Active Loans Process - Child Bot
===============================================================================
Child Bot process invoked by Master_ActiveLoansProcess.py
"""

import os
import sys
import traceback

# Dynamically add PROD directory containing framework_components to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
prod_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
if prod_dir not in sys.path:
    sys.path.insert(0, prod_dir)

# Ensure current Bots directory is in sys.path
if current_dir not in sys.path:
    sys.path.append(current_dir)

from framework_components.ConfigReader import read_config
from framework_components.File_Handler import extract_all_zips, read_text_file, parse_key_value_text
from framework_components.Excel_Manager import export_to_excel
from framework_components.Logger import log
from framework_components.Utilities import get_bot_name, get_date_str
from framework_components.Browser_Automation import (
    open_browser,
    close_browser,
    download_file,
    get_text,
    get_element_count,
    element_exists,
    wait_for_element,
)

# Debug flag: Set to True when testing Child Bot directly
isDebug = False

# Dynamically locate Config Excel file relative to current Bots directory
config_file_path = os.path.abspath(os.path.join(current_dir, "..", "Config", "Config_Active Loans Process.xlsx"))


def execute_child_bot(dicUserConfig: dict = None) -> bool:
    """
    Executes Active Loans Process child bot logic using modular framework components:
    1. Opens target web URL from dicUserConfig["URL"].
    2. Scans table for ACTIVE status rows.
    3. Downloads each bank zip file one by one into the process Input directory.
    4. Extracts text files from downloaded zip files using File_Handler component.
    5. Parses loan records from note files (.txt).
    6. Exports consolidated data to Excel report in Process\\Output with current date.
    """
    global isDebug, config_file_path

    # If debugging or dicUserConfig not passed, load directly from config file
    if isDebug or not dicUserConfig:
        dicUserConfig = read_config(config_file_path)

    process_name = dicUserConfig.get("ProcessName", "Active Loans Process")
    log_folder = dicUserConfig.get("LogFolder", "Logs")
    target_url = dicUserConfig.get("URL", "https://botsdna.com/ActiveLoans/")

    # Derive Process directories (Input & Output)
    if "Process" in log_folder:
        process_base_dir = os.path.abspath(os.path.join(log_folder, ".."))
    else:
        process_base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Process"))

    input_dir = os.path.join(process_base_dir, "Input")
    output_dir = os.path.join(process_base_dir, "Output")
    temp_extract_dir = os.path.join(process_base_dir, "Temp_Extracted")

    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    today_str = get_date_str("%d%b%Y")
    excel_output_file = os.path.join(output_dir, f"Active_Loans_Output_{today_str}.xlsx")

    print("\n[Child Bot] Starting Active Loans Process Web Automation & Data Extraction...")
    log(f"Starting Active Loans Process. Target URL: '{target_url}'", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

    try:
        is_headless_str = str(dicUserConfig.get("Headless", "False")).strip().lower()
        is_headless = True if is_headless_str in ("true", "1", "yes") else False

        # 1. Open Browser & Navigate to URL
        log(f"Opening browser for URL: '{target_url}' (Headless={is_headless})", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")
        page = open_browser(target_url, headless=is_headless)
        wait_for_element("//table", state="visible", timeout=30000)
        log("Web page and table loaded successfully.", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

        # 2. Find all table rows
        rows_count = get_element_count("//table//tr")
        log(f"Total table rows detected: {rows_count}", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

        download_count = 0

        # 3. Iterate through rows (skipping header row)
        for i in range(2, rows_count + 1):
            status_xpath = f"//table//tr[{i}]/td[1]"
            link_xpath = f"//table//tr[{i}]/td[2]/a"
            pan_xpath = f"//table//tr[{i}]/td[3]"

            if element_exists(status_xpath, timeout=2000):
                status_text = get_text(status_xpath).upper()

                if status_text == "ACTIVE":
                    if element_exists(link_xpath, timeout=2000):
                        bank_name = get_text(link_xpath)
                        pan_num = get_text(pan_xpath) if element_exists(pan_xpath, timeout=1000) else "N/A"

                        log(f"Downloading ACTIVE loan zip: Bank='{bank_name}'. PAN='{pan_num}'", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

                        # Download zip file using Playwright expect_download / direct request
                        saved_path = download_file(link_xpath, input_dir)
                        if saved_path:
                            download_count += 1
                            log(f"Successfully downloaded #{download_count}: '{os.path.basename(saved_path)}' to '{saved_path}'", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")
                        else:
                            log(f"Warning: Download failed or link non-downloadable for Bank='{bank_name}'. PAN='{pan_num}'", log_folder, process_name, "Child_ActiveLoansProcess", "WARNING")

        log(f"Total ACTIVE bank zip files downloaded: {download_count}", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

        # 4. Extract downloaded bank zip files using File_Handler modular component
        log(f"Extracting bank zip files from '{input_dir}' to '{temp_extract_dir}'...", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")
        extracted_files = extract_all_zips(input_dir, temp_extract_dir)
        log(f"Total extracted files: {len(extracted_files)}", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

        # 5. Read note files (.txt) and parse loan data
        extracted_data_list = []
        for file_path in extracted_files:
            if file_path.endswith(".txt"):
                txt_content = read_text_file(file_path)
                record_dict = parse_key_value_text(txt_content)
                if record_dict:
                    extracted_data_list.append(record_dict)

        log(f"Parsed {len(extracted_data_list)} loan data records from extracted note files.", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")

        # 6. Export extracted records to Excel report using Excel_Manager modular component
        if extracted_data_list:
            saved_excel_path = export_to_excel(extracted_data_list, excel_output_file, sheet_name="Active Loans")
            print(f"[Child Bot] Excel report created successfully: {saved_excel_path}")
            log(f"Successfully saved output Excel report with {len(extracted_data_list)} records to '{saved_excel_path}'", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")
        else:
            log("No loan data records extracted to save to Excel.", log_folder, process_name, "Child_ActiveLoansProcess", "WARNING")

        return True

    except Exception as ex:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        tb_list = traceback.extract_tb(exc_tb)
        if tb_list:
            last_frame = tb_list[-1]
            err_file = os.path.basename(last_frame.filename)
            err_line = last_frame.lineno
        else:
            err_file = "Child_ActiveLoansProcess.py"
            err_line = "Unknown"

        formatted_err = f"Exception in {err_file} at Line {err_line}: {ex}"
        log(formatted_err, log_folder, process_name, "Child_ActiveLoansProcess", "ERROR", exception=ex)
        raise Exception(formatted_err) from ex

    finally:
        log("Closing browser session.", log_folder, process_name, "Child_ActiveLoansProcess", "INFO")
        close_browser()


if __name__ == "__main__":
    isDebug = True
    execute_child_bot()
