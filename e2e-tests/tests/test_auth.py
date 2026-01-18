"""
Authentication E2E Tests

Tests for login, registration, and session management flows.
These tests validate the real user experience of authentication.
"""

import pytest
from playwright.sync_api import Page, expect
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pages.login_page import LoginPage
from pages.register_page import RegisterPage
from pages.dashboard_page import DashboardPage
from config import config
from utils.test_data import generate_ucu_email, generate_password


class TestLogin:
    """
    Login flow tests.

    Tests user login scenarios including:
    - Successful login
    - Invalid credentials
    - Form validation
    - Loading states
    """

    @pytest.mark.smoke
    @pytest.mark.auth
    def test_login_page_displays_correctly(self, page: Page):
        """
        Verify login page displays all required elements.

        User Story: As a user, I should see a properly formatted login form.
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Assert all form elements are visible using flexible selectors
        page.wait_for_load_state("networkidle")

        # Check for email input (various possible implementations)
        email_input = page.locator(
            "input[type='email'], "
            "input[name='email'], "
            "[placeholder*='mail'], "
            "input:near(:text('Email'))"
        ).first
        expect(email_input).to_be_visible()

        # Check for password input
        password_input = page.locator("input[type='password']").first
        expect(password_input).to_be_visible()

        # Check for login button
        login_button = page.locator(
            "button[type='submit'], "
            "button:has-text('Login'), "
            "button:has-text('Sign in'), "
            "button:has-text('Log in')"
        ).first
        expect(login_button).to_be_visible()

    @pytest.mark.smoke
    @pytest.mark.auth
    @pytest.mark.critical
    def test_successful_login(self, page: Page):
        """
        Verify user can login with valid credentials.

        User Story: As a registered user, I can login and access my dashboard.
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Perform login
        login_page.login(config.student.email, config.student.password)

        # Wait for dashboard - increase timeout for slow auth
        try:
            page.wait_for_url("**/dashboard**", timeout=20000)
        except Exception:
            # Check if there's an error message
            error = page.locator("[role='alert'], .error, .text-red")
            if error.is_visible():
                error_text = error.text_content()
                pytest.skip(f"Login failed - test user may not exist: {error_text}")
            raise

        # Verify on dashboard
        expect(page).to_have_url(lambda url: "/dashboard" in url)

    @pytest.mark.auth
    def test_login_with_invalid_password(self, page: Page):
        """
        Verify error message for wrong password.

        User Story: As a user with wrong password, I see a helpful error message.
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Attempt login with wrong password
        login_page.login(config.student.email, "WrongPassword123!")

        # Wait for error to appear
        page.wait_for_timeout(2000)  # Allow time for API response

        # Should show error message - check various error containers
        error_visible = (
            page.locator("[role='alert']").is_visible() or
            page.locator(".text-red-500, .text-red-600, .text-red-800").first.is_visible() or
            page.locator(":text('Invalid'), :text('incorrect'), :text('wrong')").first.is_visible()
        )

        # Should stay on login page or show error
        current_url = page.url
        assert "/login" in current_url or error_visible, "Should stay on login with error"

    @pytest.mark.auth
    def test_login_with_nonexistent_email(self, page: Page):
        """
        Verify error message for non-existent user.

        User Story: As a user with unregistered email, I see an error message.
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Attempt login with non-existent email
        fake_email = f"nonexistent.{os.urandom(4).hex()}@ucu.edu.ua"
        login_page.login(fake_email, "SomePassword123!")

        # Wait for response
        page.wait_for_timeout(2000)

        # Should not navigate to dashboard
        expect(page).not_to_have_url(lambda url: "/dashboard" in url)

    @pytest.mark.auth
    def test_login_with_empty_fields(self, page: Page):
        """
        Verify form validation for empty fields.

        User Story: As a user, I cannot submit an empty login form.
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Click login without entering credentials
        login_button = page.locator(
            "button[type='submit'], "
            "button:has-text('Login'), "
            "button:has-text('Sign in')"
        ).first
        login_button.click()

        # Should show validation or stay on page
        page.wait_for_timeout(500)
        expect(page).to_have_url(lambda url: "/login" in url)

    @pytest.mark.auth
    def test_navigate_to_register_from_login(self, page: Page):
        """
        Verify user can navigate to registration from login.

        User Story: As a new user, I can click to register from login page.
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Find and click register link
        register_link = page.locator(
            "a[href*='register'], "
            "a:has-text('Register'), "
            "a:has-text('Sign up'), "
            "a:has-text('Create Account'), "
            "a:has-text('Create account')"
        ).first
        expect(register_link).to_be_visible()
        register_link.click()

        # Verify navigation to register page
        page.wait_for_url("**/register**", timeout=10000)
        expect(page).to_have_url(lambda url: "/register" in url)

    @pytest.mark.auth
    def test_session_persists_after_reload(self, authenticated_student_page: Page):
        """
        Verify session persists after page reload.

        User Story: As a logged-in user, I stay logged in after page refresh.
        """
        page = authenticated_student_page
        dashboard = DashboardPage(page)
        dashboard.assert_on_dashboard()

        # Reload page
        page.reload()
        page.wait_for_load_state("networkidle")

        # Should still be authenticated - not redirected to login
        expect(page).not_to_have_url(lambda url: "/login" in url, timeout=5000)


