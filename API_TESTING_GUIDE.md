# API Testing Guide

## Issues Fixed

1. ✅ **Fixed admin URL** - Changed `admin.site.admin_view` to `admin.site.urls`
2. ✅ **Added APPEND_SLASH setting** - Django will now automatically redirect URLs without trailing slashes
3. ✅ **Fixed courses permission** - Anonymous users can now see public courses
4. ✅ **Added logout endpoint** - `/api/auth/logout/` endpoint added

## Available Test Users

- **Admin**: `admin@lms.edu` / (check your database)
- **SuperAdmin**: `admin@test.com` / `admin123` (if you ran the user creation script)

## API Endpoints

### Authentication

#### 1. Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lms.edu",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@lms.edu",
    "display_name": "Admin",
    "role": "SUPERADMIN"
  }
}
```

#### 2. Get Current User (with auth)
```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Logout
```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

#### 4. Refresh Token
```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

### Courses

#### 1. List Courses (Public - No Auth Required)
```bash
curl -X GET http://localhost:8000/api/courses/
```

This will return published public courses even without authentication.

#### 2. List Courses (Authenticated)
```bash
curl -X GET http://localhost:8000/api/courses/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Create Course (Teacher/Admin only)
```bash
curl -X POST http://localhost:8000/api/courses/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CS101",
    "title_en": "Introduction to Programming",
    "title_uk": "Вступ до програмування",
    "description_en": "Learn programming basics",
    "description_uk": "Вивчайте основи програмування",
    "visibility": "PUBLIC",
    "is_published": true
  }'
```

#### 4. Enroll Students (Teacher/Admin only)
```bash
curl -X POST http://localhost:8000/api/courses/{course_id}/enroll_students/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_emails": ["student1@test.com", "student2@test.com"]
  }'
```

## Testing with Python

Create a file `test_api.py`:

```python
import requests
import json

BASE_URL = "http://localhost:8000"

# 1. Login
login_response = requests.post(
    f"{BASE_URL}/api/auth/login/",
    json={
        "email": "admin@lms.edu",
        "password": "your_password"
    }
)

if login_response.status_code == 200:
    tokens = login_response.json()
    access_token = tokens['access']
    print(f"✅ Login successful!")
    print(f"Access Token: {access_token[:50]}...")
    
    # 2. Get current user
    me_response = requests.get(
        f"{BASE_URL}/api/auth/me/",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if me_response.status_code == 200:
        user = me_response.json()
        print(f"✅ Current user: {user['email']} ({user['role']})")
    else:
        print(f"❌ Failed to get current user: {me_response.status_code}")
    
    # 3. List courses
    courses_response = requests.get(
        f"{BASE_URL}/api/courses/",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if courses_response.status_code == 200:
        courses = courses_response.json()
        print(f"✅ Found {len(courses.get('results', courses))} courses")
    else:
        print(f"❌ Failed to list courses: {courses_response.status_code}")
        
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
```

Run it:
```bash
cd /home/parum/PycharmProjects/learn_system/backend
python3 test_api.py
```

## Testing with cURL

### Quick Test Script

Create `test_endpoints.sh`:

```bash
#!/bin/bash

echo "=== Testing API Endpoints ==="

# Test 1: Public courses (no auth)
echo -e "\n1. Testing public courses (no auth)..."
curl -s http://localhost:8000/api/courses/ | python3 -m json.tool

# Test 2: Login
echo -e "\n\n2. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@lms.edu", "password": "your_password"}')

echo $LOGIN_RESPONSE | python3 -m json.tool

# Extract token (requires jq)
# TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access')

# Test 3: Get current user (with token)
# echo -e "\n\n3. Testing /api/auth/me/ (with auth)..."
# curl -s http://localhost:8000/api/auth/me/ \
#   -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Make it executable and run:
```bash
chmod +x test_endpoints.sh
./test_endpoints.sh
```

## Common Issues & Solutions

### Issue: 404 on /api/auth/me

**Solution:** Make sure to include the trailing slash: `/api/auth/me/` (with APPEND_SLASH=True, Django will redirect)

### Issue: Unauthorized on /api/courses/

**Solutions:**
- If you want to access without auth: Only published public courses are visible
- If you want to see all courses: Include the Authorization header with a valid JWT token

### Issue: Invalid token

**Solutions:**
- Token might be expired (1 hour lifetime)
- Use the refresh endpoint to get a new access token
- Login again to get fresh tokens

## Next Steps

1. **Create a course** using the authenticated admin/teacher account
2. **Create test students** and enroll them in courses
3. **Test the full workflow**: login → create course → enroll students → view as student
4. **Set up frontend** to consume these APIs

## API Documentation

Full interactive API documentation is available at:
- Swagger UI: http://localhost:8000/api/docs/
- OpenAPI Schema: http://localhost:8000/api/schema/

