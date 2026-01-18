"""
Course Detail Page Object

Handles all interactions with a course's detail page.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class CourseDetailPage(BasePage):
    """
    Page object for the Course Detail page (/courses/:id).

    Handles:
    - Viewing course information
    - Navigating between tabs (Modules, Assignments, Members, Grades)
    - Module interactions
    - Assignment list viewing
    - Teacher-specific actions (edit, AI generation)
    """

    # ==================== Selectors ====================

    # Tabs
    TAB_MODULES = "Modules"
    TAB_ASSIGNMENTS = "Assignments"
    TAB_MEMBERS = "Members"
    TAB_GRADES = "Grades"

    # Course info
    COURSE_TITLE = "h1"
    COURSE_DESCRIPTION = "[data-testid='course-description']"

    # Module elements
    MODULE_ITEM = "[data-testid='module-item'], .module-item"
    MODULE_TITLE = "[data-testid='module-title']"
    ADD_MODULE_BUTTON = "Add Module"

    # Assignment elements
    ASSIGNMENT_ITEM = "[data-testid='assignment-item'], .assignment-item"
    ADD_ASSIGNMENT_BUTTON = "Add Assignment"

    # AI Features
    AI_ASSISTANT_BUTTON = "AI Assistant"
    AI_GENERATE_MODULES = "Generate Modules"
    AI_GENERATE_ASSIGNMENTS = "Generate Assignments"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self, course_id: str):
        """Navigate to a specific course"""
        self.page.goto(f"/courses/{course_id}")
        self.wait_for_page_load()
        self.wait_for_course_loaded()

    def wait_for_course_loaded(self):
        """Wait for course content to load"""
        self.wait_for_loading_complete()
        # Wait for course title to be visible
        self.page.locator(self.COURSE_TITLE).wait_for(state="visible")

    # ==================== Tab Navigation ====================

    def click_modules_tab(self):
        """Click on Modules tab"""
        self.page.get_by_role("tab", name=self.TAB_MODULES).click()
        self.wait_for_loading_complete()

    def click_assignments_tab(self):
        """Click on Assignments tab"""
        self.page.get_by_role("tab", name=self.TAB_ASSIGNMENTS).click()
        self.wait_for_loading_complete()

    def click_members_tab(self):
        """Click on Members tab"""
        self.page.get_by_role("tab", name=self.TAB_MEMBERS).click()
        self.wait_for_loading_complete()

    def click_grades_tab(self):
        """Click on Grades tab"""
        self.page.get_by_role("tab", name=self.TAB_GRADES).click()
        self.wait_for_loading_complete()

    # ==================== Course Info ====================

    def get_course_title(self) -> str:
        """Get the course title"""
        return self.page.locator(self.COURSE_TITLE).text_content() or ""

    def get_course_description(self) -> str:
        """Get the course description"""
        desc = self.page.locator(self.COURSE_DESCRIPTION)
        if desc.is_visible():
            return desc.text_content() or ""
        return ""

    # ==================== Module Actions ====================

    def get_module_count(self) -> int:
        """Get number of modules"""
        return self.page.locator(self.MODULE_ITEM).count()

    def get_module_titles(self) -> list[str]:
        """Get all module titles"""
        titles = []
        modules = self.page.locator(self.MODULE_ITEM)
        for i in range(modules.count()):
            title = modules.nth(i).locator(self.MODULE_TITLE).text_content()
            if title:
                titles.append(title)
        return titles

    def click_module(self, title: str):
        """Click on a module by title"""
        self.page.locator(self.MODULE_ITEM).filter(has_text=title).click()

    def expand_module(self, title: str):
        """Expand a module to show contents"""
        module = self.page.locator(self.MODULE_ITEM).filter(has_text=title)
        expand_button = module.locator("[aria-expanded='false']")
        if expand_button.is_visible():
            expand_button.click()

    def click_add_module(self):
        """Click add module button (teacher only)"""
        self.page.get_by_role("button", name=self.ADD_MODULE_BUTTON).click()
        # Wait for modal
        self.page.locator("[role='dialog']").wait_for(state="visible")

    # ==================== Assignment Actions ====================

    def get_assignment_count(self) -> int:
        """Get number of assignments in current view"""
        return self.page.locator(self.ASSIGNMENT_ITEM).count()

    def click_assignment(self, title: str):
        """Click on an assignment by title"""
        self.page.get_by_text(title).click()
        self.wait_for_url_contains("/assignments/")

    def click_add_assignment(self):
        """Click add assignment button (teacher only)"""
        self.page.get_by_role("button", name=self.ADD_ASSIGNMENT_BUTTON).click()
        # Wait for modal
        self.page.locator("[role='dialog']").wait_for(state="visible")

    # ==================== AI Features ====================

    def is_ai_assistant_visible(self) -> bool:
        """Check if AI assistant button is visible"""
        return self.page.get_by_role("button", name=self.AI_ASSISTANT_BUTTON).is_visible()

    def open_ai_assistant(self):
        """Open AI assistant panel"""
        self.page.get_by_role("button", name=self.AI_ASSISTANT_BUTTON).click()
        # Wait for panel to appear
        self.page.locator("[data-testid='ai-panel'], .ai-assistant-panel").wait_for(state="visible")

    def generate_modules_with_ai(self, prompt: str, module_count: int = 4):
        """
        Generate modules using AI.

        Args:
            prompt: Description of what modules to generate
            module_count: Number of modules to generate
        """
        self.open_ai_assistant()

        # Click generate modules option
        self.page.get_by_role("button", name=self.AI_GENERATE_MODULES).click()

        # Fill prompt
        self.page.locator("textarea, input[type='text']").last.fill(prompt)

        # Set module count if adjustable
        count_input = self.page.locator("input[type='number']")
        if count_input.is_visible():
            count_input.fill(str(module_count))

        # Click generate
        self.page.get_by_role("button", name="Generate").click()

        # Wait for AI processing (can take 10-60 seconds)
        self.wait_for_ai_generation()

    def wait_for_ai_generation(self, timeout: int = 120000):
        """Wait for AI content generation to complete"""
        # Wait for loading indicator to appear and then disappear
        loading = self.page.locator("[data-testid='ai-loading'], .ai-loading-state")
        if loading.is_visible():
            loading.wait_for(state="hidden", timeout=timeout)

        # Check for success or error state
        self.page.locator("[data-testid='ai-success'], [data-testid='ai-error'], .ai-preview").wait_for(
            state="visible",
            timeout=timeout
        )

    def is_ai_loading(self) -> bool:
        """Check if AI is currently generating content"""
        return self.page.locator("[data-testid='ai-loading'], .ai-loading-state, .animate-pulse").is_visible()

    # ==================== State Checks ====================

    def is_teacher_view(self) -> bool:
        """Check if viewing as teacher (has edit capabilities)"""
        return self.page.get_by_role("button", name=self.ADD_MODULE_BUTTON).is_visible() or \
               self.page.get_by_role("button", name=self.ADD_ASSIGNMENT_BUTTON).is_visible()

    def has_modules(self) -> bool:
        """Check if course has modules"""
        return self.get_module_count() > 0

    def has_assignments(self) -> bool:
        """Check if course has assignments"""
        return self.get_assignment_count() > 0

    # ==================== Assertions ====================

    def assert_on_course_page(self):
        """Assert we are on a course detail page"""
        self.assert_url_contains("/courses/")

    def assert_course_title(self, expected_title: str):
        """Assert course has expected title"""
        expect(self.page.locator(self.COURSE_TITLE)).to_contain_text(expected_title)

    def assert_module_exists(self, module_title: str):
        """Assert a module with given title exists"""
        expect(self.page.locator(self.MODULE_ITEM).filter(has_text=module_title)).to_be_visible()

    def assert_assignment_exists(self, assignment_title: str):
        """Assert an assignment with given title exists"""
        expect(self.page.get_by_text(assignment_title)).to_be_visible()

    def assert_modules_tab_active(self):
        """Assert modules tab is active"""
        expect(self.page.get_by_role("tab", name=self.TAB_MODULES)).to_have_attribute("aria-selected", "true")

    def assert_assignments_tab_active(self):
        """Assert assignments tab is active"""
        expect(self.page.get_by_role("tab", name=self.TAB_ASSIGNMENTS)).to_have_attribute("aria-selected", "true")

