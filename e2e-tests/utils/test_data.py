"""
Test Utilities Module

Common utilities for E2E tests.
"""

import random
import string
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()


def generate_ucu_email(prefix: str = "") -> str:
    """Generate a valid UCU email address"""
    if prefix:
        return f"{prefix}@ucu.edu.ua"
    return f"test.{fake.unique.random_number(digits=6)}@ucu.edu.ua"


def generate_password(length: int = 12) -> str:
    """Generate a valid password (min 8 chars, mixed case, numbers)"""
    lower = random.choices(string.ascii_lowercase, k=length // 3)
    upper = random.choices(string.ascii_uppercase, k=length // 3)
    digits = random.choices(string.digits, k=length // 3)
    special = random.choices("!@#$%^&*", k=1)

    password = lower + upper + digits + special
    random.shuffle(password)
    return "".join(password)


def generate_course_code() -> str:
    """Generate a unique course code"""
    return f"TEST-{fake.unique.random_number(digits=4)}-{fake.random_letter().upper()}"


def generate_course_title() -> str:
    """Generate a course title"""
    subjects = [
        "Introduction to",
        "Advanced",
        "Fundamentals of",
        "Applied",
        "Principles of",
    ]
    topics = [
        "Computer Science",
        "Machine Learning",
        "Web Development",
        "Data Structures",
        "Software Engineering",
        "Database Systems",
        "Algorithms",
    ]
    return f"{random.choice(subjects)} {random.choice(topics)}"


def generate_assignment_title() -> str:
    """Generate an assignment title"""
    types = ["Homework", "Project", "Lab", "Exercise", "Practice"]
    topics = ["Arrays", "Functions", "Classes", "Algorithms", "Data Analysis"]
    return f"{random.choice(types)}: {random.choice(topics)}"


def generate_quiz_title() -> str:
    """Generate a quiz title"""
    topics = ["Midterm", "Quiz", "Assessment", "Test", "Review"]
    subjects = ["Chapter 1", "Unit 2", "Module 3", "Week 4", "Final"]
    return f"{random.choice(topics)} - {random.choice(subjects)}"


def get_future_date(days: int = 7) -> str:
    """Get a future date string"""
    future = datetime.now() + timedelta(days=days)
    return future.strftime("%Y-%m-%d")


def get_past_date(days: int = 7) -> str:
    """Get a past date string"""
    past = datetime.now() - timedelta(days=days)
    return past.strftime("%Y-%m-%d")


class TestDataGenerator:
    """
    Generate realistic test data for E2E tests.
    """

    def __init__(self):
        self.fake = Faker()

    def student_registration_data(self) -> dict:
        """Generate student registration data"""
        return {
            "email": generate_ucu_email(),
            "password": generate_password(),
            "display_name": self.fake.name(),
            "role": "STUDENT",
        }

    def teacher_registration_data(self) -> dict:
        """Generate teacher registration data"""
        return {
            "email": generate_ucu_email(),
            "password": generate_password(),
            "display_name": f"Prof. {self.fake.last_name()}",
            "role": "TEACHER",
        }

    def course_data(self) -> dict:
        """Generate course data"""
        return {
            "code": generate_course_code(),
            "title": generate_course_title(),
            "description": self.fake.paragraph(nb_sentences=3),
            "start_date": get_past_date(30),
            "end_date": get_future_date(90),
        }

    def module_data(self) -> dict:
        """Generate module data"""
        return {
            "title": f"Module: {self.fake.sentence(nb_words=4)}",
            "description": self.fake.paragraph(nb_sentences=2),
        }

    def assignment_data(self) -> dict:
        """Generate assignment data"""
        return {
            "title": generate_assignment_title(),
            "description": self.fake.paragraph(nb_sentences=3),
            "instructions": self.fake.paragraph(nb_sentences=5),
            "points": random.choice([10, 20, 50, 100]),
            "due_date": get_future_date(14),
        }

    def quiz_data(self) -> dict:
        """Generate module-scoped quiz data"""
        return {
            "title": generate_quiz_title(),
            "description": self.fake.paragraph(nb_sentences=2),
            "module_title": f"Module {random.randint(1, 4)}",
            "time_limit": random.choice([15, 30, 45, 60]),
            "attempts_allowed": random.choice([1, 2, 3]),
        }

    def multiple_choice_question(self) -> dict:
        """Generate a multiple choice question"""
        return {
            "type": "MULTIPLE_CHOICE",
            "stem": self.fake.sentence() + "?",
            "choices": [self.fake.word() for _ in range(4)],
            "correct_index": random.randint(0, 3),
            "points": random.choice([5, 10]),
        }

    def true_false_question(self) -> dict:
        """Generate a true/false question"""
        return {
            "type": "TRUE_FALSE",
            "stem": self.fake.sentence() + "?",
            "correct_answer": random.choice([True, False]),
            "points": random.choice([5, 10]),
        }

    def text_submission(self) -> str:
        """Generate a text submission"""
        return self.fake.paragraph(nb_sentences=5)

    def code_submission(self) -> str:
        """Generate a simple code submission"""
        return """
def solution(n):
    # Simple solution
    result = 0
    for i in range(n):
        result += i
    return result

# Test
print(solution(10))
"""


# Singleton instance
test_data = TestDataGenerator()
