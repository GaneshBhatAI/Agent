"""
Text Logger Module for AIAnveshana Framework.
"""

import os
import socket
import sys
import traceback
from datetime import datetime
from typing import Optional


def log(
    message: str,
    log_path: str,
    bot_name: str,
    sub_bot_name: str,
    level: str = "INFO",
    exception: Optional[Exception] = None,
    device_name: Optional[str] = None
) -> str:
    """
    Simple function to log messages into a Log_[BotName]_[DDMMMYY].txt file.

    Parameters:
        message (str): Log message description.
        log_path (str): Directory path for storing log files.
        bot_name (str): Bot process name.
        sub_bot_name (str): Sub-module / component name.
        level (str): INFO, DEBUG, WARNING, EXCEPTION, ERROR.
        exception (Exception, optional): Exception object for traceback logging.
        device_name (str, optional): Custom machine hostname; auto-detected if None.

    Returns:
        str: Formatted log entry string.
    """
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
    date_str = now.strftime("%d%b%y").upper()
    device = device_name or os.environ.get("COMPUTERNAME") or socket.gethostname()
    lvl = level.upper().strip()

    if not log_path:
        log_path = "logs"
    os.makedirs(log_path, exist_ok=True)

    safe_bot_name = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in bot_name)
    file_name = f"Log_{safe_bot_name}_{date_str}.txt"
    file_full_path = os.path.join(log_path, file_name)

    clean_msg = str(message).replace("\n", " ").replace(",", ".")
    clean_bot_name = str(bot_name).replace(",", ".")
    clean_sub_bot_name = str(sub_bot_name).replace(",", ".")
    clean_device = str(device).replace(",", ".")

    log_line = f"{timestamp},{clean_device},{clean_bot_name},{clean_sub_bot_name},{lvl},{clean_msg}"

    if exception is not None:
        tb_str = "".join(traceback.format_exception(type(exception), exception, exception.__traceback__)).replace("\n", " ").replace(",", ".")
        log_line += f" | EXCEPTION DETAILS: {tb_str}"

    file_exists = os.path.isfile(file_full_path)

    try:
        with open(file_full_path, "a", encoding="utf-8") as f:
            if not file_exists:
                header = "Time,DeviceName,BotName,SubBotName,Level,Message\n"
                f.write(header)
            f.write(log_line + "\n")
    except Exception as e:
        print(f"[LOGGER ERROR] Could not write to log file '{file_full_path}': {e}", file=sys.stderr)

    print(log_line)
    return log_line


class BotLogger:
    """Wrapper class for structured logging."""
    def __init__(self, bot_name: str = "AIAnveshanaBot", sub_bot_name: str = "MainProcess", log_dir: str = "logs", device_name: Optional[str] = None, config=None):
        self.bot_name = bot_name
        self.sub_bot_name = sub_bot_name
        self.log_path = log_dir
        if config and isinstance(config, dict) and "LogFolder" in config:
            self.log_path = config["LogFolder"]
        self.device_name = device_name

    def log(self, level: str, message: str, bot_name: Optional[str] = None, sub_bot_name: Optional[str] = None, exception: Optional[Exception] = None) -> str:
        return log(
            message=message,
            log_path=self.log_path,
            bot_name=bot_name or self.bot_name,
            sub_bot_name=sub_bot_name or self.sub_bot_name,
            level=level,
            device_name=self.device_name,
            exception=exception
        )

    def info(self, message: str, sub_bot_name: Optional[str] = None) -> str:
        return self.log("INFO", message, sub_bot_name=sub_bot_name)

    def debug(self, message: str, sub_bot_name: Optional[str] = None) -> str:
        return self.log("DEBUG", message, sub_bot_name=sub_bot_name)

    def warning(self, message: str, sub_bot_name: Optional[str] = None) -> str:
        return self.log("WARNING", message, sub_bot_name=sub_bot_name)

    def error(self, message: str, sub_bot_name: Optional[str] = None, exception: Optional[Exception] = None) -> str:
        return self.log("ERROR", message, sub_bot_name=sub_bot_name, exception=exception)

    def exception(self, message: str, exception: Exception, sub_bot_name: Optional[str] = None) -> str:
        return self.log("EXCEPTION", message, sub_bot_name=sub_bot_name, exception=exception)


def log_message(message: str, bot_name: str = "AIAnveshanaBot", sub_bot_name: str = "MainProcess", level: str = "INFO", log_dir: str = "logs", **kwargs) -> str:
    return log(
        message=message,
        log_path=kwargs.get("log_path", log_dir),
        bot_name=bot_name,
        sub_bot_name=sub_bot_name,
        level=level,
        exception=kwargs.get("exception")
    )
