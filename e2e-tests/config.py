"""
E2E Test Configuration Module

Centralized configuration management for Playwright E2E tests.
Loads settings from environment variables with sensible defaults.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass
class TestUser:
    """Test user credentials"""
    email: str
    password: str
    name: str
    role: Literal["STUDENT", "TEACHER", "ADMIN"] = "STUDENT"


@dataclass
class BrowserConfig:
    """Browser configuration settings"""
    browser: Literal["chromium", "firefox", "webkit"] = "chromium"
    headless: bool = False
    slow_mo: int = 0  # Slow down execution by N ms
    viewport_width: int = 1920
    viewport_height: int = 1080

    # Artifact settings
    screenshot_on_failure: bool = True
    video_on_failure: bool = True
    trace_on_failure: bool = True


@dataclass
class TimeoutConfig:
    """Timeout settings in milliseconds"""
    default: int = 30_000
    navigation: int = 60_000
    expect: int = 10_000
    action: int = 15_000


@dataclass
class Config:
    """Main configuration class"""
    # URLs
    base_url: str = field(default_factory=lambda: os.getenv("BASE_URL", "http://localhost:3000"))
    api_url: str = field(default_factory=lambda: os.getenv("API_URL", "http://localhost:8080/api"))

    # Test Users
    student: TestUser = field(default_factory=lambda: TestUser(
        email=os.getenv("TEST_STUDENT_EMAIL", "test.student@ucu.edu.ua"),
        password=os.getenv("TEST_STUDENT_PASSWORD", "TestPass123!"),
        name=os.getenv("TEST_STUDENT_NAME", "Test Student"),
        role="STUDENT"
    ))
    teacher: TestUser = field(default_factory=lambda: TestUser(
        email=os.getenv("TEST_TEACHER_EMAIL", "test.teacher@ucu.edu.ua"),
        password=os.getenv("TEST_TEACHER_PASSWORD", "TestPass123!"),
        name=os.getenv("TEST_TEACHER_NAME", "Test Teacher"),
        role="TEACHER"
    ))
    admin: TestUser = field(default_factory=lambda: TestUser(
        email=os.getenv("TEST_ADMIN_EMAIL", "admin@ucu.edu.ua"),
        password=os.getenv("TEST_ADMIN_PASSWORD", "AdminPass123!"),
        name=os.getenv("TEST_ADMIN_NAME", "Admin User"),
        role="ADMIN"
    ))

    # Browser settings
    browser: BrowserConfig = field(default_factory=lambda: BrowserConfig(
        browser=os.getenv("BROWSER", "chromium"),  # type: ignore
        headless=os.getenv("HEADLESS", "false").lower() == "true",
        slow_mo=int(os.getenv("SLOW_MO", "0")),
        viewport_width=int(os.getenv("VIEWPORT_WIDTH", "1920")),
        viewport_height=int(os.getenv("VIEWPORT_HEIGHT", "1080")),
        screenshot_on_failure=os.getenv("SCREENSHOT_ON_FAILURE", "true").lower() == "true",
        video_on_failure=os.getenv("VIDEO_ON_FAILURE", "true").lower() == "true",
        trace_on_failure=os.getenv("TRACE_ON_FAILURE", "true").lower() == "true",
    ))

    # Timeouts
    timeouts: TimeoutConfig = field(default_factory=lambda: TimeoutConfig(
        default=int(os.getenv("DEFAULT_TIMEOUT", "30000")),
        navigation=int(os.getenv("NAVIGATION_TIMEOUT", "60000")),
        expect=int(os.getenv("EXPECT_TIMEOUT", "10000")),
    ))

    # Test data defaults
    test_course_code: str = field(default_factory=lambda: os.getenv("TEST_COURSE_CODE", "TEST-E2E-001"))

    # Retry settings
    retries: int = field(default_factory=lambda: int(os.getenv("RETRIES", "2")))

    # Paths
    reports_dir: Path = field(default_factory=lambda: Path(__file__).parent / "reports")
    logs_dir: Path = field(default_factory=lambda: Path(__file__).parent / "logs")
    screenshots_dir: Path = field(default_factory=lambda: Path(__file__).parent / "reports" / "screenshots")

    def __post_init__(self):
        """Ensure required directories exist"""
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)


# Singleton configuration instance
config = Config()

