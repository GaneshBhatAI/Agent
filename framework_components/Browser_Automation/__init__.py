"""
Browser Automation Module for AIAnveshana Framework.
Exposes enterprise RPA web activities backed by Playwright.
"""

from .browser_manager import (
    BrowserAutomationManager,
    open_browser,
    close_browser,
    click_element,
    double_click_element,
    right_click_element,
    type_into,
    get_text,
    get_attribute,
    select_dropdown_option,
    hover_element,
    wait_for_element,
    element_exists,
    download_file,
    get_element_count,
    take_page_screenshot,
    execute_javascript,
    get_open_tabs,
    switch_to_tab,
    close_current_tab,
    normalize_selector,
)

__all__ = [
    "BrowserAutomationManager",
    "open_browser",
    "close_browser",
    "click_element",
    "double_click_element",
    "right_click_element",
    "type_into",
    "get_text",
    "get_attribute",
    "select_dropdown_option",
    "hover_element",
    "wait_for_element",
    "element_exists",
    "download_file",
    "get_element_count",
    "take_page_screenshot",
    "execute_javascript",
    "get_open_tabs",
    "switch_to_tab",
    "close_current_tab",
    "normalize_selector",
]
