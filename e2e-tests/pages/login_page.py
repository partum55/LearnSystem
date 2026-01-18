"""
Login Page Object

Handles all interactions with the login page.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class LoginPage(BasePage):
    """
    Page object for the Login page (/login).

    Handles:
    - User login with email/password
    - Error state validation
    - Redirect to dashboard on success
    - Language switching
    """

    # ==================== Selectors ====================
    # Using accessible selectors (role, label, text) as much as possible

    URL = "/login"

    # Form elements - using labels for accessibility
    EMAIL_INPUT_LABEL = "Email"
    PASSWORD_INPUT_LABEL = "Password"

    # Buttons
    LOGIN_BUTTON_TEXT = "Login"
    REGISTER_LINK_TEXT = "Create Account"

    # Messages
    ERROR_CONTAINER = "[role='alert']"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self):
        """Navigate to the login page"""
        self.page.goto(self.URL)
        self.wait_for_page_load()
        self.wait_for_login_form()

    def wait_for_login_form(self):
        """Wait for login form to be ready"""
        # Wait for email input to be visible
        self.page.get_by_label(self.EMAIL_INPUT_LABEL, exact=False).wait_for(state="visible")

    # ==================== Actions ====================

    def enter_email(self, email: str):
        """Enter email address"""
        email_input = self.page.get_by_label(self.EMAIL_INPUT_LABEL, exact=False)
        email_input.clear()
        email_input.fill(email)

    def enter_password(self, password: str):
        """Enter password"""
        password_input = self.page.get_by_label(self.PASSWORD_INPUT_LABEL, exact=False)
        password_input.clear()
        password_input.fill(password)

    def click_login_button(self):
        """Click the login button"""
        # Find login button by role and text
        login_btn = self.page.get_by_role("button", name=self.LOGIN_BUTTON_TEXT)
        login_btn.click()

    def login(self, email: str, password: str):
        """
        Perform complete login flow.

        Args:
            email: User's email address
            password: User's password
        """
        self.enter_email(email)
        self.enter_password(password)
        self.click_login_button()

    def login_and_wait(self, email: str, password: str):
        """Login and wait for dashboard redirect"""
        self.login(email, password)
        self.wait_for_dashboard()

    def click_register_link(self):
        """Click the link to registration page"""
        self.page.get_by_role("link", name=self.REGISTER_LINK_TEXT).click()
        self.wait_for_url_contains("/register")

    # ==================== Wait Helpers ====================

    def wait_for_dashboard(self):
        """Wait for redirect to dashboard after successful login"""
        self.wait_for_url_contains("/dashboard")
        self.wait_for_loading_complete()

    def wait_for_error(self):
        """Wait for error message to appear"""
        self.page.locator(self.ERROR_CONTAINER).wait_for(state="visible")

    # ==================== State Checks ====================

    def is_login_page(self) -> bool:
        """Check if currently on login page"""
        return "/login" in self.get_current_url()

    def get_error_message(self) -> str:
        """Get the error message text if visible"""
        error = self.page.locator(self.ERROR_CONTAINER)
        if error.is_visible():
            return error.text_content() or ""
        return ""

    def has_error(self) -> bool:
        """Check if an error message is displayed"""
        return self.page.locator(self.ERROR_CONTAINER).is_visible()

    def is_login_button_loading(self) -> bool:
        """Check if login button is in loading state"""
        # Check for loading spinner inside button or disabled state
        button = self.page.get_by_role("button", name=self.LOGIN_BUTTON_TEXT)
        # Button should have isLoading prop which adds spinner
        return button.locator(".animate-spin").count() > 0 or not button.is_enabled()

    def is_login_button_enabled(self) -> bool:
        """Check if login button is enabled"""
        return self.page.get_by_role("button", name=self.LOGIN_BUTTON_TEXT).is_enabled()

    # ==================== Assertions ====================

    def assert_on_login_page(self):
        """Assert we are on the login page"""
        self.assert_url_contains("/login")

    def assert_error_visible(self):
        """Assert error message is visible"""
        expect(self.page.locator(self.ERROR_CONTAINER)).to_be_visible()

    def assert_error_message(self, expected_text: str):
        """Assert error message contains expected text"""
        expect(self.page.locator(self.ERROR_CONTAINER)).to_contain_text(expected_text)

    def assert_no_error(self):
        """Assert no error message is displayed"""
        expect(self.page.locator(self.ERROR_CONTAINER)).not_to_be_visible()

    def assert_email_field_has_value(self, expected_email: str):
        """Assert email field has expected value"""
        expect(self.page.get_by_label(self.EMAIL_INPUT_LABEL, exact=False)).to_have_value(expected_email)

    def assert_login_button_enabled(self):
        """Assert login button is enabled"""
        expect(self.page.get_by_role("button", name=self.LOGIN_BUTTON_TEXT)).to_be_enabled()

    def assert_login_button_disabled(self):
        """Assert login button is disabled"""
        expect(self.page.get_by_role("button", name=self.LOGIN_BUTTON_TEXT)).to_be_disabled()

