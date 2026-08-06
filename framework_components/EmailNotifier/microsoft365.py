"""
Microsoft 365 Email Sending Component for AIAnveshana Framework.
"""

from typing import List, Optional, Union
from .base import send_email_smtp


def send_microsoft365(
    to: Union[str, List[str]],
    subject: str,
    body: str,
    username: str,
    password: str,
    cc: Optional[Union[str, List[str]]] = None,
    bcc: Optional[Union[str, List[str]]] = None,
    attachments: Optional[Union[str, List[str]]] = None
) -> bool:
    """
    Sends email via Microsoft 365 SMTP server (smtp.office365.com:587).

    Parameters:
        to (str or list): Recipient email address(es) (REQUIRED).
        subject (str): Email subject text (REQUIRED).
        body (str): HTML body content string (REQUIRED).
        username (str): Microsoft 365 account username/email (REQUIRED).
        password (str): Password / App Password (REQUIRED).
        cc (str or list, optional): CC recipient(s).
        bcc (str or list, optional): BCC recipient(s).
        attachments (str or list, optional): File path(s) to attach.

    Returns:
        bool: True if email transmission attempted.
    """
    return send_email_smtp(
        smtp_server="smtp.office365.com",
        smtp_port=587,
        username=username,
        password=password,
        to=to,
        subject=subject,
        body=body,
        cc=cc,
        bcc=bcc,
        attachments=attachments,
        is_html=True
    )
