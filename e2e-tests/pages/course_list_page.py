"""
Course List Page Object

Handles all interactions with the courses listing page.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class CourseListPage(BasePage):
    """
    Page object for the Course List page (/courses).

    Handles:
    - Viewing course list
    - Course search and filtering
    - Creating new courses (teacher only)
    - Navigating to course details
    """

    # ==================== Selectors ====================

    URL = "/courses"

    # Page elements
    PAGE_TITLE = "Courses"
    CREATE_COURSE_BUTTON = "Create Course"
    AI_GENERATE_BUTTON = "Generate with AI"
    SEARCH_INPUT = "[placeholder*='Search']"

    # Course cards
    COURSE_CARD = ".course-card, [data-testid='course-card']"
    COURSE_TITLE = "[data-testid='course-title']"

    # Empty state
    NO_COURSES_MESSAGE = "No courses"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self):
        """Navigate to courses list"""
        self.page.goto(self.URL)
        self.wait_for_page_load()
        self.wait_for_courses_loaded()

    def wait_for_courses_loaded(self):
        """Wait for courses list to load"""
        self.wait_for_loading_complete()
        # Either courses are shown or empty state message
        self.page.locator(f"{self.COURSE_CARD}, :text('{self.NO_COURSES_MESSAGE}')").first.wait_for(
            state="visible",
            timeout=self.config.timeouts.default
        )

    # ==================== Actions ====================

    def search_courses(self, query: str):
        """Search for courses"""
        search_input = self.page.locator(self.SEARCH_INPUT)
        search_input.fill(query)
        # Wait for search results to update
        self.page.wait_for_timeout(500)  # Debounce delay
        self.wait_for_loading_complete()

    def clear_search(self):
        """Clear search input"""
        search_input = self.page.locator(self.SEARCH_INPUT)
        search_input.clear()
        self.wait_for_loading_complete()

    def click_create_course(self):
        """Click create course button (teacher only)"""
        self.page.get_by_role("button", name=self.CREATE_COURSE_BUTTON).click()
        self.wait_for_url_contains("/courses/create")

    def click_ai_generate(self):
        """Click AI generate button"""
        ai_button = self.page.get_by_role("button", name=self.AI_GENERATE_BUTTON)
        if ai_button.is_visible():
            ai_button.click()
            # Wait for AI modal to open
            self.page.locator("[role='dialog']").wait_for(state="visible")

    def click_course_by_title(self, title: str):
        """Click on a course by its title"""
        self.page.get_by_text(title).click()
        self.wait_for_url_contains("/courses/")
        self.wait_for_loading_complete()

    def click_course_by_index(self, index: int = 0):
        """Click on a course by its position in the list"""
        courses = self.page.locator(self.COURSE_CARD)
        if courses.count() > index:
            courses.nth(index).click()
            self.wait_for_url_contains("/courses/")
            self.wait_for_loading_complete()

    # ==================== State Checks ====================

    def get_course_count(self) -> int:
        """Get the number of courses displayed"""
        return self.page.locator(self.COURSE_CARD).count()

    def get_course_titles(self) -> list[str]:
        """Get all course titles displayed"""
        titles = []
        course_cards = self.page.locator(self.COURSE_CARD)
        for i in range(course_cards.count()):
            card = course_cards.nth(i)
            # Get title from card
            title_elem = card.locator("h2, h3, [data-testid='course-title']").first
            if title_elem.is_visible():
                titles.append(title_elem.text_content() or "")
        return titles

    def has_course(self, title: str) -> bool:
        """Check if a course with given title exists"""
        return self.page.get_by_text(title).is_visible()

    def is_empty(self) -> bool:
        """Check if course list is empty"""
        return self.page.get_by_text(self.NO_COURSES_MESSAGE).is_visible()

    def is_create_course_visible(self) -> bool:
        """Check if create course button is visible (teacher feature)"""
        return self.page.get_by_role("button", name=self.CREATE_COURSE_BUTTON).is_visible()

    def is_ai_generate_visible(self) -> bool:
        """Check if AI generate button is visible"""
        return self.page.get_by_role("button", name=self.AI_GENERATE_BUTTON).is_visible()

    # ==================== Assertions ====================

    def assert_on_courses_page(self):
        """Assert we are on the courses page"""
        self.assert_url_contains("/courses")

    def assert_course_visible(self, title: str):
        """Assert a specific course is visible"""
        expect(self.page.get_by_text(title)).to_be_visible()

    def assert_course_not_visible(self, title: str):
        """Assert a specific course is not visible"""
        expect(self.page.get_by_text(title)).not_to_be_visible()

    def assert_courses_displayed(self):
        """Assert at least one course is displayed"""
        expect(self.page.locator(self.COURSE_CARD).first).to_be_visible()

    def assert_no_courses(self):
        """Assert empty state is shown"""
        expect(self.page.get_by_text(self.NO_COURSES_MESSAGE)).to_be_visible()

    def assert_course_count(self, expected_count: int):
        """Assert specific number of courses"""
        expect(self.page.locator(self.COURSE_CARD)).to_have_count(expected_count)

    def assert_search_results_contain(self, text: str):
        """Assert search results contain expected text"""
        courses = self.page.locator(self.COURSE_CARD)
        expect(courses.filter(has_text=text).first).to_be_visible()

