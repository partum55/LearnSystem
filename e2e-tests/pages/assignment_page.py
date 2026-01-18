"""
Assignment Page Object

Handles all interactions with assignment viewing and submission.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage
from pathlib import Path


class AssignmentPage(BasePage):
    """
    Page object for Assignment pages.

    Handles:
    - Viewing assignment details
    - Submitting assignments (text, file, code, URL)
    - Viewing submission status
    - Viewing grades and feedback
    """

    # ==================== Selectors ====================

    # Assignment info
    ASSIGNMENT_TITLE = "h1"
    ASSIGNMENT_DESCRIPTION = "[data-testid='assignment-description'], .assignment-description"
    DUE_DATE = "[data-testid='due-date'], .due-date"
    POINTS_POSSIBLE = "[data-testid='points'], .points-possible"

    # Submission form
    SUBMIT_BUTTON = "Submit"
    TEXT_SUBMISSION = "textarea[name='submission'], [data-testid='text-submission']"
    URL_SUBMISSION = "input[type='url'], [data-testid='url-submission']"
    FILE_INPUT = "input[type='file']"

    # Code submission (Virtual Lab)
    CODE_EDITOR = "[data-testid='code-editor'], .monaco-editor"
    RUN_CODE_BUTTON = "Run"
    SUBMIT_CODE_BUTTON = "Submit"
    TEST_RESULTS = "[data-testid='test-results'], .test-results"

    # Submission status
    SUBMISSION_STATUS = "[data-testid='submission-status'], .submission-status"
    SUBMITTED_AT = "[data-testid='submitted-at']"

    # Grading
    GRADE_DISPLAY = "[data-testid='grade'], .grade-display"
    FEEDBACK_DISPLAY = "[data-testid='feedback'], .feedback"
    RUBRIC = "[data-testid='rubric'], .rubric"

    # Messages
    SUCCESS_MESSAGE = "[role='alert']:has-text('success'), .success-message"
    ERROR_MESSAGE = "[role='alert']:has-text('error'), .error-message"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self, assignment_id: str):
        """Navigate to assignment detail page"""
        self.page.goto(f"/assignments/{assignment_id}")
        self.wait_for_page_load()
        self.wait_for_assignment_loaded()

    def navigate_to_submit(self, assignment_id: str):
        """Navigate to assignment submission page"""
        self.page.goto(f"/assignments/{assignment_id}/submit")
        self.wait_for_page_load()
        self.wait_for_submission_form()

    def wait_for_assignment_loaded(self):
        """Wait for assignment details to load"""
        self.wait_for_loading_complete()
        self.page.locator(self.ASSIGNMENT_TITLE).wait_for(state="visible")

    def wait_for_submission_form(self):
        """Wait for submission form to be ready"""
        self.wait_for_loading_complete()
        # Wait for either text area, file input, or code editor
        self.page.locator(f"{self.TEXT_SUBMISSION}, {self.FILE_INPUT}, {self.CODE_EDITOR}").first.wait_for(
            state="visible",
            timeout=self.config.timeouts.default
        )

    # ==================== Assignment Info ====================

    def get_assignment_title(self) -> str:
        """Get the assignment title"""
        return self.page.locator(self.ASSIGNMENT_TITLE).text_content() or ""

    def get_description(self) -> str:
        """Get the assignment description"""
        desc = self.page.locator(self.ASSIGNMENT_DESCRIPTION)
        if desc.is_visible():
            return desc.text_content() or ""
        return ""

    def get_due_date(self) -> str:
        """Get the due date text"""
        due = self.page.locator(self.DUE_DATE)
        if due.is_visible():
            return due.text_content() or ""
        return ""

    def get_points_possible(self) -> str:
        """Get the points possible"""
        points = self.page.locator(self.POINTS_POSSIBLE)
        if points.is_visible():
            return points.text_content() or ""
        return ""

    def is_past_due(self) -> bool:
        """Check if assignment is past due"""
        return self.page.get_by_text("Past due").is_visible() or \
               self.page.get_by_text("Overdue").is_visible()

    # ==================== Text Submission ====================

    def enter_text_submission(self, text: str):
        """Enter text submission"""
        self.page.locator(self.TEXT_SUBMISSION).fill(text)

    def get_text_submission(self) -> str:
        """Get current text submission content"""
        return self.page.locator(self.TEXT_SUBMISSION).input_value() or ""

    # ==================== File Submission ====================

    def upload_file(self, file_path: str):
        """
        Upload a file for submission.

        Args:
            file_path: Path to the file to upload
        """
        file_input = self.page.locator(self.FILE_INPUT)
        file_input.set_input_files(file_path)
        # Wait for upload to complete
        self.page.wait_for_timeout(1000)

    def upload_multiple_files(self, file_paths: list[str]):
        """Upload multiple files"""
        file_input = self.page.locator(self.FILE_INPUT)
        file_input.set_input_files(file_paths)
        self.page.wait_for_timeout(1000)

    def get_uploaded_file_name(self) -> str:
        """Get the name of uploaded file"""
        # Look for file name display
        file_name = self.page.locator("[data-testid='uploaded-file'], .uploaded-file-name")
        if file_name.is_visible():
            return file_name.text_content() or ""
        return ""

    # ==================== URL Submission ====================

    def enter_url_submission(self, url: str):
        """Enter URL submission"""
        self.page.locator(self.URL_SUBMISSION).fill(url)

    # ==================== Code Submission (Virtual Lab) ====================

    def is_code_assignment(self) -> bool:
        """Check if this is a code assignment"""
        return self.page.locator(self.CODE_EDITOR).is_visible()

    def enter_code(self, code: str):
        """
        Enter code in the code editor.
        Note: Monaco editor requires special handling.
        """
        # Try clicking on editor first
        editor = self.page.locator(self.CODE_EDITOR)
        editor.click()

        # Clear existing content and type new code
        self.page.keyboard.press("Control+a")
        self.page.keyboard.type(code)

    def run_code(self):
        """Run the code"""
        self.page.get_by_role("button", name=self.RUN_CODE_BUTTON).click()
        # Wait for execution
        self.wait_for_code_execution()

    def wait_for_code_execution(self, timeout: int = 30000):
        """Wait for code execution to complete"""
        # Wait for loading to finish
        self.wait_for_loading_complete()
        # Wait for test results or output
        self.page.locator(f"{self.TEST_RESULTS}, [data-testid='code-output']").wait_for(
            state="visible",
            timeout=timeout
        )

    def get_test_results(self) -> str:
        """Get test results text"""
        results = self.page.locator(self.TEST_RESULTS)
        if results.is_visible():
            return results.text_content() or ""
        return ""

    def are_tests_passing(self) -> bool:
        """Check if all tests are passing"""
        return self.page.get_by_text("All tests passed").is_visible() or \
               self.page.locator("[data-testid='tests-passed']").is_visible()

    # ==================== Submission ====================

    def click_submit(self):
        """Click the submit button"""
        self.page.get_by_role("button", name=self.SUBMIT_BUTTON).click()

    def submit_assignment(self):
        """Submit the assignment and wait for confirmation"""
        self.click_submit()

        # Handle confirmation dialog if present
        confirm = self.page.get_by_role("button", name="Confirm")
        if confirm.is_visible():
            confirm.click()

        # Wait for success message or status update
        self.wait_for_loading_complete()

    def is_submit_button_enabled(self) -> bool:
        """Check if submit button is enabled"""
        return self.page.get_by_role("button", name=self.SUBMIT_BUTTON).is_enabled()

    def is_submit_button_loading(self) -> bool:
        """Check if submit button is in loading state"""
        button = self.page.get_by_role("button", name=self.SUBMIT_BUTTON)
        return button.locator(".animate-spin").count() > 0

    # ==================== Submission Status ====================

    def get_submission_status(self) -> str:
        """Get current submission status"""
        status = self.page.locator(self.SUBMISSION_STATUS)
        if status.is_visible():
            return status.text_content() or ""
        return ""

    def is_submitted(self) -> bool:
        """Check if assignment has been submitted"""
        return self.page.get_by_text("Submitted").is_visible() or \
               self.page.locator(self.SUBMITTED_AT).is_visible()

    def get_submitted_at(self) -> str:
        """Get submission timestamp"""
        submitted = self.page.locator(self.SUBMITTED_AT)
        if submitted.is_visible():
            return submitted.text_content() or ""
        return ""

    # ==================== Grades & Feedback ====================

    def get_grade(self) -> str:
        """Get the grade if available"""
        grade = self.page.locator(self.GRADE_DISPLAY)
        if grade.is_visible():
            return grade.text_content() or ""
        return ""

    def is_graded(self) -> bool:
        """Check if assignment has been graded"""
        return self.page.locator(self.GRADE_DISPLAY).is_visible()

    def get_feedback(self) -> str:
        """Get instructor feedback if available"""
        feedback = self.page.locator(self.FEEDBACK_DISPLAY)
        if feedback.is_visible():
            return feedback.text_content() or ""
        return ""

    def has_feedback(self) -> bool:
        """Check if there is feedback"""
        return self.page.locator(self.FEEDBACK_DISPLAY).is_visible()

    def view_rubric(self):
        """Open rubric view"""
        rubric_btn = self.page.get_by_role("button", name="View Rubric")
        if rubric_btn.is_visible():
            rubric_btn.click()

    # ==================== Assertions ====================

    def assert_on_assignment_page(self):
        """Assert we are on an assignment page"""
        self.assert_url_contains("/assignments/")

    def assert_assignment_title(self, expected_title: str):
        """Assert assignment has expected title"""
        expect(self.page.locator(self.ASSIGNMENT_TITLE)).to_contain_text(expected_title)

    def assert_submitted_successfully(self):
        """Assert submission was successful"""
        # Look for success indicators
        expect(
            self.page.locator(f"{self.SUCCESS_MESSAGE}, :text('Submitted'), :text('Success')").first
        ).to_be_visible()

    def assert_submission_error(self):
        """Assert submission had an error"""
        expect(self.page.locator(self.ERROR_MESSAGE)).to_be_visible()

    def assert_grade_visible(self):
        """Assert grade is visible"""
        expect(self.page.locator(self.GRADE_DISPLAY)).to_be_visible()

    def assert_feedback_visible(self):
        """Assert feedback is visible"""
        expect(self.page.locator(self.FEEDBACK_DISPLAY)).to_be_visible()

    def assert_past_due_warning(self):
        """Assert past due warning is shown"""
        expect(self.page.get_by_text("Past due")).to_be_visible()

