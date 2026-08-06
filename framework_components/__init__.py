"""
AIAnveshana Framework - Framework Components
Easy-to-use reusable components for AI & Automation Workflows.
"""

from .ConfigReader import (
    read_config,
    read_json_config,
    read_xml_config,
    read_txt_config,
    read_excel_config,
)
from .ApplicationCleaner import application_clean
from .Logger import log, BotLogger, log_message
from .EmailNotifier import (
    send_gmail,
    send_outlook,
    send_microsoft365,
    create_email_message,
    send_email_smtp,
)
from .ScreenshotTaker import take_screenshot
from .Utilities import (
    get_bot_name,
    get_date_str,
    get_username,
    get_device_name,
)
from .Templates import execute_child_bot, run_master_bot
from . import Browser_Automation
from . import File_Handler
from . import Excel_Manager

__all__ = [
    "read_config",
    "read_json_config",
    "read_xml_config",
    "read_txt_config",
    "read_excel_config",
    "application_clean",
    "log",
    "BotLogger",
    "log_message",
    "send_gmail",
    "send_outlook",
    "send_microsoft365",
    "create_email_message",
    "send_email_smtp",
    "take_screenshot",
    "get_bot_name",
    "get_date_str",
    "get_username",
    "get_device_name",
    "execute_child_bot",
    "run_master_bot",
    "Browser_Automation",
    "File_Handler",
    "Excel_Manager",
]
