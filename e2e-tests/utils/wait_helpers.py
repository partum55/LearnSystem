"""
Waiting Utilities

Advanced waiting strategies for handling async UI behavior.
"""

from playwright.sync_api import Page, Locator
from typing import Callable, Optional
import time


class WaitHelpers:
    """
    Advanced waiting utilities for E2E tests.

    Provides robust waiting strategies to avoid flaky tests.
    """

    def __init__(self, page: Page, default_timeout: int = 30000):
        self.page = page
        self.default_timeout = default_timeout

    def wait_for_network_idle(self, timeout: Optional[int] = None):
        """Wait for all network requests to complete"""
        self.page.wait_for_load_state(
            "networkidle",
            timeout=timeout or self.default_timeout
        )

    def wait_for_dom_stable(self, timeout: Optional[int] = None):
        """Wait for DOM to be fully loaded"""
        self.page.wait_for_load_state(
            "domcontentloaded",
            timeout=timeout or self.default_timeout
        )

    def wait_for_condition(
        self,
        condition: Callable[[], bool],
        timeout: int = 10000,
        poll_interval: int = 100,
        message: str = "Condition not met"
    ):
        """
        Wait for a custom condition to be true.

        Args:
            condition: Callable that returns True when condition is met
            timeout: Maximum time to wait in ms
            poll_interval: How often to check in ms
            message: Error message if timeout
        """
        start_time = time.time()
        timeout_seconds = timeout / 1000

        while time.time() - start_time < timeout_seconds:
            try:
                if condition():
                    return True
            except Exception:
                pass
            time.sleep(poll_interval / 1000)

        raise TimeoutError(f"Timeout after {timeout}ms: {message}")

    def wait_for_text_to_appear(
        self,
        text: str,
        timeout: Optional[int] = None
    ) -> Locator:
        """Wait for specific text to appear on page"""
        locator = self.page.get_by_text(text)
        locator.wait_for(
            state="visible",
            timeout=timeout or self.default_timeout
        )
        return locator

    def wait_for_text_to_disappear(
        self,
        text: str,
        timeout: Optional[int] = None
    ):
        """Wait for specific text to disappear from page"""
        locator = self.page.get_by_text(text)
        locator.wait_for(
            state="hidden",
            timeout=timeout or self.default_timeout
        )

    def wait_for_element_count(
        self,
        selector: str,
        expected_count: int,
        timeout: int = 10000
    ):
        """Wait for specific number of elements to exist"""
        def check_count():
            return self.page.locator(selector).count() == expected_count

        self.wait_for_condition(
            check_count,
            timeout=timeout,
            message=f"Expected {expected_count} elements matching '{selector}'"
        )

    def wait_for_element_count_greater_than(
        self,
        selector: str,
        min_count: int,
        timeout: int = 10000
    ):
        """Wait for at least N elements to exist"""
        def check_count():
            return self.page.locator(selector).count() > min_count

        self.wait_for_condition(
            check_count,
            timeout=timeout,
            message=f"Expected more than {min_count} elements matching '{selector}'"
        )

    def wait_for_loading_spinner_to_disappear(
        self,
        spinner_selectors: Optional[list] = None,
        timeout: Optional[int] = None
    ):
        """
        Wait for common loading spinners to disappear.

        Args:
            spinner_selectors: Custom spinner selectors to check
            timeout: Custom timeout
        """
        selectors = spinner_selectors or [
            ".animate-spin",
            "[aria-label='Loading']",
            "[data-testid='loading']",
            ".loading-spinner",
            ".skeleton",
        ]

        for selector in selectors:
            locator = self.page.locator(selector)
            if locator.count() > 0:
                locator.first.wait_for(
                    state="hidden",
                    timeout=timeout or self.default_timeout
                )

    def wait_for_toast_message(
        self,
        message: str,
        timeout: Optional[int] = None
    ) -> Locator:
        """Wait for a toast notification with specific message"""
        toast = self.page.locator("[role='alert'], .toast, .notification")
        toast.filter(has_text=message).wait_for(
            state="visible",
            timeout=timeout or self.default_timeout
        )
        return toast

    def wait_for_modal_to_open(self, timeout: Optional[int] = None):
        """Wait for a modal dialog to open"""
        self.page.locator("[role='dialog'], .modal").wait_for(
            state="visible",
            timeout=timeout or self.default_timeout
        )

    def wait_for_modal_to_close(self, timeout: Optional[int] = None):
        """Wait for all modal dialogs to close"""
        self.page.locator("[role='dialog'], .modal").wait_for(
            state="hidden",
            timeout=timeout or self.default_timeout
        )

    def wait_for_url_change(
        self,
        original_url: str,
        timeout: int = 10000
    ):
        """Wait for URL to change from original"""
        def url_changed():
            return self.page.url != original_url

        self.wait_for_condition(
            url_changed,
            timeout=timeout,
            message=f"URL did not change from {original_url}"
        )

    def wait_for_form_submission(self, timeout: int = 30000):
        """Wait for form submission to complete (network + loading)"""
        self.wait_for_loading_spinner_to_disappear(timeout=timeout)
        self.wait_for_network_idle(timeout=timeout)

    def wait_for_api_response(
        self,
        url_pattern: str,
        timeout: Optional[int] = None
    ):
        """
        Wait for a specific API call to complete.

        Args:
            url_pattern: Pattern to match API URL (e.g., "**/api/courses*")
        """
        with self.page.expect_response(
            url_pattern,
            timeout=timeout or self.default_timeout
        ) as response_info:
            pass
        return response_info.value

    def retry_on_failure(
        self,
        action: Callable,
        max_retries: int = 3,
        delay_ms: int = 1000
    ):
        """
        Retry an action on failure.

        Args:
            action: Callable to execute
            max_retries: Maximum number of retry attempts
            delay_ms: Delay between retries in milliseconds
        """
        last_error = None
        for attempt in range(max_retries):
            try:
                return action()
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    time.sleep(delay_ms / 1000)

        raise last_error


def wait_for(page: Page) -> WaitHelpers:
    """Factory function to create WaitHelpers instance"""
    return WaitHelpers(page)

