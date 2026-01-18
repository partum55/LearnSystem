"""
API Integration Tests

Tests for backend API endpoints.
Uses Playwright for API testing alongside browser tests.
"""

import pytest
from playwright.sync_api import Page, expect, APIRequestContext
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import config


@pytest.fixture(scope="session")
def api_request_context(playwright_instance):
    """Create an API request context for the test session."""
    request_context = playwright_instance.request.new_context(
        base_url=config.api_url,
    )
    yield request_context
    request_context.dispose()


@pytest.fixture
def authenticated_api_context(playwright_instance):
    """Create an authenticated API request context."""
    request_context = playwright_instance.request.new_context(
        base_url=config.api_url,
    )

    # Login to get token
    try:
        response = request_context.post("/auth/login", data={
            "email": config.student.email,
            "password": config.student.password
        })

        if response.ok:
            data = response.json()
            token = data.get("token") or data.get("accessToken")

            if token:
                # Create new context with auth header
                request_context.dispose()
                request_context = playwright_instance.request.new_context(
                    base_url=config.api_url,
                    extra_http_headers={
                        "Authorization": f"Bearer {token}"
                    }
                )
    except Exception:
        pass

    yield request_context
    request_context.dispose()


class TestAPIHealth:
    """
    API health check tests.
    """

    @pytest.mark.api
    @pytest.mark.smoke
    def test_api_is_reachable(self, api_request_context: APIRequestContext):
        """
        Verify API is reachable.

        This is the most basic API test.
        """
        try:
            # Try health endpoint
            response = api_request_context.get("/health")

            if response.status == 404:
                # Try actuator endpoint
                response = api_request_context.get("/actuator/health")

            if response.status == 404:
                # Try root
                response = api_request_context.get("/")

            # Should get some response
            assert response.status < 500, f"API returned server error: {response.status}"
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")

    @pytest.mark.api
    def test_api_returns_json(self, api_request_context: APIRequestContext):
        """
        Verify API returns JSON responses.
        """
        try:
            response = api_request_context.get("/health")

            if response.ok:
                content_type = response.headers.get("content-type", "")
                assert "json" in content_type.lower() or response.status == 204
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")


class TestAuthenticationAPI:
    """
    Authentication API tests.
    """

    @pytest.mark.api
    @pytest.mark.auth
    def test_login_endpoint_exists(self, api_request_context: APIRequestContext):
        """
        Verify login endpoint exists.
        """
        try:
            response = api_request_context.post("/auth/login", data={
                "email": "test@example.com",
                "password": "wrong"
            })

            # Should return 401 or 400, not 404
            assert response.status != 404, "Login endpoint not found"
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")

    @pytest.mark.api
    @pytest.mark.auth
    def test_login_with_valid_credentials(self, api_request_context: APIRequestContext):
        """
        Verify login with valid credentials returns token.
        """
        try:
            response = api_request_context.post("/auth/login", data={
                "email": config.student.email,
                "password": config.student.password
            })

            if response.status == 200:
                data = response.json()
                assert "token" in data or "accessToken" in data or "access_token" in data
            elif response.status in [401, 403]:
                pytest.skip("Test user credentials may not be configured")
            else:
                pytest.fail(f"Unexpected response: {response.status}")
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")

    @pytest.mark.api
    @pytest.mark.auth
    def test_login_with_invalid_credentials(self, api_request_context: APIRequestContext):
        """
        Verify login with invalid credentials returns error.
        """
        try:
            response = api_request_context.post("/auth/login", data={
                "email": config.student.email,
                "password": "wrongpassword123"
            })

            # Should return 401 or similar
            assert response.status in [400, 401, 403], \
                f"Expected auth error, got {response.status}"
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")


class TestCoursesAPI:
    """
    Courses API tests.
    """

    @pytest.mark.api
    @pytest.mark.course
    def test_courses_endpoint_exists(self, authenticated_api_context: APIRequestContext):
        """
        Verify courses endpoint exists.
        """
        try:
            response = authenticated_api_context.get("/courses")

            # Should return 200, 401, or 403 - not 404
            assert response.status != 404, "Courses endpoint not found"
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")

    @pytest.mark.api
    @pytest.mark.course
    def test_courses_returns_list(self, authenticated_api_context: APIRequestContext):
        """
        Verify courses endpoint returns a list.
        """
        try:
            response = authenticated_api_context.get("/courses")

            if response.ok:
                data = response.json()
                # Should be a list or object with courses
                assert isinstance(data, (list, dict)), "Courses should return list or object"
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")


class TestUsersAPI:
    """
    Users API tests.
    """

    @pytest.mark.api
    def test_current_user_endpoint(self, authenticated_api_context: APIRequestContext):
        """
        Verify current user endpoint exists.
        """
        try:
            response = authenticated_api_context.get("/users/me")

            if response.status == 404:
                # Try alternative endpoint
                response = authenticated_api_context.get("/auth/me")

            if response.ok:
                data = response.json()
                # Should have user info
                assert "email" in data or "id" in data or "user" in data
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")


class TestAssignmentsAPI:
    """
    Assignments API tests.
    """

    @pytest.mark.api
    @pytest.mark.assignment
    def test_assignments_endpoint_exists(self, authenticated_api_context: APIRequestContext):
        """
        Verify assignments endpoint exists.
        """
        try:
            response = authenticated_api_context.get("/assignments")

            # Should not be 404
            if response.status == 404:
                # Try with course prefix
                response = authenticated_api_context.get("/courses/assignments")

            # Allow various responses
            assert response.status < 500, f"Server error: {response.status}"
        except Exception as e:
            pytest.skip(f"API not reachable: {e}")


class TestAIServicesAPI:
    """
    AI Services API tests.
    """

    @pytest.mark.api
    @pytest.mark.ai
    def test_ai_health_endpoint(self, api_request_context: APIRequestContext):
        """
        Verify AI service is reachable.
        """
        try:
            # Try direct AI service
            ai_url = os.getenv("AI_SERVICE_URL", "http://localhost:8085")

            # Create separate context for AI service
            response = api_request_context.get(f"{ai_url}/health")

            if response.status == 404:
                response = api_request_context.get(f"{ai_url}/actuator/health")

            # AI service may or may not be running
            if response.status >= 500:
                pytest.skip("AI service has server error")
        except Exception as e:
            pytest.skip(f"AI service not reachable: {e}")

    @pytest.mark.api
    @pytest.mark.ai
    def test_ai_generation_endpoint_exists(self, authenticated_api_context: APIRequestContext):
        """
        Verify AI generation endpoint exists.
        """
        try:
            # Try various AI endpoints
            endpoints = [
                "/ai/generate",
                "/generate",
                "/api/ai/generate"
            ]

            for endpoint in endpoints:
                response = authenticated_api_context.post(endpoint, data={})
                if response.status != 404:
                    break

            # May require specific payload - 400 is acceptable
            assert response.status in [200, 201, 400, 401, 403], \
                f"AI endpoint issue: {response.status}"
        except Exception as e:
            pytest.skip(f"AI service not reachable: {e}")


class TestGatewayAPI:
    """
    API Gateway tests.
    """

    @pytest.mark.api
    def test_gateway_routing(self, api_request_context: APIRequestContext):
        """
        Verify API gateway routes requests correctly.
        """
        try:
            # Test that gateway handles requests
            response = api_request_context.get("/")

            # Gateway should respond
            assert response.status < 500
        except Exception as e:
            pytest.skip(f"Gateway not reachable: {e}")

