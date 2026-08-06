"""
Browser Automation Module for AIAnveshana Framework.
Provides enterprise RPA web automation activities using Playwright:
- Browser Lifecycle (open_browser, close_browser)
- Element Interactions (click, double_click, right_click, type_into, hover)
- Data Extraction (get_text, get_attribute, select_dropdown)
- Element Inspection & Waiting (wait_for_element, element_exists)
- Window & Tab Management (switch_to_tab, get_open_tabs, close_current_tab)
- Relative XPath & Selector Auto-normalization
"""

import os
import sys
import time
from typing import List, Dict, Any, Optional

try:
    from playwright.sync_api import sync_playwright, Playwright, Browser, BrowserContext, Page, Locator
except ImportError:
    sync_playwright = None


def normalize_selector(selector: str) -> str:
    """
    Normalizes selectors for Playwright.
    Auto-prefixes XPaths (e.g. //input[@id='val'], (//button)[1], ./div) with 'xpath='.
    """
    if not selector:
        return ""
    sel = selector.strip()
    if sel.startswith("//") or sel.startswith("(") or sel.startswith("./") or sel.startswith("xpath="):
        if not sel.startswith("xpath="):
            return f"xpath={sel}"
    return sel


class BrowserAutomationManager:
    """
    Enterprise RPA Browser Automation Engine backed by Playwright.
    Manages Playwright instance, Browser, Context, Pages (Tabs), and Activities.
    """

    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._active_page: Optional[Page] = None

    def open_browser(
        self,
        url: str,
        browser_type: str = "chromium",
        headless: bool = False,
        slow_mo: int = 100,
        args: Optional[List[str]] = None,
        timeout: int = 30000
    ) -> Page:
        """
        Launches the browser, opens a new page/tab, and navigates to the specified URL.

        Parameters:
            url (str): Target web URL (e.g., "https://example.com").
            browser_type (str): "chromium", "firefox", or "webkit" (default: "chromium").
            headless (bool): Run browser headlessly if True (default: False).
            slow_mo (int): Delay in ms between Playwright operations for visual debugging (default: 100ms).
            args (list): Additional browser launch arguments.
            timeout (int): Navigation timeout in ms (default: 30000ms).

        Returns:
            Page: Playwright Page instance.
        """
        if sync_playwright is None:
            raise RuntimeError("Playwright package is not installed. Please run 'pip install playwright && playwright install'")

        if self._playwright is None:
            self._playwright = sync_playwright().start()

        browser_type = browser_type.lower().strip()
        launch_args = args or ["--start-maximized"]

        if browser_type == "firefox":
            self._browser = self._playwright.firefox.launch(headless=headless, slow_mo=slow_mo, args=launch_args)
        elif browser_type == "webkit":
            self._browser = self._playwright.webkit.launch(headless=headless, slow_mo=slow_mo, args=launch_args)
        else:
            self._browser = self._playwright.chromium.launch(headless=headless, slow_mo=slow_mo, args=launch_args)

        self._context = self._browser.new_context(no_viewport=True)
        self._active_page = self._context.new_page()
        self._active_page.set_default_timeout(timeout)

        if url:
            self._active_page.goto(url, wait_until="domcontentloaded", timeout=timeout)

        return self._active_page

    def close_browser(self):
        """Safely closes all tabs, context, and browser instance."""
        try:
            if self._context:
                self._context.close()
                self._context = None
            if self._browser:
                self._browser.close()
                self._browser = None
            if self._playwright:
                self._playwright.stop()
                self._playwright = None
            self._active_page = None
        except Exception as e:
            print(f"[Browser_Automation] Warning during browser close: {e}", file=sys.stderr)

    @property
    def current_page(self) -> Page:
        """Returns the current active page instance."""
        if not self._active_page or self._active_page.is_closed():
            raise RuntimeError("No active browser tab found. Call open_browser() first.")
        return self._active_page

    # =========================================================================
    # ELEMENT ACTIVITIES (XPath Supported)
    # =========================================================================

    def _get_locator(self, selector: str) -> Locator:
        norm_sel = normalize_selector(selector)
        return self.current_page.locator(norm_sel)

    def click_element(self, selector: str, timeout: int = 30000, force: bool = False):
        """Clicks an element identified by XPath or CSS selector."""
        loc = self._get_locator(selector)
        loc.click(timeout=timeout, force=force)

    def double_click_element(self, selector: str, timeout: int = 30000):
        """Double clicks an element identified by XPath or CSS selector."""
        loc = self._get_locator(selector)
        loc.dblclick(timeout=timeout)

    def right_click_element(self, selector: str, timeout: int = 30000):
        """Right clicks (context menu click) an element."""
        loc = self._get_locator(selector)
        loc.click(button="right", timeout=timeout)

    def type_into(self, selector: str, text: str, clear_first: bool = True, timeout: int = 30000):
        """Types text into an input field or textarea."""
        loc = self._get_locator(selector)
        if clear_first:
            loc.fill(text, timeout=timeout)
        else:
            loc.type(text, timeout=timeout)

    def get_text(self, selector: str, timeout: int = 30000) -> str:
        """Reads and returns inner text of target element."""
        loc = self._get_locator(selector)
        return loc.inner_text(timeout=timeout).strip()

    def get_attribute(self, selector: str, attribute_name: str, timeout: int = 30000) -> Optional[str]:
        """Reads and returns the specified attribute value of an element."""
        loc = self._get_locator(selector)
        return loc.get_attribute(attribute_name, timeout=timeout)

    def select_dropdown_option(
        self,
        selector: str,
        value: Optional[str] = None,
        label: Optional[str] = None,
        index: Optional[int] = None,
        timeout: int = 30000
    ) -> List[str]:
        """Selects an option in a `<select>` dropdown by value, label, or index."""
        loc = self._get_locator(selector)
        if value is not None:
            return loc.select_option(value=value, timeout=timeout)
        elif label is not None:
            return loc.select_option(label=label, timeout=timeout)
        elif index is not None:
            return loc.select_option(index=index, timeout=timeout)
        else:
            raise ValueError("Must specify value, label, or index for dropdown selection.")

    def hover_element(self, selector: str, timeout: int = 30000):
        """Hovers the mouse over an element."""
        loc = self._get_locator(selector)
        loc.hover(timeout=timeout)

    def wait_for_element(
        self,
        selector: str,
        state: str = "visible",
        timeout: int = 30000
    ) -> bool:
        """
        Waits for element to reach specified state ('visible', 'hidden', 'attached', 'detached').
        Returns True if successful.
        """
        loc = self._get_locator(selector)
        loc.wait_for(state=state, timeout=timeout)
        return True

    def element_exists(self, selector: str, timeout: int = 5000) -> bool:
        """Checks if an element exists and is visible on the page."""
        try:
            loc = self._get_locator(selector)
            return loc.is_visible(timeout=timeout)
        except Exception:
            return False

    def take_page_screenshot(self, file_path: str, full_page: bool = False) -> str:
        """Captures screenshot of current active browser page."""
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        self.current_page.screenshot(path=file_path, full_page=full_page)
        return file_path

    def download_file(self, selector: str, download_dir: str, timeout: int = 10000) -> Optional[str]:
        """
        Clicks an element expecting a file download, saves the file into download_dir,
        and returns the local file path. Returns None if download fails or times out.
        """
        import urllib.parse
        os.makedirs(download_dir, exist_ok=True)
        loc = self._get_locator(selector)
        try:
            with self.current_page.expect_download(timeout=timeout) as download_info:
                loc.click(timeout=timeout)
            download = download_info.value
            file_name = download.suggested_filename
            target_path = os.path.join(download_dir, file_name)
            download.save_as(target_path)
            return target_path
        except Exception:
            # Fallback: check href attribute and fetch directly via request context
            try:
                href = loc.get_attribute("href", timeout=2000)
                if href:
                    base_url = self.current_page.url
                    full_url = urllib.parse.urljoin(base_url, href)
                    file_name = os.path.basename(href)
                    if not file_name.endswith(".zip"):
                        file_name += ".zip"
                    target_path = os.path.join(download_dir, file_name)
                    response = self.current_page.request.get(full_url)
                    if response.ok:
                        with open(target_path, "wb") as f:
                            f.write(response.body())
                        return target_path
            except Exception:
                pass
            return None

    def get_element_count(self, selector: str) -> int:
        """Returns the count of elements matching selector."""
        loc = self._get_locator(selector)
        return loc.count()

    def execute_javascript(self, script: str, *args) -> Any:
        """Executes custom JavaScript inside active page context."""
        return self.current_page.evaluate(script, *args)

    # =========================================================================
    # WINDOW & TAB HANDLING (RPA Multi-Window / Multi-Tab Activities)
    # =========================================================================

    def get_open_tabs(self) -> List[Dict[str, Any]]:
        """Returns a list of all open browser tabs/pages with index, title, and URL."""
        if not self._context:
            return []
        result = []
        for i, pg in enumerate(self._context.pages):
            result.append({
                "index": i,
                "title": pg.title(),
                "url": pg.url,
                "is_active": (pg == self._active_page)
            })
        return result

    def switch_to_tab(self, identifier: Any) -> Page:
        """
        Switches active focus to tab by index (0-based) or by matching window title / URL substring.

        Parameters:
            identifier (int or str): Tab index integer or title/URL substring string.

        Returns:
            Page: The newly focused Playwright Page instance.
        """
        if not self._context:
            raise RuntimeError("No active browser context found.")

        pages = self._context.pages

        if isinstance(identifier, int):
            if 0 <= identifier < len(pages):
                self._active_page = pages[identifier]
                self._active_page.bring_to_front()
                return self._active_page
            else:
                raise IndexError(f"Tab index {identifier} out of range (Total open tabs: {len(pages)})")

        identifier_str = str(identifier).lower()
        for pg in pages:
            if identifier_str in pg.title().lower() or identifier_str in pg.url.lower():
                self._active_page = pg
                self._active_page.bring_to_front()
                return self._active_page

        raise ValueError(f"No open tab found matching title/URL: '{identifier}'")

    def close_current_tab(self) -> Page:
        """Closes the current active tab and switches focus to the last available tab."""
        if self._active_page:
            self._active_page.close()
            pages = self._context.pages if self._context else []
            if pages:
                self._active_page = pages[-1]
                self._active_page.bring_to_front()
            else:
                self._active_page = None
        return self._active_page


# Global Singleton Instance for procedure call access
_browser_instance = BrowserAutomationManager()

# Global procedural API functions for clean RPA bot calls
open_browser = _browser_instance.open_browser
close_browser = _browser_instance.close_browser
click_element = _browser_instance.click_element
double_click_element = _browser_instance.double_click_element
right_click_element = _browser_instance.right_click_element
type_into = _browser_instance.type_into
get_text = _browser_instance.get_text
get_attribute = _browser_instance.get_attribute
select_dropdown_option = _browser_instance.select_dropdown_option
hover_element = _browser_instance.hover_element
wait_for_element = _browser_instance.wait_for_element
element_exists = _browser_instance.element_exists
download_file = _browser_instance.download_file
get_element_count = _browser_instance.get_element_count
take_page_screenshot = _browser_instance.take_page_screenshot
execute_javascript = _browser_instance.execute_javascript
get_open_tabs = _browser_instance.get_open_tabs
switch_to_tab = _browser_instance.switch_to_tab
close_current_tab = _browser_instance.close_current_tab
