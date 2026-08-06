r"""
===============================================================================
Active Loans Process - Master Bot
===============================================================================
Master Bot for Active Loans Process built using AIAnveshana Framework.
Config path: [PROD]\Loan\Loan Team\Active Loans Process\Config\Config_Active Loans Process.xlsx
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

from framework_components.ApplicationCleaner import application_clean
from framework_components.ConfigReader import read_config
from framework_components.EmailNotifier import send_gmail
from framework_components.Logger import log
from framework_components.ScreenshotTaker import take_screenshot
from framework_components.Utilities import (
    get_bot_name,
    get_date_str,
    get_device_name,
    get_username,
)

# Import Child Bot
from Child_ActiveLoansProcess import execute_child_bot


def main():
    # Dynamically locate Config Excel file relative to current Bots directory
    config_file_path = os.path.abspath(os.path.join(current_dir, "..", "Config", "Config_Active Loans Process.xlsx"))
    dicUserConfig = {}

    try:
        # =====================================================================
        # 1. INITIAL ASSIGNMENT
        # =====================================================================
        strBotName = get_bot_name()             # Auto-detect script name ("Master_ActiveLoansProcess")
        strTodayDate = get_date_str("%d%b%Y")   # Format: DDMMMYYYY (e.g. 06AUG2026)
        strUserName = get_username()            # OS User Name
        strDeviceName = get_device_name()        # Hostname / Machine Name

        print("=" * 70)
        print(f"   STARTING MASTER BOT: {strBotName}   ")
        print(f"   Date: {strTodayDate} | User: {strUserName} | Device: {strDeviceName}   ")
        print("=" * 70)

        # =====================================================================
        # 2. READ CONFIG
        # =====================================================================
        print(f"\n[Step 2] Reading configuration from: '{config_file_path}'")
        
        # Save returned configuration dictionary as 'dicUserConfig'
        dicUserConfig = read_config(config_file_path)
        process_name = dicUserConfig.get("ProcessName", strBotName)
        log_folder = dicUserConfig.get("LogFolder", "Logs")

        log(f"Master Bot initialized for process '{process_name}'. User: {strUserName}, Device: {strDeviceName}", log_folder, process_name, "Step1_Init", "INFO")

        # =====================================================================
        # 3. CLEANUP APPLICATION
        # =====================================================================
        app_to_clean = dicUserConfig.get("ApplicationClean", "saplogon,excel,edge")
        print(f"\n[Step 3] Cleaning up background applications: '{app_to_clean}'")
        log(f"Cleaning background applications: '{app_to_clean}'", log_folder, process_name, "Step3_AppClean", "WARNING")
        
        clean_status = application_clean(app_to_clean, force=False)
        log(f"Application clean completed with status: {clean_status}", log_folder, process_name, "Step3_AppClean", "INFO")

        # =====================================================================
        # 4. START EMAIL
        # =====================================================================
        print("\n[Step 4] Sending Process Start Email Notification...")
        start_email_body = f"""
        <h2>{process_name} Started</h2>
        <p><b>Process Name:</b> {process_name}</p>
        <p><b>Bot Name:</b> {strBotName}</p>
        <p><b>Execution Date:</b> {strTodayDate}</p>
        <p><b>Logged-in User:</b> {strUserName}</p>
        <p><b>Device Hostname:</b> {strDeviceName}</p>
        <p>Process initialized successfully from configuration file.</p>
        """

        send_gmail(
            to=dicUserConfig.get("AdminEmail", "admin@company.com"),
            subject=f"[{process_name}] Process Started - {strTodayDate}",
            body=start_email_body,
            username=dicUserConfig.get("SenderEmail", "bot@company.com"),
            password=dicUserConfig.get("SenderPassword", "pass123")
        )
        log("Process Start Email sent.", log_folder, process_name, "Step4_StartEmail", "INFO")

        # =====================================================================
        # 5. BUSINESS LOGIC (Call Child Bot)
        # =====================================================================
        print("\n[Step 5] Executing Business Logic (Invoking Child_ActiveLoansProcess)...")
        log("Executing Business Logic calling Child_ActiveLoansProcess...", log_folder, process_name, "Step5_BusinessLogic", "INFO")
        
        # Invoke Child Bot passing dicUserConfig
        child_status = execute_child_bot(dicUserConfig)
        log(f"Child_ActiveLoansProcess completed with status: {child_status}", log_folder, process_name, "Step5_BusinessLogic", "INFO")

        # =====================================================================
        # 6. COMPLETED EMAIL
        # =====================================================================
        print("\n[Step 6] Sending Process Completed Email Notification...")
        completed_email_body = f"""
        <h2>{process_name} Completed Successfully</h2>
        <p><b>Process Name:</b> {process_name}</p>
        <p><b>Execution Date:</b> {strTodayDate}</p>
        <p><b>Executed By:</b> {strUserName} on {strDeviceName}</p>
        <p>All process child bot tasks executed successfully.</p>
        """

        safe_process_name = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in process_name)
        log_file = os.path.join(log_folder, f"Log_{safe_process_name}_{get_date_str('%d%b%y')}.txt")

        send_gmail(
            to=dicUserConfig.get("AdminEmail", "admin@company.com"),
            subject=f"[{process_name}] Process Completed - {strTodayDate}",
            body=completed_email_body,
            username=dicUserConfig.get("SenderEmail", "bot@company.com"),
            password=dicUserConfig.get("SenderPassword", "pass123"),
            attachments=log_file
        )
        log("Process Completed Email sent.", log_folder, process_name, "Step6_CompletedEmail", "INFO")

        print("\n" + "=" * 70)
        print("   MASTER BOT EXECUTION COMPLETED SUCCESSFULLY!   ")
        print("=" * 70)

    except Exception as ex:
        # =====================================================================
        # 7. CATCH BLOCK: Log, Capture Screenshot, Send Failure Email
        # =====================================================================
        strBotName = get_bot_name()
        strTodayDate = get_date_str("%d%b%Y")
        process_name = dicUserConfig.get("ProcessName", strBotName)
        log_folder = dicUserConfig.get("LogFolder", "Logs")
        screenshots_folder = os.path.join(os.path.dirname(log_folder), "Screenshots") if log_folder and os.path.dirname(log_folder) else "Screenshots"

        exc_type, exc_obj, exc_tb = sys.exc_info()
        tb_list = traceback.extract_tb(exc_tb)
        if tb_list:
            last_frame = tb_list[-1]
            err_file = os.path.basename(last_frame.filename)
            err_line = last_frame.lineno
        else:
            err_file = "Master_ActiveLoansProcess.py"
            err_line = "Unknown"

        error_details = f"Failed in {err_file} at Line {err_line}: {ex}"

        print("\n" + "!" * 70)
        print(f"   MASTER BOT EXCEPTION ENCOUNTERED: {error_details}   ")
        print("!" * 70)

        # 7a. Log Exception
        log(f"Master Bot caught exception: {error_details}", log_folder, process_name, "Step7_Catch", "EXCEPTION", exception=ex)

        # 7b. Take Screen Capture (PNG)
        print("\n[Step 7] Capturing Desktop Screenshot on Failure...")
        strScreenshotPath = take_screenshot(screenshots_folder)
        print(f"[✓] Exception Screenshot Saved: {strScreenshotPath}")

        # 7c. Send Failure Email with Exception Details & Screenshot Attachment
        print("[Step 7] Sending Failure Email with Exception & Screenshot Attachment...")
        failure_email_body = f"""
        <h2 style="color:red;">{process_name} Failed</h2>
        <p><b>Process Name:</b> {process_name}</p>
        <p><b>Failure Date:</b> {strTodayDate}</p>
        <p><b>Exception Details:</b> {error_details}</p>
        <p>Please inspect attached failure screenshot and log file for details.</p>
        """

        safe_process_name = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in process_name)
        log_file = os.path.join(log_folder, f"Log_{safe_process_name}_{get_date_str('%d%b%y')}.txt")

        send_gmail(
            to=dicUserConfig.get("AdminEmail", "admin@company.com"),
            subject=f"[{process_name}] FAILURE ALERT - {strTodayDate}",
            body=failure_email_body,
            username=dicUserConfig.get("SenderEmail", "bot@company.com"),
            password=dicUserConfig.get("SenderPassword", "pass123"),
            attachments=[strScreenshotPath, log_file]
        )


if __name__ == "__main__":
    main()
