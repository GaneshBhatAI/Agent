"""
===============================================================================
AIAnveshana Framework - Master Bot Template
===============================================================================
Standard 7-step Master Bot architecture:
1. INITIAL ASSIGNMENT: Auto-detects Bot Name, Date (DDMMMYYYY), UserName & DeviceName
2. READ CONFIG: Reads configuration into 'dicUserConfig'
3. CLEANUP APPLICATION: Cleans background target applications
4. START EMAIL: Sends process start email notification
5. BUSINESS LOGIC: Placeholder call invoking Child Bot(s)
6. COMPLETED EMAIL: Sends process completion email notification
7. CATCH BLOCK: Catches exceptions, logs details, captures desktop screenshot & emails failure report
"""

import os
import sys

# Add root directory to sys.path for clean imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

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

# Import Child Bot component
from framework_components.Templates.Child_Bot import execute_child_bot


def main():
    try:
        # =====================================================================
        # 1. INITIAL ASSIGNMENT
        # =====================================================================
        strBotName = get_bot_name()             # Auto-detect script name (e.g. "Master_Bot")
        strTodayDate = get_date_str("%d%b%Y")   # Format: DDMMMYYYY (e.g. 06AUG2026)
        strUserName = get_username()            # OS User Name
        strDeviceName = get_device_name()        # Hostname / Machine Name

        print("=" * 65)
        print(f"   STARTING MASTER BOT: {strBotName}   ")
        print(f"   Date: {strTodayDate} | User: {strUserName} | Device: {strDeviceName}   ")
        print("=" * 65)

        # =====================================================================
        # 2. READ CONFIG
        # =====================================================================
        config_file = os.path.join(os.path.dirname(__file__), "..", "..", "samples", "sample_config.xlsx")
        print(f"\n[Step 2] Reading configuration from: '{config_file}'")
        
        # Save returned configuration dictionary as 'dicUserConfig'
        dicUserConfig = read_config(config_file)
        log_folder = dicUserConfig.get("LogFolder", "logs")

        log(f"Master Bot initialized. User: {strUserName}, Device: {strDeviceName}", log_folder, strBotName, "Step1_Init", "INFO")

        # =====================================================================
        # 3. CLEANUP APPLICATION
        # =====================================================================
        app_to_clean = dicUserConfig.get("ApplicationClean", "saplogon,excel,edge")
        print(f"\n[Step 3] Cleaning up background applications: '{app_to_clean}'")
        log(f"Cleaning applications: '{app_to_clean}'", log_folder, strBotName, "Step3_AppClean", "WARNING")
        
        clean_status = application_clean(app_to_clean, force=False)
        log(f"Application clean finished with status: {clean_status}", log_folder, strBotName, "Step3_AppClean", "INFO")

        # =====================================================================
        # 4. START EMAIL
        # =====================================================================
        print("\n[Step 4] Sending Process Start Email Notification...")
        start_email_body = f"""
        <h2>Automation Process Started</h2>
        <p><b>Bot Name:</b> {strBotName}</p>
        <p><b>Date:</b> {strTodayDate}</p>
        <p><b>User:</b> {strUserName}</p>
        <p><b>Device:</b> {strDeviceName}</p>
        <p>Status: Initialized and processing started successfully.</p>
        """
        
        send_gmail(
            to=dicUserConfig.get("AdminEmail", "admin@company.com"),
            subject=f"[{strBotName}] Process Started - {strTodayDate}",
            body=start_email_body,
            username=dicUserConfig.get("SenderEmail", "bot@company.com"),
            password=dicUserConfig.get("SenderPassword", "pass123")
        )
        log("Process Start Email sent.", log_folder, strBotName, "Step4_StartEmail", "INFO")

        # =====================================================================
        # 5. BUSINESS LOGIC (Call Child Bot)
        # =====================================================================
        print("\n[Step 5] Executing Business Logic (Invoking Child Bot)...")
        log("Executing Business Logic placeholder calling Child Bot...", log_folder, strBotName, "Step5_BusinessLogic", "INFO")
        
        # Invoke Child Bot passing dicUserConfig
        child_status = execute_child_bot(dicUserConfig)
        log(f"Child Bot completed with status: {child_status}", log_folder, strBotName, "Step5_BusinessLogic", "INFO")

        # =====================================================================
        # 6. COMPLETED EMAIL
        # =====================================================================
        print("\n[Step 6] Sending Process Completed Email Notification...")
        completed_email_body = f"""
        <h2>Automation Process Completed Successfully</h2>
        <p><b>Bot Name:</b> {strBotName}</p>
        <p><b>Execution Date:</b> {strTodayDate}</p>
        <p><b>Executed By:</b> {strUserName} on {strDeviceName}</p>
        <p>All child bot tasks executed without errors.</p>
        """

        log_file = os.path.join(log_folder, f"Log_{strBotName}_{get_date_str('%d%b%y')}.txt")

        send_gmail(
            to=dicUserConfig.get("AdminEmail", "admin@company.com"),
            subject=f"[{strBotName}] Process Completed Successfully - {strTodayDate}",
            body=completed_email_body,
            username=dicUserConfig.get("SenderEmail", "bot@company.com"),
            password=dicUserConfig.get("SenderPassword", "pass123"),
            attachments=log_file
        )
        log("Process Completed Email sent.", log_folder, strBotName, "Step6_CompletedEmail", "INFO")

        print("\n" + "=" * 65)
        print("   MASTER BOT EXECUTION COMPLETED SUCCESSFULLY!   ")
        print("=" * 65)

    except Exception as ex:
        # =====================================================================
        # 7. CATCH BLOCK: Log, Capture Screenshot, Send Failure Email
        # =====================================================================
        strBotName = get_bot_name()
        strTodayDate = get_date_str("%d%b%Y")
        log_folder = "logs"

        print("\n" + "!" * 65)
        print(f"   MASTER BOT EXCEPTION ENCOUNTERED: {ex}   ")
        print("!" * 65)

        log(f"Master Bot encountered exception: {ex}", log_folder, strBotName, "Step7_Catch", "EXCEPTION", exception=ex)

        print("\n[Step 7] Capturing Desktop Screenshot on Failure...")
        strScreenshotPath = take_screenshot("screenshots")
        print(f"[✓] Exception Screenshot Saved: {strScreenshotPath}")

        print("[Step 7] Sending Failure Email with Exception & Screenshot Attachment...")
        failure_email_body = f"""
        <h2 style="color:red;">Automation Process Failed</h2>
        <p><b>Bot Name:</b> {strBotName}</p>
        <p><b>Failure Date:</b> {strTodayDate}</p>
        <p><b>Exception Details:</b> {ex}</p>
        <p>Please inspect attached failure screenshot and execution log file for details.</p>
        """

        log_file = os.path.join(log_folder, f"Log_{strBotName}_{get_date_str('%d%b%y')}.txt")

        send_gmail(
            to="support@company.com",
            subject=f"[{strBotName}] PROCESS FAILURE ALERT - {strTodayDate}",
            body=failure_email_body,
            username="bot@company.com",
            password="pass123",
            attachments=[strScreenshotPath, log_file]
        )


if __name__ == "__main__":
    main()
