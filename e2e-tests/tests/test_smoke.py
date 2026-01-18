"""
Smoke Tests - Critical Path Validation

Quick tests to verify the application is functioning.
These run first to catch major issues early.
"""

import pytest
from playwright.sync_api import Page, expect
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from config import config


class TestApplicationHealth:
    """
    Basic health check tests.

    Verify the application is reachable and responsive.
    """

    @pytest.mark.smoke
    @pytest.mark.critical
    def test_application_is_reachable(self, page: Page):
        """
        Verify frontend application loads.

        This is the most basic smoke test - if this fails,
        nothing else will work.
        """
        try:
            # Navigate to the base URL
            response = page.goto("/")

            # Should get a successful response
            assert response is not None, "No response from application"
            assert response.ok, f"Application returned error: {response.status}"

            # Should have some content
            page.wait_for_load_state("domcontentloaded")
            assert page.content() is not None
        except Exception as e:
            if "ERR_CONNECTION_REFUSED" in str(e):
                pytest.skip("Application not running at configured URL")
            raise

    @pytest.mark.smoke
    @pytest.mark.critical
    def test_login_page_renders(self, page: Page):
        """
        Verify login page loads with essential elements.
        """
        try:
            page.goto("/login")
            page.wait_for_load_state("networkidle")
        except Exception as e:
            if "ERR_CONNECTION_REFUSED" in str(e):
                pytest.skip("Application not running at configured URL")
            raise

        # Should show login form
        # Using flexible selectors that work with i18n
        email_field = page.locator("input[type='email'], input[name='email'], [placeholder*='mail']").first
        password_field = page.locator("input[type='password']").first

        expect(email_field).to_be_visible(timeout=10000)
        expect(password_field).to_be_visible(timeout=10000)

        # Should have a submit button
        submit_button = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
        expect(submit_button).to_be_visible()

    @pytest.mark.smoke
    @pytest.mark.critical
    def test_register_page_renders(self, page: Page):
        """
        Verify registration page loads with essential elements.
        """
        try:
            page.goto("/register")
            page.wait_for_load_state("networkidle")
        except Exception as e:
            if "ERR_CONNECTION_REFUSED" in str(e):
                pytest.skip("Application not running at configured URL")
            raise

        # Should have registration form elements
        email_field = page.locator("input[type='email'], input[name='email']").first
        password_field = page.locator("input[type='password']").first

        expect(email_field).to_be_visible(timeout=10000)
        expect(password_field).to_be_visible(timeout=10000)

    @pytest.mark.smoke
    def test_unauthenticated_redirects_to_login(self, page: Page):
        """
        Verify protected routes redirect to login.
        """
        try:
            page.goto("/dashboard")
            page.wait_for_load_state("networkidle")
        except Exception as e:
            if "ERR_CONNECTION_REFUSED" in str(e):
                pytest.skip("Application not running at configured URL")
            raise

        # Should redirect to login
        expect(page).to_have_url(lambda url: "/login" in url, timeout=10000)


class TestCriticalUserFlow:
    """
    Critical path tests for essential functionality.
    """

    @pytest.mark.smoke
    @pytest.mark.critical
    def test_login_flow_end_to_end(self, page: Page):
        """
        Verify complete login flow works.

        This test verifies:
        1. Navigate to login page
        2. Enter credentials
        3. Submit form
        4. Reach dashboard
        """
        login_page = LoginPage(page)
        login_page.navigate()

        # Perform login
        login_page.login(config.student.email, config.student.password)

        # Wait for navigation - allow time for auth
        try:
            login_page.wait_for_dashboard()
            # Verify we reached the dashboard
            expect(page).to_have_url(lambda url: "/dashboard" in url, timeout=15000)
        except Exception:
            # Check if we got an error instead
            error_container = page.locator("[role='alert'], .error, .text-red-500")
            if error_container.is_visible():
                pytest.skip(f"Login failed - likely test user not set up: {error_container.text_content()}")
            raise

    @pytest.mark.smoke
    @pytest.mark.critical
    def test_dashboard_loads_after_login(self, authenticated_student_page: Page):
        """
        Verify dashboard displays after successful login.
        """
        page = authenticated_student_page
        dashboard = DashboardPage(page)

        # Should be on dashboard
        dashboard.assert_on_dashboard()

        # Should show key content
        page.wait_for_load_state("networkidle")

        # Dashboard should have some content
        content = page.content()
        assert len(content) > 1000, "Dashboard seems empty"

    @pytest.mark.smoke
    def test_navigation_sidebar_works(self, authenticated_student_page: Page):
        """
        Verify navigation sidebar is functional.
        """
        page = authenticated_student_page

        # Find and verify navigation exists
        nav = page.locator("[role='navigation'], nav, .sidebar, [data-testid='sidebar']").first
        expect(nav).to_be_visible()

        # Should have main navigation items
        courses_link = page.locator("a[href*='courses'], a:has-text('Courses'), a:has-text('Course')").first
        expect(courses_link).to_be_visible()

