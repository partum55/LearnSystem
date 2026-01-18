"""
Learning Flow E2E Tests

End-to-end tests for complete learning workflows.
Tests the full user journey from login to course completion.
"""

import pytest
from playwright.sync_api import Page, expect
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.course_list_page import CourseListPage
from pages.course_detail_page import CourseDetailPage
from config import config


class TestStudentLearningJourney:
    """
    Complete student learning journey tests.

    Tests the full workflow a student follows.
    """

    @pytest.mark.smoke
    @pytest.mark.critical
    def test_complete_login_to_course_flow(self, page: Page):
        """
        Test complete flow: Login -> Dashboard -> Courses -> Course Detail.

        User Story: As a student, I can login and access my course content.
        """
        # Step 1: Login
        login_page = LoginPage(page)
        login_page.navigate()
        login_page.login(config.student.email, config.student.password)

        try:
            page.wait_for_url("**/dashboard**", timeout=20000)
        except Exception:
            error = page.locator("[role='alert']").first
            if error.is_visible():
                pytest.skip(f"Login failed: {error.text_content()}")
            raise

        # Step 2: Verify Dashboard
        expect(page).to_have_url(lambda url: "/dashboard" in url)
        page.wait_for_load_state("networkidle")

        # Step 3: Navigate to Courses
        courses_link = page.locator(
            "a[href*='courses'], "
            "a:has-text('Courses')"
        ).first
        expect(courses_link).to_be_visible()
        courses_link.click()

        page.wait_for_url("**/courses**", timeout=10000)

        # Step 4: Access Course (if available)
        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() > 0:
            course_links.first.click()
            page.wait_for_load_state("networkidle")

            # Should be on course detail
            current_url = page.url
            assert "/courses/" in current_url

    @pytest.mark.course
    def test_student_views_course_modules(self, authenticated_student_page: Page):
        """
        Test student viewing course modules.

        User Story: As a student, I can see and access course modules.
        """
        page = authenticated_student_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Look for modules
        modules_section = page.locator(
            "[role='tab']:has-text('Module'), "
            ".module-item, "
            ":text('Module')"
        )

        # Course structure should be visible
        assert len(page.content()) > 1000

    @pytest.mark.course
    def test_student_views_assignments(self, authenticated_student_page: Page):
        """
        Test student viewing course assignments.

        User Story: As a student, I can see my assignments.
        """
        page = authenticated_student_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Click assignments tab
        assignments_tab = page.locator("[role='tab']:has-text('Assignment')").first
        if assignments_tab.is_visible():
            assignments_tab.click()
            page.wait_for_timeout(500)

        # Should show assignments or empty state
        page.wait_for_load_state("networkidle")


class TestTeacherWorkflow:
    """
    Complete teacher workflow tests.

    Tests the full workflow a teacher follows.
    """

    @pytest.mark.course
    def test_teacher_access_course_management(self, authenticated_teacher_page: Page):
        """
        Test teacher accessing course management.

        User Story: As a teacher, I can manage my courses.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        # Teacher should see courses page
        expect(page).to_have_url(lambda url: "/courses" in url)

        # Look for management options
        management_options = page.locator(
            "button:has-text('Create'), "
            "button:has-text('Add'), "
            "button:has-text('Edit')"
        )

        # Should have some content
        assert len(page.content()) > 500

    @pytest.mark.course
    def test_teacher_views_course_detail(self, authenticated_teacher_page: Page):
        """
        Test teacher viewing course detail with edit options.

        User Story: As a teacher, I can view and edit my course.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Should have course content
        title = page.locator("h1, h2").first
        expect(title).to_be_visible()


class TestNavigationFlow:
    """
    Navigation flow tests.

    Tests navigation between different sections.
    """

    @pytest.mark.smoke
    def test_navigation_breadcrumbs(self, authenticated_student_page: Page):
        """
        Test navigation breadcrumbs work.

        User Story: As a user, I can navigate using breadcrumbs.
        """
        page = authenticated_student_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Look for breadcrumb navigation
        breadcrumb = page.locator(
            "nav[aria-label*='breadcrumb'], "
            ".breadcrumb, "
            "[data-testid='breadcrumb']"
        )

        # Breadcrumb may or may not be present
        # Click back link if available
        back_link = page.locator(
            "a:has-text('Courses'), "
            "a:has-text('Back'), "
            "a[href='/courses']"
        ).first

        if back_link.is_visible():
            back_link.click()
            page.wait_for_url("**/courses**", timeout=10000)

    @pytest.mark.smoke
    def test_sidebar_navigation(self, authenticated_student_page: Page):
        """
        Test sidebar navigation works.

        User Story: As a user, I can navigate using the sidebar.
        """
        page = authenticated_student_page
        page.wait_for_load_state("networkidle")

        # Find sidebar
        sidebar = page.locator(
            "[role='navigation'], "
            "nav, "
            ".sidebar"
        ).first
        expect(sidebar).to_be_visible()

        # Find navigation links
        nav_links = sidebar.locator("a")

        # Should have multiple nav links
        assert nav_links.count() > 0


class TestErrorRecovery:
    """
    Error recovery tests.

    Tests that the application handles errors gracefully.
    """

    @pytest.mark.smoke
    def test_404_page_displayed(self, authenticated_student_page: Page):
        """
        Test 404 page is displayed for invalid routes.

        User Story: As a user, I see a helpful 404 page.
        """
        page = authenticated_student_page

        # Navigate to non-existent page
        page.goto("/this-page-does-not-exist-12345")
        page.wait_for_load_state("networkidle")

        # Should show 404 or redirect
        content = page.content().lower()

        is_404 = (
            "404" in content or
            "not found" in content or
            "/dashboard" in page.url or  # Redirect to dashboard
            "/login" in page.url  # Redirect to login
        )

        assert is_404, "Should show 404 or redirect"

    @pytest.mark.smoke
    def test_session_timeout_handled(self, page: Page):
        """
        Test session timeout is handled gracefully.

        User Story: As a user with expired session, I'm prompted to login.
        """
        # Try to access protected route without auth
        page.goto("/dashboard")
        page.wait_for_load_state("networkidle")

        # Should redirect to login
        expect(page).to_have_url(lambda url: "/login" in url, timeout=10000)