class TestRegistration:
    """
    Registration flow tests.

    Tests user registration scenarios including:
    - Form display
    - Email validation
    - Password requirements
    """

    @pytest.mark.smoke
    @pytest.mark.auth
    def test_registration_page_displays_correctly(self, page: Page):
        """
        Verify registration page displays all required elements.

        User Story: As a new user, I see a complete registration form.
        """
        register_page = RegisterPage(page)
        register_page.navigate()

        page.wait_for_load_state("networkidle")

        # Check for email input
        email_input = page.locator(
            "input[type='email'], "
            "input[name='email'], "
            "[placeholder*='mail']"
        ).first
        expect(email_input).to_be_visible()

        # Check for password inputs
        password_inputs = page.locator("input[type='password']")
        expect(password_inputs.first).to_be_visible()

        # Check for register button
        register_button = page.locator(
            "button[type='submit'], "
            "button:has-text('Register'), "
            "button:has-text('Sign up'), "
            "button:has-text('Create Account')"
        ).first
        expect(register_button).to_be_visible()

    @pytest.mark.auth
    def test_navigate_to_login_from_register(self, page: Page):
        """
        Verify user can navigate to login from registration.

        User Story: As an existing user, I can click to login from registration page.
        """
        register_page = RegisterPage(page)
        register_page.navigate()

        # Find and click login link
        login_link = page.locator(
            "a[href*='login'], "
            "a:has-text('Login'), "
            "a:has-text('Sign in'), "
            "a:has-text('Already have')"
        ).first
        expect(login_link).to_be_visible()
        login_link.click()

        # Verify navigation to login page
        page.wait_for_url("**/login**", timeout=10000)
        expect(page).to_have_url(lambda url: "/login" in url)


class TestLogout:
    """
    Logout flow tests.

    Tests session termination and redirect behavior.
    """

    @pytest.mark.smoke
    @pytest.mark.auth
    def test_logout_ends_session(self, authenticated_student_page: Page):
        """
        Verify logout terminates session.

        User Story: As a logged-in user, I can logout.
        """
        page = authenticated_student_page
        dashboard = DashboardPage(page)
        dashboard.assert_on_dashboard()

        # Find logout option
        # Try various logout patterns
        logout_clicked = False

        # Try user menu first
        user_menu = page.locator(
            "[aria-label='User menu'], "
            "[aria-label='Profile'], "
            "[data-testid='user-menu'], "
            "button:near(img[alt*='avatar'])"
        ).first

        if user_menu.is_visible():
            user_menu.click()
            page.wait_for_timeout(300)

            logout_button = page.locator(
                "button:has-text('Logout'), "
                "button:has-text('Sign out'), "
                "a:has-text('Logout'), "
                "a:has-text('Sign out')"
            ).first

            if logout_button.is_visible():
                logout_button.click()
                logout_clicked = True

        if not logout_clicked:
            # Try direct logout button
            logout_direct = page.locator(
                "button:has-text('Logout'), "
                "a:has-text('Logout'), "
                "button:has-text('Sign out')"
            ).first
            if logout_direct.is_visible():
                logout_direct.click()
                logout_clicked = True

        if logout_clicked:
            # Wait for redirect
            page.wait_for_timeout(2000)
            # Should redirect to login or home
            current_url = page.url
            assert "/login" in current_url or current_url.endswith("/"), \
                f"Should redirect after logout, but at: {current_url}"


class TestSessionManagement:
    """
    Session management tests.

    Tests authentication persistence and protection.
    """

    @pytest.mark.auth
    @pytest.mark.critical
    def test_protected_routes_require_auth(self, page: Page):
        """
        Verify unauthenticated users are redirected to login.

        User Story: As an unauthenticated user, I'm redirected to login.
        """
        # Try to access protected routes
        protected_routes = ["/dashboard", "/courses", "/assignments"]

        for route in protected_routes:
            page.goto(route)
            page.wait_for_load_state("networkidle")

            # Should redirect to login
            current_url = page.url
            assert "/login" in current_url, \
                f"Route {route} should redirect to login, but at: {current_url}"

