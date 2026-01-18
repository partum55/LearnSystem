"""
Registration Page Object

Handles all interactions with the registration page.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class RegisterPage(BasePage):
    """
    Page object for the Registration page (/register).

    Handles:
    - New user registration
    - Form validation
    - UCU email domain validation
    - Role selection (Student/Teacher)
    """

    # ==================== Selectors ====================

    URL = "/register"

    # Form labels
    EMAIL_LABEL = "Email"
    PASSWORD_LABEL = "Password"
    CONFIRM_PASSWORD_LABEL = "Confirm"  # Partial match
    DISPLAY_NAME_LABEL = "Name"  # Partial match

    # Role selection
    ROLE_STUDENT = "Student"
    ROLE_TEACHER = "Teacher"

    # Buttons
    REGISTER_BUTTON_TEXT = "Create Account"
    LOGIN_LINK_TEXT = "Login"

    # Error container
    ERROR_CONTAINER = "[role='alert']"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self):
        """Navigate to the registration page"""
        self.page.goto(self.URL)
        self.wait_for_page_load()
        self.wait_for_registration_form()

    def wait_for_registration_form(self):
        """Wait for registration form to be ready"""
        self.page.get_by_label(self.EMAIL_LABEL, exact=False).wait_for(state="visible")

    # ==================== Actions ====================

    def enter_email(self, email: str):
        """Enter email address"""
        self.page.get_by_label(self.EMAIL_LABEL, exact=False).fill(email)

    def enter_password(self, password: str):
        """Enter password"""
        # Get the first password field (not confirm)
        password_inputs = self.page.get_by_label(self.PASSWORD_LABEL, exact=False)
        password_inputs.first.fill(password)

    def enter_confirm_password(self, password: str):
        """Enter password confirmation"""
        self.page.get_by_label(self.CONFIRM_PASSWORD_LABEL, exact=False).fill(password)

    def enter_display_name(self, name: str):
        """Enter display name"""
        self.page.get_by_label(self.DISPLAY_NAME_LABEL, exact=False).fill(name)

    def select_role_student(self):
        """Select Student role"""
        # Look for radio button or select option
        student_option = self.page.get_by_label(self.ROLE_STUDENT, exact=False)
        if student_option.count() > 0:
            student_option.click()
        else:
            # Try dropdown
            self.page.locator("select").select_option(label=self.ROLE_STUDENT)

    def select_role_teacher(self):
        """Select Teacher role"""
        teacher_option = self.page.get_by_label(self.ROLE_TEACHER, exact=False)
        if teacher_option.count() > 0:
            teacher_option.click()
        else:
            self.page.locator("select").select_option(label=self.ROLE_TEACHER)

    def click_register_button(self):
        """Click the register button"""
        self.page.get_by_role("button", name=self.REGISTER_BUTTON_TEXT).click()

    def register_student(self, email: str, password: str, name: str):
        """
        Complete registration flow for a student.

        Args:
            email: Must be @ucu.edu.ua email
            password: At least 8 characters
            name: Display name
        """
        self.enter_email(email)
        self.enter_display_name(name)
        self.enter_password(password)
        self.enter_confirm_password(password)
        self.select_role_student()
        self.click_register_button()

    def register_teacher(self, email: str, password: str, name: str):
        """
        Complete registration flow for a teacher.

        Args:
            email: Must be @ucu.edu.ua email
            password: At least 8 characters
            name: Display name
        """
        self.enter_email(email)
        self.enter_display_name(name)
        self.enter_password(password)
        self.enter_confirm_password(password)
        self.select_role_teacher()
        self.click_register_button()

    def click_login_link(self):
        """Click the link to login page"""
        self.page.get_by_role("link", name=self.LOGIN_LINK_TEXT).click()
        self.wait_for_url_contains("/login")

    # ==================== Wait Helpers ====================

    def wait_for_success_redirect(self):
        """Wait for redirect to login page after successful registration"""
        self.wait_for_url_contains("/login")

    def wait_for_error(self):
        """Wait for error message to appear"""
        self.page.locator(self.ERROR_CONTAINER).wait_for(state="visible")

    # ==================== State Checks ====================

    def is_register_page(self) -> bool:
        """Check if currently on registration page"""
        return "/register" in self.get_current_url()

    def get_error_message(self) -> str:
        """Get the error message text if visible"""
        error = self.page.locator(self.ERROR_CONTAINER)
        if error.is_visible():
            return error.text_content() or ""
        return ""

    def has_error(self) -> bool:
        """Check if an error message is displayed"""
        return self.page.locator(self.ERROR_CONTAINER).is_visible()

    def is_register_button_loading(self) -> bool:
        """Check if register button is in loading state"""
        button = self.page.get_by_role("button", name=self.REGISTER_BUTTON_TEXT)
        return button.locator(".animate-spin").count() > 0

    # ==================== Assertions ====================

    def assert_on_register_page(self):
        """Assert we are on the registration page"""
        self.assert_url_contains("/register")

    def assert_error_visible(self):
        """Assert error message is visible"""
        expect(self.page.locator(self.ERROR_CONTAINER)).to_be_visible()

    def assert_error_message(self, expected_text: str):
        """Assert error message contains expected text"""
        expect(self.page.locator(self.ERROR_CONTAINER)).to_contain_text(expected_text)

    def assert_no_error(self):
        """Assert no error message is displayed"""
        expect(self.page.locator(self.ERROR_CONTAINER)).not_to_be_visible()

    def assert_ucu_email_error(self):
        """Assert UCU email validation error is shown"""
        # Error should mention @ucu.edu.ua
        expect(self.page.locator(self.ERROR_CONTAINER)).to_contain_text("ucu.edu.ua")

    def assert_password_mismatch_error(self):
        """Assert password mismatch error is shown"""
        expect(self.page.locator(self.ERROR_CONTAINER)).to_be_visible()

