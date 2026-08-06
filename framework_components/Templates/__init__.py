"""
Templates Package for AIAnveshana Framework.

Provides starter bot templates:
- Master_Bot.py
- Child_Bot.py
"""

from .Child_Bot import execute_child_bot
from .Master_Bot import main as run_master_bot

__all__ = ["execute_child_bot", "run_master_bot"]
