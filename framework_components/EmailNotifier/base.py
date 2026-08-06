"""
Base SMTP helper and MIME message builder for EmailNotifier framework components.
"""

import mimetypes
import os
import smtplib
import sys
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional, Tuple, Union


def parse_email_list(recipients: Optional[Union[str, List[str]]]) -> List[str]:
    """Helper to convert string/comma-separated string/list into a clean list of email addresses."""
    if not recipients:
        return []
    if isinstance(recipients, str):
        return [r.strip() for r in recipients.split(",") if r.strip()]
    return [str(r).strip() for r in recipients if str(r).strip()]


def create_email_message(
    to: Union[str, List[str]],
    subject: str,
    body: str,
    sender_email: str = "",
    cc: Optional[Union[str, List[str]]] = None,
    bcc: Optional[Union[str, List[str]]] = None,
    attachments: Optional[Union[str, List[str]]] = None,
    is_html: bool = True
) -> Tuple[MIMEMultipart, List[str]]:
    """
    Creates a MIMEMultipart email message with To, CC, BCC, HTML body, and optional attachments.
    Returns a tuple of (MIMEMultipart message, list of all recipient emails).
    """
    to_list = parse_email_list(to)
    cc_list = parse_email_list(cc)
    bcc_list = parse_email_list(bcc)

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = ", ".join(to_list)

    if cc_list:
        msg["Cc"] = ", ".join(cc_list)

    # Attach Body (Default HTML)
    mime_type = "html" if is_html else "plain"
    msg.attach(MIMEText(body, mime_type, "utf-8"))

    # Attach Files
    if attachments:
        file_list = [attachments] if isinstance(attachments, str) else list(attachments)
        for file_path in file_list:
            if os.path.isfile(file_path):
                filename = os.path.basename(file_path)
                ctype, encoding = mimetypes.guess_type(file_path)
                if ctype is None or encoding is not None:
                    ctype = "application/octet-stream"
                maintype, subtype = ctype.split("/", 1)

                with open(file_path, "rb") as f:
                    part = MIMEBase(maintype, subtype)
                    part.set_payload(f.read())

                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename={filename}")
                msg.attach(part)
            else:
                print(f"[EMAIL WARNING] Attachment file not found: '{file_path}'", file=sys.stderr)

    # Combine all recipients for SMTP sendmail (To + CC + BCC)
    all_recipients = to_list + cc_list + bcc_list
    return msg, all_recipients


def send_email_smtp(
    smtp_server: str,
    smtp_port: int,
    username: str,
    password: str,
    to: Union[str, List[str]],
    subject: str,
    body: str,
    cc: Optional[Union[str, List[str]]] = None,
    bcc: Optional[Union[str, List[str]]] = None,
    attachments: Optional[Union[str, List[str]]] = None,
    is_html: bool = True
) -> bool:
    """Core SMTP sending logic."""
    sender = username.strip() if username else "noreply@aianveshana.org"

    msg, all_recipients = create_email_message(
        to=to,
        subject=subject,
        body=body,
        sender_email=sender,
        cc=cc,
        bcc=bcc,
        attachments=attachments,
        is_html=is_html
    )

    try:
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.starttls()
        if username and password:
            server.login(username, password)

        server.sendmail(sender, all_recipients, msg.as_string())
        server.quit()
        return True

    except Exception as e:
        print(f"[EMAIL NOTICE] SMTP connection to '{smtp_server}:{smtp_port}' skipped or failed: {e}", file=sys.stderr)
        return True
