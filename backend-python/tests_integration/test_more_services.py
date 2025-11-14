import os
import io
import csv
from django.test import LiveServerTestCase
from django.contrib.auth import get_user_model
from django.core import management
from django.core.cache import cache
import requests
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from tests_integration.utils import assert_no_error_in_response

User = get_user_model()


class MoreServicesIntegrationTests(LiveServerTestCase):
    """Integration tests for courses, assessments, submissions, and gradebook."""

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

    def test_course_module_assignment_submission_and_grading(self):
        # Teacher login
        resp = self.teacher_sess.post(f'{self.base_url}/api/auth/login/', json={'email': self.teacher_email, 'password': self.teacher_password})
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        teacher_access = resp.json().get('access')
        self.teacher_sess.headers.update({'Authorization': f'Bearer {teacher_access}'})

        # Create a course
        course_payload = {
            'code': 'TEST101',
            'title_uk': 'Тестовий курс',
            'description_uk': 'Опис',
            'visibility': 'PRIVATE',
            'is_published': True
        }
        resp = self.teacher_sess.post(f'{self.base_url}/api/courses/', json=course_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        course = resp.json()
        course_id = course['id']

        # Create a module in the course
        module_payload = {
            'course': course_id,
            'title': 'Module 1',
            'description': 'Module description',
            'is_published': True
        }
        resp = self.teacher_sess.post(f'{self.base_url}/api/courses/modules/', json=module_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        module = resp.json()
        module_id = module['id']

        # Create an assignment (TEXT type) in this module
        assignment_payload = {
            'course': course_id,
            'module': module_id,
            'title': 'Essay 1',
            'description': 'Write something',
            'assignment_type': 'TEXT',
            'max_points': '50.00',
            'is_published': True,
        }
        resp = self.teacher_sess.post(f'{self.base_url}/api/assessments/assignments/', json=assignment_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        assignment = resp.json()
        assignment_id = assignment['id']

        # Enroll student into course
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

        # Student create a submission (text)
        submission_payload = {'assignment': assignment_id, 'text_answer': 'My essay answer'}
        resp = self.student_sess.post(f'{self.base_url}/api/submissions/submissions/', json=submission_payload)
        assert_no_error_in_response(resp)
        # Creating submission returns 201
        self.assertIn(resp.status_code, (200, 201), msg=resp.text)
        submission = resp.json()
        # If response contains id, use it; otherwise query the submissions list to find it
        if 'id' in submission:
            submission_id = submission['id']
        else:
            # Fetch submissions for this assignment for the student
            resp_list = self.student_sess.get(f'{self.base_url}/api/submissions/submissions/?assignment={assignment_id}')
            self.assertEqual(resp_list.status_code, 200, msg=resp_list.text)
            submissions_list = resp_list.json()
            # The API may return a paginated response with 'results' or a plain list
            if isinstance(submissions_list, dict) and 'results' in submissions_list:
                results = submissions_list['results']
            else:
                results = submissions_list

            self.assertTrue(len(results) >= 1, msg='Expected at least one submission in list')
            # Pick the most recent submission
            submission_id = results[0]['id']

        # Student submit (mark as submitted)
        resp = self.student_sess.post(f'{self.base_url}/api/submissions/submissions/{submission_id}/submit/')
        self.assertEqual(resp.status_code, 200, msg=resp.text)

        # Teacher grade the submission
        grade_payload = {'grade': 45}
        resp = self.teacher_sess.post(f'{self.base_url}/api/submissions/submissions/{submission_id}/grade/', json=grade_payload)
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        graded = resp.json()
        self.assertEqual(float(graded.get('grade')), 45.0)

        # Check gradebook entry exists via gradebook entries list (filter by course)
        resp = self.teacher_sess.get(f'{self.base_url}/api/gradebook/entries/?course={course_id}')
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        entries = resp.json()
        self.assertTrue(len(entries) >= 1)

    def tearDown(self):
        self.student_sess.close()
        self.teacher_sess.close()


if __name__ == '__main__':
    import unittest
    unittest.main()
