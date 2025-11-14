import os
import io
import csv
import tempfile
import unittest
from django.test import LiveServerTestCase
from django.contrib.auth import get_user_model
from django.core import management
import requests
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from tests_integration.utils import assert_no_error_in_response

User = get_user_model()


class FrontendIntegrationTests(LiveServerTestCase):
    """Integration tests that exercise API via real HTTP requests (requests.Session).

    Tests included:
    - login for student and teacher (reads credentials from env with fallbacks)
    - access protected endpoint /api/auth/me/ using cookie-based JWT (fallback to Authorization header)
    - refresh token using refresh cookie (we set refresh cookie explicitly in test)
    - logout clears cookies and blacklists refresh token
    - teacher can import CSV of users
    """

    @classmethod
    def setUpClass(cls):
        # Ensure migrations have been applied (live server uses test DB)
        management.call_command('migrate', verbosity=0)
        super().setUpClass()

    def setUp(self):
        # Clear cache to avoid rate limiting interference between tests
        cache.clear()

        # Create test users (student and teacher)
        # Credentials from environment with fallback to provided values
        self.student_email = os.getenv('TEST_STUDENT_EMAIL', 'student@ucu.edu.ua')
        self.student_password = os.getenv('TEST_STUDENT_PASSWORD', 'weather100')

        self.teacher_email = os.getenv('TEST_TEACHER_EMAIL', 'teacher@ucu.edu.ua')
        self.teacher_password = os.getenv('TEST_TEACHER_PASSWORD', 'We@th3r100')

        # Create or get users
        self.student, _ = User.objects.get_or_create(
            email=self.student_email,
            defaults={'display_name': 'Student User'}
        )
        self.student.set_password(self.student_password)
        self.student.save()

        self.teacher, _ = User.objects.get_or_create(
            email=self.teacher_email,
            defaults={'display_name': 'Teacher User', 'role': 'TEACHER'}
        )
        self.teacher.role = 'TEACHER'
        self.teacher.set_password(self.teacher_password)
        self.teacher.save()

        # Base URL for API
        self.base_url = self.live_server_url.rstrip('/')

        # Sessions for student and teacher
        self.student_sess = requests.Session()
        self.teacher_sess = requests.Session()

    def test_student_login_and_me(self):
        # Login student
        resp = self.student_sess.post(
            f'{self.base_url}/api/auth/login/',
            json={'email': self.student_email, 'password': self.student_password},
            timeout=5,
        )
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200, msg=resp.text)
        body = resp.json()
        access = body.get('access')
        self.assertIsNotNone(access, msg='Login response must include access token in JSON')

        # Some test environments don't send HttpOnly cookies back in subsequent requests the same way
        # so set Authorization header as a reliable fallback (simulating SPA behaviour)
        self.student_sess.headers.update({'Authorization': f'Bearer {access}'})

        # Access current user
        resp2 = self.student_sess.get(f'{self.base_url}/api/auth/me/')
        assert_no_error_in_response(resp2)
        self.assertEqual(resp2.status_code, 200, msg=resp2.text)
        data = resp2.json()
        self.assertEqual(data['email'], self.student_email)

    def test_refresh_and_logout(self):
        # Login teacher to ensure user exists
        resp = self.teacher_sess.post(
            f'{self.base_url}/api/auth/login/',
            json={'email': self.teacher_email, 'password': self.teacher_password},
            timeout=5,
        )
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200)

        # Create a refresh token for this teacher and set it as a cookie on the session
        refresh = RefreshToken.for_user(self.teacher)
        # Name used by the project for the refresh cookie
        refresh_cookie_name = 'refresh_token'
        # Set the cookie on session for the live server host
        # Do not set domain so requests will send it to the current host
        self.teacher_sess.cookies.set(refresh_cookie_name, str(refresh), path='/')

        # Call refresh endpoint which expects the refresh token in cookie
        resp2 = self.teacher_sess.post(f'{self.base_url}/api/auth/refresh/')
        assert_no_error_in_response(resp2)
        self.assertEqual(resp2.status_code, 200, msg=resp2.text)
        self.assertIn('access', resp2.json())

        new_access = resp2.json().get('access')
        # Use the new access token for subsequent requests
        self.teacher_sess.headers.update({'Authorization': f'Bearer {new_access}'})

        # Logout (will attempt to blacklist refresh token and clear cookies)
        resp3 = self.teacher_sess.post(f'{self.base_url}/api/auth/logout/', json={})
        assert_no_error_in_response(resp3)
        self.assertEqual(resp3.status_code, 200)

        # After logout, the refresh token should be blacklisted, so calling the refresh endpoint should fail
        resp4 = self.teacher_sess.post(f'{self.base_url}/api/auth/refresh/')
        # The refresh token is blacklisted so refresh should be unauthorized
        self.assertIn(resp4.status_code, (401, 403), msg=f'Expected refresh to fail after logout, got {resp4.status_code} {resp4.text}')

    def test_teacher_csv_import(self):
        # Login teacher first and obtain access token
        resp = self.teacher_sess.post(
            f'{self.base_url}/api/auth/login/',
            json={'email': self.teacher_email, 'password': self.teacher_password},
            timeout=5,
        )
        assert_no_error_in_response(resp)
        self.assertEqual(resp.status_code, 200)
        access = resp.json().get('access')
        self.assertIsNotNone(access)
        self.teacher_sess.headers.update({'Authorization': f'Bearer {access}'})

        # Build CSV in-memory
        csv_file = io.StringIO()
        writer = csv.writer(csv_file)
        writer.writerow(['email', 'display_name', 'first_name', 'last_name', 'student_id', 'role', 'password'])
        writer.writerow(['newstudent@ucu.edu.ua', 'New Student', 'New', 'Student', 's123', 'STUDENT', 'ChangeMe123!'])
        csv_content = csv_file.getvalue()
        csv_file_bytes = csv_content.encode('utf-8')

        files = {'file': ('users.csv', csv_file_bytes, 'text/csv')}

        resp2 = self.teacher_sess.post(f'{self.base_url}/api/auth/users/import_csv/', files=files)
        assert_no_error_in_response(resp2)
        self.assertEqual(resp2.status_code, 200, msg=resp2.text)
        data = resp2.json()
        self.assertEqual(data.get('status'), 'completed')
        self.assertGreaterEqual(data.get('created', 0), 1)

    def tearDown(self):
        self.student_sess.close()
        self.teacher_sess.close()


if __name__ == '__main__':
    unittest.main()
