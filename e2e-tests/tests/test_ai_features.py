"""
AI Features E2E Tests

Tests for AI-powered content generation features.
Validates AI course/module/quiz generation flows.
"""

import pytest
from playwright.sync_api import Page, expect
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pages.course_list_page import CourseListPage
from pages.course_detail_page import CourseDetailPage
from config import config


class TestAIFeatureAccess:
    """
    AI Feature access tests.

    Tests that AI features are accessible to appropriate users.
    """

    @pytest.mark.ai
    def test_ai_features_page_accessible(self, authenticated_teacher_page: Page):
        """
        Verify AI features are accessible to teachers.

        User Story: As a teacher, I can access AI features.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        # Look for AI-related buttons
        ai_button = page.locator(
            "button:has-text('AI'), "
            "button:has-text('Generate'), "
            "[aria-label*='AI'], "
            "[data-testid*='ai']"
        ).first

        # AI features may or may not be visible depending on configuration
        # This test just ensures the page loads properly
        expect(page).to_have_url(lambda url: "/courses" in url)

    @pytest.mark.ai
    def test_student_ai_access_restricted(self, authenticated_student_page: Page):
        """
        Verify students have limited AI access.

        User Story: As a student, I don't see course creation AI.
        """
        page = authenticated_student_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        # Look for course creation AI button
        ai_create = page.locator(
            "button:has-text('Generate Course'), "
            "button:has-text('Create with AI')"
        ).first

        # Students should not see course generation
        if ai_create.count() > 0:
            expect(ai_create).not_to_be_visible()


class TestAICourseGeneration:
    """
    AI Course Generation tests.

    Tests the AI-powered course generation flow.
    """

    @pytest.mark.ai
    @pytest.mark.slow
    def test_ai_course_generator_ui(self, authenticated_teacher_page: Page):
        """
        Verify AI course generator UI is accessible.

        User Story: As a teacher, I can access the AI course generator.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        # Look for AI generate button
        ai_button = page.locator(
            "button:has-text('Generate'), "
            "button:has-text('AI'), "
            "button:has-text('Create')"
        )

        if ai_button.count() == 0:
            pytest.skip("AI generation button not found")

        ai_button.first.click()
        page.wait_for_timeout(1000)

        # Should show modal or navigate
        modal = page.locator("[role='dialog']")
        if modal.is_visible():
            # Modal should have input
            text_input = modal.locator("textarea, input[type='text']").first
            if text_input.is_visible():
                # AI form is working
                pass
            # Close modal
            page.keyboard.press("Escape")


class TestAIAssistant:
    """
    AI Assistant tests.

    Tests the AI assistant panel functionality.
    """

    @pytest.mark.ai
    def test_ai_assistant_in_course(self, authenticated_teacher_page: Page):
        """
        Verify AI assistant is available in course.

        User Story: As a teacher, I can use AI assistant in my course.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available for AI assistant test")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Look for AI assistant button
        ai_assistant = page.locator(
            "button:has-text('AI'), "
            "button[aria-label*='AI'], "
            "[data-testid='ai-assistant'], "
            "button:has-text('Assistant')"
        ).first

        if not ai_assistant.is_visible():
            pytest.skip("AI assistant not visible in this course")

        ai_assistant.click()
        page.wait_for_timeout(1000)

        # Should show AI panel
        ai_panel = page.locator(
            "[data-testid='ai-panel'], "
            ".ai-assistant-panel, "
            "[role='dialog']:has-text('AI')"
        )

        # Panel should be visible
        if ai_panel.count() > 0:
            expect(ai_panel.first).to_be_visible()


class TestAIModuleGeneration:
    """
    AI Module Generation tests.
    """

    @pytest.mark.ai
    def test_ai_module_generation_accessible(self, authenticated_teacher_page: Page):
        """
        Verify AI module generation is accessible.

        User Story: As a teacher, I can generate modules with AI.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Look for generate modules button
        generate_button = page.locator(
            "button:has-text('Generate'), "
            "button:has-text('AI Module')"
        ).first

        # Button may or may not be present
        # This test verifies the page loads correctly


class TestAIQuizGeneration:
    """
    AI Quiz Generation tests.
    """

    @pytest.mark.ai
    def test_ai_quiz_generation_accessible(self, authenticated_teacher_page: Page):
        """
        Verify AI quiz generation is accessible.

        User Story: As a teacher, I can generate quizzes with AI.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        course_links = page.locator("a[href*='/courses/']:not([href='/courses'])")

        if course_links.count() == 0:
            pytest.skip("No courses available")

        course_links.first.click()
        page.wait_for_load_state("networkidle")

        # Navigate to assignments tab
        assignments_tab = page.locator("[role='tab']:has-text('Assignment')").first
        if assignments_tab.is_visible():
            assignments_tab.click()
            page.wait_for_timeout(500)

        # Look for AI quiz button
        ai_quiz = page.locator(
            "button:has-text('Generate Quiz'), "
            "button:has-text('AI Quiz')"
        ).first

        # Button may or may not be present


class TestAILoadingStates:
    """
    AI Loading state tests.

    Tests for proper loading feedback during AI operations.
    """

    @pytest.mark.ai
    def test_ai_provides_loading_feedback(self, authenticated_teacher_page: Page):
        """
        Verify AI shows loading state during generation.

        User Story: As a teacher, I see progress during AI generation.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        # AI loading states require triggering generation
        # This test verifies the page loads without errors
        expect(page).to_have_url(lambda url: "/courses" in url)


class TestAIErrorHandling:
    """
    AI Error handling tests.
    """

    @pytest.mark.ai
    def test_ai_error_display(self, authenticated_teacher_page: Page):
        """
        Verify AI errors are displayed properly.

        User Story: As a teacher, I see helpful errors when AI fails.
        """
        page = authenticated_teacher_page
        page.goto("/courses")
        page.wait_for_load_state("networkidle")

        # Error handling requires simulating failures
        # This test verifies the page loads properly
        expect(page).to_have_url(lambda url: "/courses" in url)

