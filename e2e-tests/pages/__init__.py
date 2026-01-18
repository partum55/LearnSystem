"""
Page Objects Module

Exposes all page objects for easy importing in tests.
"""

from pages.base_page import BasePage
from pages.login_page import LoginPage
from pages.register_page import RegisterPage
from pages.dashboard_page import DashboardPage
from pages.course_list_page import CourseListPage
from pages.course_detail_page import CourseDetailPage
from pages.quiz_taking_page import QuizTakingPage
from pages.assignment_page import AssignmentPage

__all__ = [
    "BasePage",
    "LoginPage",
    "RegisterPage",
    "DashboardPage",
    "CourseListPage",
    "CourseDetailPage",
    "QuizTakingPage",
    "AssignmentPage",
]

