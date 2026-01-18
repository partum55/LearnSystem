"""
Dashboard Page Object

Handles all interactions with the main dashboard.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class DashboardPage(BasePage):
    """
    Page object for the Dashboard page (/dashboard).

    Handles:
    - Dashboard widget interactions
    - Navigation to courses, assignments, etc.
    - User greeting verification
    - Quick actions
    """

    # ==================== Selectors ====================

    URL = "/dashboard"

    # Header elements
    DASHBOARD_TITLE = "Dashboard"
    CUSTOMIZE_BUTTON = "Customize"

    # Widgets
    STATS_WIDGET = "[data-widget-type='stats']"
    COURSES_WIDGET = "[data-widget-type='courses']"
    DEADLINES_WIDGET = "[data-widget-type='deadlines']"
    NOTIFICATIONS_WIDGET = "[data-widget-type='notifications']"

    # Navigation sidebar
    SIDEBAR = "[role='navigation']"
    NAV_COURSES = "Courses"
    NAV_ASSIGNMENTS = "Assignments"
    NAV_GRADES = "Grades"
    NAV_CALENDAR = "Calendar"
    NAV_PROFILE = "Profile"

    # User menu
    USER_MENU_BUTTON = "[aria-label='User menu']"
    LOGOUT_BUTTON = "Logout"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self):
        """Navigate to the dashboard"""
        self.page.goto(self.URL)
        self.wait_for_page_load()
        self.wait_for_dashboard_ready()

    def wait_for_dashboard_ready(self):
        """Wait for dashboard to be fully loaded"""
        self.wait_for_loading_complete()
        # Wait for welcome message or dashboard title
        self.page.get_by_text(self.DASHBOARD_TITLE).wait_for(state="visible")

    # ==================== Widget Interactions ====================

    def is_stats_widget_visible(self) -> bool:
        """Check if statistics widget is visible"""
        return self.page.locator(self.STATS_WIDGET).is_visible()

    def is_courses_widget_visible(self) -> bool:
        """Check if courses widget is visible"""
        return self.page.locator(self.COURSES_WIDGET).is_visible()

    def is_deadlines_widget_visible(self) -> bool:
        """Check if deadlines widget is visible"""
        return self.page.locator(self.DEADLINES_WIDGET).is_visible()

    def get_course_count(self) -> int:
        """Get number of courses displayed in widget"""
        courses_widget = self.page.locator(self.COURSES_WIDGET)
        if courses_widget.is_visible():
            # Count course items
            return courses_widget.locator("[data-course-id], .course-card, a[href*='/courses/']").count()
        return 0

    def click_customize_dashboard(self):
        """Click the customize dashboard button"""
        self.page.get_by_role("button", name=self.CUSTOMIZE_BUTTON).click()
        self.wait_for_url_contains("/dashboard/customize")

    def click_first_course(self):
        """Click on the first course in the courses widget"""
        course_links = self.page.locator("a[href*='/courses/']")
        if course_links.count() > 0:
            course_links.first.click()
            self.wait_for_url_contains("/courses/")

    def click_first_deadline(self):
        """Click on the first deadline item"""
        deadline_links = self.page.locator("a[href*='/assignments/']")
        if deadline_links.count() > 0:
            deadline_links.first.click()

    # ==================== Sidebar Navigation ====================

    def navigate_to_courses(self):
        """Navigate to courses list via sidebar"""
        self.page.get_by_role("link", name=self.NAV_COURSES).click()
        self.wait_for_url_contains("/courses")
        self.wait_for_loading_complete()

    def navigate_to_assignments(self):
        """Navigate to assignments via sidebar"""
        self.page.get_by_role("link", name=self.NAV_ASSIGNMENTS).click()
        self.wait_for_url_contains("/assignments")
        self.wait_for_loading_complete()

    def navigate_to_grades(self):
        """Navigate to grades via sidebar"""
        self.page.get_by_role("link", name=self.NAV_GRADES).click()
        self.wait_for_url_contains("/grades")
        self.wait_for_loading_complete()

    def navigate_to_calendar(self):
        """Navigate to calendar via sidebar"""
        self.page.get_by_role("link", name=self.NAV_CALENDAR).click()
        self.wait_for_url_contains("/calendar")
        self.wait_for_loading_complete()

    def navigate_to_profile(self):
        """Navigate to profile via sidebar"""
        self.page.get_by_role("link", name=self.NAV_PROFILE).click()
        self.wait_for_url_contains("/profile")
        self.wait_for_loading_complete()

    # ==================== User Actions ====================

    def get_welcome_message(self) -> str:
        """Get the welcome message displayed"""
        welcome = self.page.get_by_text("Welcome")
        if welcome.is_visible():
            return welcome.text_content() or ""
        return ""

    def logout(self):
        """Log out the current user"""
        # Try user menu first
        user_menu = self.page.locator(self.USER_MENU_BUTTON)
        if user_menu.is_visible():
            user_menu.click()
            self.page.get_by_role("button", name=self.LOGOUT_BUTTON).click()
        else:
            # Try direct logout button/link
            self.page.get_by_role("button", name=self.LOGOUT_BUTTON).click()

        self.wait_for_url_contains("/login")

    def toggle_theme(self):
        """Toggle dark/light theme"""
        theme_toggle = self.page.locator("[aria-label='Toggle theme'], [data-testid='theme-toggle']")
        if theme_toggle.is_visible():
            theme_toggle.click()

    def is_dark_mode(self) -> bool:
        """Check if dark mode is active"""
        return self.page.locator("html.dark").count() > 0

    # ==================== State Checks ====================

    def is_dashboard_page(self) -> bool:
        """Check if currently on dashboard page"""
        return "/dashboard" in self.get_current_url() and "/customize" not in self.get_current_url()

    def has_courses(self) -> bool:
        """Check if user has any courses"""
        return self.get_course_count() > 0

    def has_upcoming_deadlines(self) -> bool:
        """Check if there are upcoming deadlines"""
        deadlines = self.page.locator("a[href*='/assignments/']")
        return deadlines.count() > 0

    # ==================== Assertions ====================

    def assert_on_dashboard(self):
        """Assert we are on the dashboard"""
        self.assert_url_contains("/dashboard")

    def assert_welcome_message_visible(self):
        """Assert welcome message is displayed"""
        expect(self.page.get_by_text("Welcome")).to_be_visible()

    def assert_user_name_displayed(self, name: str):
        """Assert user's name is displayed"""
        expect(self.page.get_by_text(name)).to_be_visible()

    def assert_courses_widget_visible(self):
        """Assert courses widget is visible"""
        expect(self.page.get_by_text("Courses")).to_be_visible()

    def assert_deadlines_widget_visible(self):
        """Assert deadlines widget is visible"""
        expect(self.page.get_by_text("Deadlines")).to_be_visible()

    def assert_no_courses_message(self):
        """Assert empty state message when no courses"""
        expect(self.page.get_by_text("No courses")).to_be_visible()

