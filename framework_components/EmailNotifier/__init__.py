"""
EmailNotifier Package for AIAnveshana Framework.

Provides provider-specific email functions:
- send_gmail(...)
- send_outlook(...)
- send_microsoft365(...)
"""

from .base import create_email_message, send_email_smtp
from .gmail import send_gmail
from .outlook import send_outlook
from .microsoft365 import send_microsoft365

__all__ = [
    "send_gmail",
    "send_outlook",
    "send_microsoft365",
    "create_email_message",
    "send_email_smtp",
]
