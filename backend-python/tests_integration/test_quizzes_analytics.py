import os
from django.test import LiveServerTestCase
from django.contrib.auth import get_user_model
from django.core import management
from django.core.cache import cache
import requests
from tests_integration.utils import assert_no_error_in_response

User = get_user_model()


class QuizAnalyticsIntegrationTests(LiveServerTestCase):
    """Integration tests for quiz flows and analytics endpoints."""

    @classmethod
    def setUpClass(cls):
        management.call_command('migrate', verbosity=0)
        super().setUpClass()

    def setUp(self):
        cache.clear()
        self.student_email = os.getenv('TEST_STUDENT_EMAIL', 'student@ucu.edu.ua')
        self.student_password = os.getenv('TEST_STUDENT_PASSWORD', 'weather100')
        self.teacher_email = os.getenv('TEST_TEACHER_EMAIL', 'teacher@ucu.edu.ua')
        self.teacher_password = os.getenv('TEST_TEACHER_PASSWORD', 'We@th3r100')

        self.student, _ = User.objects.get_or_create(email=self.student_email, defaults={'display_name': 'Student'})
        self.student.set_password(self.student_password)
        self.student.save()

        self.teacher, _ = User.objects.get_or_create(email=self.teacher_email, defaults={'display_name': 'Teacher', 'role': 'TEACHER'})
        self.teacher.role = 'TEACHER'
        self.teacher.set_password(self.teacher_password)
        self.teacher.save()

        self.base_url = self.live_server_url.rstrip('/')
        self.student_sess = requests.Session()
        self.teacher_sess = requests.Session()

    def test_quiz_lifecycle_and_analytics(self):
        # Teacher login
        resp = self.teacher_sess.post(f'{self.base_url}/api/auth/login/', json={'email': self.teacher_email, 'password': self.teacher_password})
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        teacher_access = resp.json().get('access')
        self.teacher_sess.headers.update({'Authorization': f'Bearer {teacher_access}'})

        # Create a course
        course_payload = {
            'code': 'QUIZ101',
            'title_uk': 'Курс з тестів',
            'description_uk': 'Опис курсу',
            'visibility': 'PRIVATE',
            'is_published': True
        }
        resp = self.teacher_sess.post(f'{self.base_url}/api/courses/', json=course_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        course = resp.json()
        course_id = course['id']

        # Create a numerical question in question bank
        question_payload = {
            'course': course_id,
            'question_type': 'NUMERICAL',
            'stem': 'What is 2+3?',
            'options': {},
            'correct_answer': {'answer': '5'},
            'points': '10.00'
        }
        resp = self.teacher_sess.post(f'{self.base_url}/api/assessments/questions/', json=question_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        question = resp.json()
        question_id = question['id']

        # Create a quiz
        quiz_payload = {'course': course_id, 'title': 'Simple Quiz', 'pass_percentage': '50.00', 'attempts_allowed': 3}
        resp = self.teacher_sess.post(f'{self.base_url}/api/assessments/quizzes/', json=quiz_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        quiz = resp.json()
        quiz_id = quiz['id']

        # Add question to quiz
        resp = self.teacher_sess.post(f'{self.base_url}/api/assessments/quizzes/{quiz_id}/add_questions/', json={'question_ids': [question_id]})
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        added_info = resp.json()
        self.assertGreaterEqual(added_info.get('added', 0), 1)

        # Enroll student to course so they can take the quiz
        enroll_payload = {'student_emails': [self.student_email], 'role': 'STUDENT'}
        resp = self.teacher_sess.post(f'{self.base_url}/api/courses/{course_id}/enroll_students/', json=enroll_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)

        # Student login
        resp = self.student_sess.post(f'{self.base_url}/api/auth/login/', json={'email': self.student_email, 'password': self.student_password})
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        student_access = resp.json().get('access')
        self.student_sess.headers.update({'Authorization': f'Bearer {student_access}'})

        # Student starts an attempt
        resp = self.student_sess.post(f'{self.base_url}/api/assessments/quizzes/{quiz_id}/start_attempt/')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        attempt = resp.json()
        attempt_id = attempt['id']

        # Student submits attempt with correct answer
        answers = {str(question_id): '5'}
        resp = self.student_sess.post(f'{self.base_url}/api/assessments/attempts/{attempt_id}/submit/', json={'answers': answers})
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        submitted = resp.json()
        # Auto-graded final_score or auto_score should be set
        self.assertTrue(submitted.get('auto_score') is not None or submitted.get('final_score') is not None)

        # Teacher can view quiz statistics
        resp = self.teacher_sess.get(f'{self.base_url}/api/assessments/quizzes/{quiz_id}/statistics/')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        stats = resp.json()
        self.assertIn('total_attempts', stats)

        # Analytics endpoints (teacher has access as course owner)
        resp = self.teacher_sess.get(f'{self.base_url}/api/analytics/courses/{course_id}/stats')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)

        resp = self.teacher_sess.get(f'{self.base_url}/api/analytics/courses/{course_id}/student-progress')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)

        resp = self.teacher_sess.get(f'{self.base_url}/api/analytics/courses/{course_id}/grade-distribution')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)

        resp = self.teacher_sess.get(f'{self.base_url}/api/analytics/courses/{course_id}/engagement')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)

    def tearDown(self):
        self.student_sess.close()
        self.teacher_sess.close()


if __name__ == '__main__':
    import unittest
    unittest.main()
