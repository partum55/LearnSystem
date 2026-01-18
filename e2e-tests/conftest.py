"""
Pytest fixtures for E2E tests

Provides browser, page, and context fixtures for Playwright tests.
Handles setup/teardown, screenshots on failure, and common test utilities.
"""

import pytest
from typing import Generator
from playwright.sync_api import (
    sync_playwright,
    Browser,
    BrowserContext,
    Page,
    Playwright,
)
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import config


@pytest.fixture(scope="session")
def playwright_instance() -> Generator[Playwright, None, None]:
    """Create a Playwright instance for the entire test session"""
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance: Playwright) -> Generator[Browser, None, None]:
    """
    Create a browser instance based on configuration.
    Supports chromium, firefox, and webkit.
    """
    browser_type = getattr(playwright_instance, config.browser.browser)
    browser = browser_type.launch(
        headless=config.browser.headless,
        slow_mo=config.browser.slow_mo,
    )
    yield browser
    browser.close()


@pytest.fixture(scope="function")
def context(browser: Browser) -> Generator[BrowserContext, None, None]:
    """
    Create a new browser context for each test.
    Each context has isolated storage, cookies, and session.
    """
    context = browser.new_context(
        viewport={
            "width": config.browser.viewport_width,
            "height": config.browser.viewport_height,
        },
        base_url=config.base_url,
        # Record video if enabled
        record_video_dir=str(config.reports_dir / "videos") if config.browser.video_on_failure else None,
    )

    # Set default timeouts
    context.set_default_timeout(config.timeouts.default)
    context.set_default_navigation_timeout(config.timeouts.navigation)

    yield context
    context.close()


@pytest.fixture(scope="function")
def page(context: BrowserContext, request) -> Generator[Page, None, None]:
    """
    Create a new page for each test.
    Handles screenshot/trace capture on test failure.
    """
    page = context.new_page()

    # Start tracing if enabled
    if config.browser.trace_on_failure:
        context.tracing.start(screenshots=True, snapshots=True, sources=True)

    yield page

    # Capture artifacts on failure
    if request.node.rep_call.failed if hasattr(request.node, 'rep_call') else False:
        if config.browser.screenshot_on_failure:
            screenshot_path = config.screenshots_dir / f"{request.node.name}.png"
            page.screenshot(path=str(screenshot_path), full_page=True)

        if config.browser.trace_on_failure:
            trace_path = config.reports_dir / "traces" / f"{request.node.name}.zip"
            trace_path.parent.mkdir(parents=True, exist_ok=True)
            context.tracing.stop(path=str(trace_path))
    else:
        if config.browser.trace_on_failure:
            context.tracing.stop()

    page.close()


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Store test result for fixture cleanup"""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture(scope="function")
def authenticated_student_page(page: Page) -> Generator[Page, None, None]:
    """
    Provide a page with an authenticated student session.
    Uses the configured test student credentials.
    """
    from pages.login_page import LoginPage

    login_page = LoginPage(page)
    login_page.navigate()
    login_page.login(config.student.email, config.student.password)
    login_page.wait_for_dashboard()

    yield page


@pytest.fixture(scope="function")
def authenticated_teacher_page(page: Page) -> Generator[Page, None, None]:
    """
    Provide a page with an authenticated teacher session.
    Uses the configured test teacher credentials.
    """
    from pages.login_page import LoginPage

    login_page = LoginPage(page)
    login_page.navigate()
    login_page.login(config.teacher.email, config.teacher.password)
    login_page.wait_for_dashboard()

    yield page


@pytest.fixture(scope="function")
def authenticated_admin_page(page: Page) -> Generator[Page, None, None]:
    """
    Provide a page with an authenticated admin session.
    Uses the configured test admin credentials.
    """
    from pages.login_page import LoginPage

    login_page = LoginPage(page)
    login_page.navigate()
    login_page.login(config.admin.email, config.admin.password)
    login_page.wait_for_dashboard()

    yield page


# ==================== Utility Fixtures ====================

@pytest.fixture
def test_course_data() -> dict:
    """Generate test course data"""
    from faker import Faker
    fake = Faker()

    return {
        "code": f"TEST-{fake.unique.random_number(digits=4)}",
        "title": f"Test Course: {fake.catch_phrase()}",
        "description": fake.paragraph(nb_sentences=3),
    }


@pytest.fixture
def test_quiz_data() -> dict:
    """Generate test quiz data"""
    from faker import Faker
    fake = Faker()

    return {
        "title": f"Quiz: {fake.sentence(nb_words=4)}",
        "description": fake.paragraph(nb_sentences=2),
        "time_limit": 30,
        "questions": [
            {
                "type": "MULTIPLE_CHOICE",
                "stem": fake.sentence() + "?",
                "choices": [fake.word() for _ in range(4)],
                "correct_index": 0,
                "points": 10,
            },
            {
                "type": "TRUE_FALSE",
                "stem": fake.sentence() + "?",
                "correct_answer": True,
                "points": 5,
            },
        ]
    }


@pytest.fixture
def test_assignment_data() -> dict:
    """Generate test assignment data"""
    from faker import Faker
    fake = Faker()

    return {
        "title": f"Assignment: {fake.sentence(nb_words=4)}",
        "description": fake.paragraph(nb_sentences=3),
        "instructions": fake.paragraph(nb_sentences=5),
        "points": 100,
        "type": "TEXT",
    }

