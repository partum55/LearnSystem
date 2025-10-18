#!/usr/bin/env python3
"""
Quick API test script to verify endpoints are working
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoints():
    print("=" * 60)
    print("API Endpoint Testing")
    print("=" * 60)
    
    # Test 1: Public courses (no auth)
    print("\n1. Testing GET /api/courses/ (no auth - should show public courses)")
    try:
        response = requests.get(f"{BASE_URL}/api/courses/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            courses = data.get('results', data) if isinstance(data, dict) else data
            print(f"   ✅ Success! Found {len(courses)} public courses")
        else:
            print(f"   ⚠️  Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Auth endpoints
    print("\n2. Testing POST /api/auth/login/")
    print("   Note: Update credentials in the script if needed")
    
    # Try with a test account
    credentials = [
        {"email": "admin@lms.edu", "password": "admin123"},
        {"email": "admin@test.com", "password": "admin123"},
    ]
    
    access_token = None
    refresh_token = None
    
    for cred in credentials:
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login/",
                json=cred
            )
            if response.status_code == 200:
                data = response.json()
                access_token = data.get('access')
                refresh_token = data.get('refresh')
                user = data.get('user', {})
                print(f"   ✅ Login successful!")
                print(f"   User: {user.get('email')} ({user.get('role')})")
                print(f"   Token: {access_token[:50] if access_token else 'N/A'}...")
                break
            else:
                print(f"   ⚠️  Failed with {cred['email']}: {response.status_code}")
        except Exception as e:
            print(f"   ⚠️  Error with {cred['email']}: {e}")
    
    if not access_token:
        print("\n   ℹ️  No credentials worked. Please create a user or update credentials.")
        print("   Run: python3 manage.py createsuperuser")
        return
    
    # Test 3: Get current user
    print("\n3. Testing GET /api/auth/me/ (with auth)")
    try:
        response = requests.get(
            f"{BASE_URL}/api/auth/me/",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            user = response.json()
            print(f"   ✅ Current user: {user.get('display_name')} ({user.get('email')})")
        else:
            print(f"   ❌ Failed: {response.text[:100]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Authenticated courses
    print("\n4. Testing GET /api/courses/ (with auth - should show all accessible)")
    try:
        response = requests.get(
            f"{BASE_URL}/api/courses/",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            courses = data.get('results', data) if isinstance(data, dict) else data
            print(f"   ✅ Success! Found {len(courses)} courses")
            if len(courses) > 0:
                print(f"   First course: {courses[0].get('title_en', 'N/A')}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 5: API docs
    print("\n5. Testing API Documentation")
    try:
        response = requests.get(f"{BASE_URL}/api/docs/")
        print(f"   Swagger UI Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ API docs available at: {BASE_URL}/api/docs/")
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
    
    print("\n" + "=" * 60)
    print("Testing Complete!")
    print("=" * 60)
    print("\nℹ️  Full testing guide available in: API_TESTING_GUIDE.md")
    print(f"ℹ️  Swagger UI: {BASE_URL}/api/docs/")
    print("\n")

if __name__ == "__main__":
    test_endpoints()

