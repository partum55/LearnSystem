# LearnSystemUCU E2E Test Suite

## Overview

This test suite provides comprehensive end-to-end testing for the LearnSystemUCU learning management system. Tests are written in Python using Playwright for browser automation.

## Test Coverage

### 1. Smoke Tests (`test_smoke.py`)
- Application health checks
- Basic page rendering
- Critical path validation

### 2. Authentication Tests (`test_auth.py`)
- Login flow
- Registration flow
- Session management
- Logout functionality
- Protected route access

### 3. Dashboard Tests (`test_dashboard.py`)
- Dashboard display
- Widget visibility
- Navigation from dashboard
- Role-specific views

### 4. Course Tests (`test_courses.py`)
- Course listing
- Course detail view
- Course search
- Module navigation
- Teacher course creation

### 5. Quiz Tests (`test_quiz.py`)
- Quiz access
- Quiz taking flow
- Question navigation
- Quiz submission

### 6. Assignment Tests (`test_assignments.py`)
- Assignment listing
- Assignment detail
- Submission forms
- File uploads
- Graded assignment viewing

### 7. AI Features Tests (`test_ai_features.py`)
- AI feature access
- Course generation
- Module generation
- Quiz generation
- AI assistant panel

### 8. API Integration Tests (`test_api_integration.py`)
- API health
- Authentication endpoints
- Course endpoints
- Assignment endpoints
- AI service endpoints

### 9. Learning Flow Tests (`test_learning_flow.py`)
- Complete student journey
- Teacher workflow
- Navigation flows
- Error recovery

## Prerequisites

- Python 3.9+
- Node.js (for frontend if testing locally)
- Docker (optional, for running full stack)

## Installation

```bash
cd e2e-tests

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
# Or install all browsers:
playwright install
```

## Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Key configuration options:

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Frontend URL | `http://localhost:3000` |
| `API_URL` | Backend API URL | `http://localhost:8080/api` |
| `TEST_STUDENT_EMAIL` | Test student email | `test.student@ucu.edu.ua` |
| `TEST_STUDENT_PASSWORD` | Test student password | `TestPass123!` |
| `TEST_TEACHER_EMAIL` | Test teacher email | `test.teacher@ucu.edu.ua` |
| `TEST_TEACHER_PASSWORD` | Test teacher password | `TestPass123!` |
| `HEADLESS` | Run in headless mode | `false` |
| `BROWSER` | Browser to use | `chromium` |
| `SLOW_MO` | Slow down actions (ms) | `0` |

## Running Tests

### Run All Tests
```bash
pytest
```

### Run with Visible Browser (Headed Mode)
```bash
HEADLESS=false pytest
```

### Run Specific Test File
```bash
pytest tests/test_auth.py
```

### Run Specific Test
```bash
pytest tests/test_auth.py::TestLogin::test_successful_login
```

### Run by Marker
```bash
# Smoke tests only
pytest -m smoke

# Critical tests
pytest -m critical

# All auth tests
pytest -m auth

# Skip slow tests
pytest -m "not slow"

# Skip flaky tests
pytest -m "not flaky"
```

### Run in Parallel
```bash
pytest -n 4  # Run with 4 workers
```

### Generate HTML Report
```bash
pytest --html=reports/report.html --self-contained-html
```

### Run with Allure Reporting
```bash
pytest --alluredir=reports/allure-results
allure serve reports/allure-results
```

## Test Markers

| Marker | Description |
|--------|-------------|
| `smoke` | Quick smoke tests |
| `critical` | Critical path tests |
| `auth` | Authentication tests |
| `course` | Course management tests |
| `quiz` | Quiz tests |
| `assignment` | Assignment tests |
| `ai` | AI feature tests |
| `api` | API integration tests |
| `slow` | Long-running tests |
| `flaky` | Known flaky tests |

## Directory Structure

```
e2e-tests/
├── conftest.py          # Pytest fixtures
├── config.py            # Configuration management
├── pytest.ini           # Pytest configuration
├── requirements.txt     # Python dependencies
├── .env.example         # Example environment file
├── pages/               # Page Object Models
│   ├── base_page.py
│   ├── login_page.py
│   ├── dashboard_page.py
│   ├── course_list_page.py
│   ├── course_detail_page.py
│   ├── assignment_page.py
│   ├── quiz_taking_page.py
│   └── register_page.py
├── tests/               # Test files
│   ├── test_smoke.py
│   ├── test_auth.py
│   ├── test_dashboard.py
│   ├── test_courses.py
│   ├── test_quiz.py
│   ├── test_assignments.py
│   ├── test_ai_features.py
│   ├── test_api_integration.py
│   └── test_learning_flow.py
├── utils/               # Utility modules
│   ├── test_data.py
│   └── wait_helpers.py
├── fixtures/            # Test fixtures
├── reports/             # Test reports
└── logs/                # Test logs
```

## Test User Setup

Before running tests, ensure test users exist in the system:

1. **Student User**
   - Email: `test.student@ucu.edu.ua`
   - Password: `TestPass123!`
   - Role: STUDENT

2. **Teacher User**
   - Email: `test.teacher@ucu.edu.ua`
   - Password: `TestPass123!`
   - Role: TEACHER

You can create these users via:
```bash
# Using the admin script (if available)
./create-admin.sh

# Or manually through the registration flow
```

## Troubleshooting

### Tests fail with "Login failed"
- Verify test users exist in the database
- Check environment variables are set correctly
- Ensure the application is running

### Browser doesn't open
- Check `HEADLESS` is set to `false`
- Run `playwright install` to ensure browsers are installed

### Timeout errors
- Increase timeouts in `.env` file
- Check network connectivity
- Verify services are responding

### Element not found errors
- UI may have changed - update selectors in page objects
- Check for loading states
- Verify the element is actually visible

## CI/CD Integration

For CI/CD pipelines, use headless mode:

```bash
HEADLESS=true pytest -m "not flaky" --html=reports/report.html
```

Example GitHub Actions workflow:
```yaml
- name: Run E2E Tests
  run: |
    cd e2e-tests
    pip install -r requirements.txt
    playwright install chromium
    HEADLESS=true pytest -m smoke --html=reports/report.html
```

## Writing New Tests

1. Create test file in `tests/` directory
2. Use appropriate markers
3. Follow existing patterns:
   - Use page objects for UI interactions
   - Add docstrings with user stories
   - Handle missing data gracefully with `pytest.skip()`
   - Use flexible selectors that work across UI changes

Example:
```python
@pytest.mark.smoke
@pytest.mark.auth
def test_example(self, page: Page):
    """
    Brief description.
    
    User Story: As a user, I can do something.
    """
    page.goto("/some-page")
    page.wait_for_load_state("networkidle")
    
    element = page.locator("selector").first
    expect(element).to_be_visible()
```

## Maintenance

- Update page objects when UI changes
- Review and update selectors periodically
- Keep test data generation realistic
- Monitor for flaky tests and fix or mark appropriately

