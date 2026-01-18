"""
Quiz Taking Page Object

Handles all interactions with the quiz taking experience.
"""

from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class QuizTakingPage(BasePage):
    """
    Page object for the Quiz Taking page (/quiz/:id/take).

    Handles:
    - Starting a quiz attempt
    - Answering questions (multiple choice, true/false, text)
    - Timer display and warnings
    - Quiz submission
    - Results viewing
    """

    # ==================== Selectors ====================

    # Quiz info
    QUIZ_TITLE = "h1, h2"
    TIMER_DISPLAY = "[data-testid='quiz-timer'], .quiz-timer"
    TIME_WARNING = "[data-testid='time-warning']"

    # Question elements
    QUESTION_CONTAINER = "[data-testid='question'], .question-container"
    QUESTION_STEM = "[data-testid='question-stem'], .question-stem"
    QUESTION_NUMBER = "[data-testid='question-number']"

    # Answer options
    MULTIPLE_CHOICE_OPTION = "input[type='radio']"
    CHECKBOX_OPTION = "input[type='checkbox']"
    TEXT_ANSWER = "textarea, input[type='text']"

    # Navigation
    PREV_BUTTON = "Previous"
    NEXT_BUTTON = "Next"
    SUBMIT_BUTTON = "Submit"

    # Progress
    PROGRESS_INDICATOR = "[data-testid='quiz-progress'], .quiz-progress"

    # Results
    RESULTS_CONTAINER = "[data-testid='quiz-results'], .quiz-results"
    SCORE_DISPLAY = "[data-testid='quiz-score'], .quiz-score"

    def __init__(self, page: Page):
        super().__init__(page)

    # ==================== Navigation ====================

    def navigate(self, quiz_id: str):
        """Navigate to quiz taking page"""
        self.page.goto(f"/quiz/{quiz_id}/take")
        self.wait_for_page_load()
        self.wait_for_quiz_ready()

    def wait_for_quiz_ready(self):
        """Wait for quiz to be ready to take"""
        self.wait_for_loading_complete()
        # Wait for question or start button
        self.page.locator(f"{self.QUESTION_CONTAINER}, button:has-text('Start')").first.wait_for(state="visible")

    # ==================== Quiz Start ====================

    def start_quiz(self):
        """Click start quiz button if present"""
        start_button = self.page.get_by_role("button", name="Start")
        if start_button.is_visible():
            start_button.click()
            self.wait_for_loading_complete()
            # Wait for first question
            self.page.locator(self.QUESTION_CONTAINER).wait_for(state="visible")

    # ==================== Timer ====================

    def get_remaining_time(self) -> str:
        """Get the remaining time displayed"""
        timer = self.page.locator(self.TIMER_DISPLAY)
        if timer.is_visible():
            return timer.text_content() or ""
        return ""

    def is_time_warning_shown(self) -> bool:
        """Check if time warning is displayed"""
        return self.page.locator(self.TIME_WARNING).is_visible()

    def has_timer(self) -> bool:
        """Check if quiz has a timer"""
        return self.page.locator(self.TIMER_DISPLAY).is_visible()

    # ==================== Question Navigation ====================

    def get_current_question_number(self) -> int:
        """Get current question number"""
        # Try to parse from progress or question number display
        progress = self.page.locator(self.PROGRESS_INDICATOR)
        if progress.is_visible():
            text = progress.text_content() or ""
            # Extract number from "Question 3 of 10" format
            import re
            match = re.search(r"(\d+)", text)
            if match:
                return int(match.group(1))
        return 1

    def get_total_questions(self) -> int:
        """Get total number of questions"""
        progress = self.page.locator(self.PROGRESS_INDICATOR)
        if progress.is_visible():
            text = progress.text_content() or ""
            import re
            matches = re.findall(r"(\d+)", text)
            if len(matches) >= 2:
                return int(matches[1])
        return 0

    def go_to_next_question(self):
        """Go to next question"""
        self.page.get_by_role("button", name=self.NEXT_BUTTON).click()
        self.page.wait_for_timeout(300)  # Brief wait for animation

    def go_to_previous_question(self):
        """Go to previous question"""
        self.page.get_by_role("button", name=self.PREV_BUTTON).click()
        self.page.wait_for_timeout(300)

    def can_go_next(self) -> bool:
        """Check if next button is enabled"""
        return self.page.get_by_role("button", name=self.NEXT_BUTTON).is_enabled()

    def can_go_previous(self) -> bool:
        """Check if previous button is enabled"""
        prev_btn = self.page.get_by_role("button", name=self.PREV_BUTTON)
        return prev_btn.is_visible() and prev_btn.is_enabled()

    # ==================== Answering Questions ====================

    def get_question_text(self) -> str:
        """Get current question text"""
        stem = self.page.locator(self.QUESTION_STEM)
        if stem.is_visible():
            return stem.text_content() or ""
        # Fallback to question container
        return self.page.locator(self.QUESTION_CONTAINER).text_content() or ""

    def select_multiple_choice_answer(self, option_index: int):
        """
        Select a multiple choice answer by index (0-based).

        Args:
            option_index: Index of the option to select
        """
        options = self.page.locator(self.MULTIPLE_CHOICE_OPTION)
        if options.count() > option_index:
            options.nth(option_index).click()

    def select_multiple_choice_by_text(self, answer_text: str):
        """Select a multiple choice answer by its text"""
        # Find the label or container with the text and click it
        option = self.page.locator(f"label:has-text('{answer_text}'), [data-testid='option']:has-text('{answer_text}')")
        option.click()

    def select_true_false(self, answer: bool):
        """Select true or false answer"""
        text = "True" if answer else "False"
        self.page.get_by_label(text).click()

    def enter_text_answer(self, answer: str):
        """Enter a text answer"""
        text_input = self.page.locator(self.TEXT_ANSWER)
        text_input.fill(answer)

    def is_answer_selected(self) -> bool:
        """Check if an answer is selected for current question"""
        # Check if any radio/checkbox is checked
        selected = self.page.locator(f"{self.MULTIPLE_CHOICE_OPTION}:checked, {self.CHECKBOX_OPTION}:checked")
        if selected.count() > 0:
            return True
        # Check if text answer has content
        text = self.page.locator(self.TEXT_ANSWER)
        if text.is_visible():
            return len(text.input_value() or "") > 0
        return False

    # ==================== Submission ====================

    def submit_quiz(self):
        """Submit the quiz"""
        self.page.get_by_role("button", name=self.SUBMIT_BUTTON).click()

        # Handle confirmation dialog if present
        confirm = self.page.get_by_role("button", name="Confirm")
        if confirm.is_visible():
            confirm.click()

        # Wait for results or redirect
        self.wait_for_loading_complete()

    def is_submit_button_visible(self) -> bool:
        """Check if submit button is visible"""
        return self.page.get_by_role("button", name=self.SUBMIT_BUTTON).is_visible()

    def is_submit_button_enabled(self) -> bool:
        """Check if submit button is enabled"""
        return self.page.get_by_role("button", name=self.SUBMIT_BUTTON).is_enabled()

    # ==================== Results ====================

    def wait_for_results(self):
        """Wait for quiz results to display"""
        self.page.locator(self.RESULTS_CONTAINER).wait_for(state="visible", timeout=30000)

    def get_score(self) -> str:
        """Get the quiz score"""
        score = self.page.locator(self.SCORE_DISPLAY)
        if score.is_visible():
            return score.text_content() or ""
        return ""

    def is_results_page(self) -> bool:
        """Check if on results page"""
        return self.page.locator(self.RESULTS_CONTAINER).is_visible() or \
               "/results" in self.get_current_url()

    # ==================== Complete Quiz Flow ====================

    def complete_quiz_randomly(self):
        """
        Complete the entire quiz by selecting random answers.
        Useful for testing the submission flow.
        """
        self.start_quiz()

        while True:
            # Answer current question
            options = self.page.locator(self.MULTIPLE_CHOICE_OPTION)
            if options.count() > 0:
                # Select first option for simplicity
                options.first.click()
            else:
                # Text answer
                text_input = self.page.locator(self.TEXT_ANSWER)
                if text_input.is_visible():
                    text_input.fill("Test answer")

            # Check if we can submit
            if self.is_submit_button_visible():
                self.submit_quiz()
                break

            # Go to next question
            if self.can_go_next():
                self.go_to_next_question()
            else:
                # Try to submit
                if self.is_submit_button_visible():
                    self.submit_quiz()
                break

    # ==================== Assertions ====================

    def assert_on_quiz_page(self):
        """Assert we are on a quiz taking page"""
        self.assert_url_contains("/quiz/")

    def assert_question_visible(self):
        """Assert a question is visible"""
        expect(self.page.locator(self.QUESTION_CONTAINER)).to_be_visible()

    def assert_timer_visible(self):
        """Assert timer is visible"""
        expect(self.page.locator(self.TIMER_DISPLAY)).to_be_visible()

    def assert_submit_enabled(self):
        """Assert submit button is enabled"""
        expect(self.page.get_by_role("button", name=self.SUBMIT_BUTTON)).to_be_enabled()

    def assert_results_visible(self):
        """Assert results are visible"""
        expect(self.page.locator(self.RESULTS_CONTAINER)).to_be_visible()

    def assert_score_displayed(self):
        """Assert score is displayed"""
        expect(self.page.locator(self.SCORE_DISPLAY)).to_be_visible()

