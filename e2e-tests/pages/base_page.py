"""
Base Page Object

Provides common functionality for all page objects:
- Navigation helpers
- Wait strategies
- Common assertions
- Element interaction utilities
"""

from playwright.sync_api import Page, Locator, expect
from typing import Optional
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config


class BasePage:
    """
    Base class for all page objects.

    Provides common utilities for:
    - Navigation
    - Waiting for elements/conditions
    - Taking screenshots
    - Common UI interactions
    """

    def __init__(self, page: Page):
        self.page = page
        self.config = config

    # ==================== Navigation ====================

    def navigate(self, path: str = "/"):
        """Navigate to a path relative to base URL"""
        self.page.goto(path)
        self.wait_for_page_load()

    def navigate_to_url(self, url: str):
        """Navigate to an absolute URL"""
        self.page.goto(url)
        self.wait_for_page_load()

    def reload(self):
        """Reload the current page"""
        self.page.reload()
        self.wait_for_page_load()

    def go_back(self):
        """Navigate back in browser history"""
        self.page.go_back()
        self.wait_for_page_load()

    # ==================== Waiting Strategies ====================

    def wait_for_page_load(self):
        """Wait for page to finish loading"""
        self.page.wait_for_load_state("domcontentloaded")
        self.page.wait_for_load_state("networkidle")

    def wait_for_url(self, url_pattern: str, timeout: Optional[int] = None):
        """Wait for URL to match a pattern (string or regex)"""
        self.page.wait_for_url(url_pattern, timeout=timeout or config.timeouts.navigation)

    def wait_for_url_contains(self, substring: str, timeout: Optional[int] = None):
        """Wait for URL to contain a substring"""
        self.page.wait_for_url(f"**/*{substring}*", timeout=timeout or config.timeouts.navigation)

    def wait_for_element(self, selector: str, state: str = "visible", timeout: Optional[int] = None) -> Locator:
        """
        Wait for an element to reach a specific state.

        Args:
            selector: CSS selector or Playwright selector
            state: 'attached', 'detached', 'visible', 'hidden'
            timeout: Override default timeout
        """
        locator = self.page.locator(selector)
        locator.wait_for(state=state, timeout=timeout or config.timeouts.default)
        return locator

    def wait_for_loading_complete(self):
        """Wait for any loading spinners to disappear"""
        # Wait for common loading indicators to be hidden
        loading_selectors = [
            "[aria-label='Loading']",
            ".animate-spin",
            "[data-testid='loading']",
            ".loading-spinner",
        ]
        for selector in loading_selectors:
            if self.page.locator(selector).count() > 0:
                self.page.locator(selector).first.wait_for(state="hidden", timeout=config.timeouts.default)

    def wait_for_text(self, text: str, timeout: Optional[int] = None) -> Locator:
        """Wait for text to appear on the page"""
        locator = self.page.get_by_text(text)
        locator.wait_for(state="visible", timeout=timeout or config.timeouts.default)
        return locator

    def wait_for_no_text(self, text: str, timeout: Optional[int] = None):
        """Wait for text to disappear from the page"""
        locator = self.page.get_by_text(text)
        locator.wait_for(state="hidden", timeout=timeout or config.timeouts.default)

    # ==================== Element Interaction ====================

    def click(self, selector: str):
        """Click an element"""
        self.page.click(selector)

    def click_button(self, name: str):
        """Click a button by its accessible name"""
        self.page.get_by_role("button", name=name).click()

    def click_link(self, name: str):
        """Click a link by its accessible name"""
        self.page.get_by_role("link", name=name).click()

    def fill(self, selector: str, value: str):
        """Fill a text input"""
        self.page.fill(selector, value)

    def fill_input(self, label: str, value: str):
        """Fill an input by its label"""
        self.page.get_by_label(label).fill(value)

    def select_option(self, selector: str, value: str):
        """Select an option from a dropdown"""
        self.page.select_option(selector, value)

    def check(self, selector: str):
        """Check a checkbox"""
        self.page.check(selector)

    def uncheck(self, selector: str):
        """Uncheck a checkbox"""
        self.page.uncheck(selector)

    # ==================== Element Queries ====================

    def get_by_role(self, role: str, **kwargs) -> Locator:
        """Get element by ARIA role"""
        return self.page.get_by_role(role, **kwargs)

    def get_by_text(self, text: str, **kwargs) -> Locator:
        """Get element by text content"""
        return self.page.get_by_text(text, **kwargs)

    def get_by_label(self, label: str, **kwargs) -> Locator:
        """Get element by its label"""
        return self.page.get_by_label(label, **kwargs)

    def get_by_placeholder(self, placeholder: str, **kwargs) -> Locator:
        """Get element by placeholder text"""
        return self.page.get_by_placeholder(placeholder, **kwargs)

    def get_by_test_id(self, test_id: str) -> Locator:
        """Get element by data-testid attribute"""
        return self.page.get_by_test_id(test_id)

    def locator(self, selector: str) -> Locator:
        """Get element by CSS selector"""
        return self.page.locator(selector)

    # ==================== Assertions ====================

    def assert_url(self, expected_url: str):
        """Assert current URL matches expected"""
        expect(self.page).to_have_url(expected_url)

    def assert_url_contains(self, substring: str):
        """Assert current URL contains a substring"""
        expect(self.page).to_have_url(re.compile(f".*{substring}.*"))

    def assert_title(self, expected_title: str):
        """Assert page title matches expected"""
        expect(self.page).to_have_title(expected_title)

    def assert_title_contains(self, substring: str):
        """Assert page title contains a substring"""
        expect(self.page).to_have_title(re.compile(f".*{substring}.*"))

    def assert_visible(self, selector: str):
        """Assert element is visible"""
        expect(self.page.locator(selector)).to_be_visible()

    def assert_hidden(self, selector: str):
        """Assert element is hidden"""
        expect(self.page.locator(selector)).to_be_hidden()

    def assert_text_visible(self, text: str):
        """Assert text is visible on the page"""
        expect(self.page.get_by_text(text)).to_be_visible()

    def assert_text_not_visible(self, text: str):
        """Assert text is not visible on the page"""
        expect(self.page.get_by_text(text)).not_to_be_visible()

    def assert_button_enabled(self, name: str):
        """Assert button is enabled"""
        expect(self.page.get_by_role("button", name=name)).to_be_enabled()

    def assert_button_disabled(self, name: str):
        """Assert button is disabled"""
        expect(self.page.get_by_role("button", name=name)).to_be_disabled()

    def assert_input_value(self, label: str, expected_value: str):
        """Assert input has expected value"""
        expect(self.page.get_by_label(label)).to_have_value(expected_value)

    # ==================== Utilities ====================

    def take_screenshot(self, name: str):
        """Take a screenshot and save to reports folder"""
        path = config.screenshots_dir / f"{name}.png"
        self.page.screenshot(path=str(path), full_page=True)
        return path

    def get_current_url(self) -> str:
        """Get the current page URL"""
        return self.page.url

    def get_page_title(self) -> str:
        """Get the current page title"""
        return self.page.title()

    def is_visible(self, selector: str) -> bool:
        """Check if an element is visible"""
        return self.page.locator(selector).is_visible()

    def is_text_visible(self, text: str) -> bool:
        """Check if text is visible on the page"""
        return self.page.get_by_text(text).is_visible()

    def get_text_content(self, selector: str) -> str:
        """Get text content of an element"""
        return self.page.locator(selector).text_content() or ""

    def count_elements(self, selector: str) -> int:
        """Count number of elements matching selector"""
        return self.page.locator(selector).count()

    # ==================== Common UI Components ====================

    def dismiss_toast(self):
        """Dismiss any visible toast notifications"""
        toast_close = self.page.locator("[role='alert'] button, .toast-close, [aria-label='Close']")
        if toast_close.count() > 0:
            toast_close.first.click()

    def wait_for_toast(self, message: str):
        """Wait for a toast notification with specific message"""
        self.page.get_by_role("alert").filter(has_text=message).wait_for(state="visible")

    def close_modal(self):
        """Close any open modal dialog"""
        # Try various close strategies
        close_button = self.page.locator("[aria-label='Close'], [role='dialog'] button:has-text('Close'), [role='dialog'] button:has-text('Cancel')")
        if close_button.count() > 0:
            close_button.first.click()
        else:
            # Press Escape as fallback
            self.page.keyboard.press("Escape")

    def is_modal_open(self) -> bool:
        """Check if a modal dialog is open"""
        return self.page.locator("[role='dialog']").count() > 0

