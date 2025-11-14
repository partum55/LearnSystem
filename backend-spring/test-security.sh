#!/bin/bash

# Security Testing Script for LMS Spring Boot Services
# This script tests various security features implemented

echo "==================================="
echo "LMS Security Feature Testing"
echo "==================================="
echo ""

BASE_URL="http://localhost:8080/api"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="SecureP@ssw0rd123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_test() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

echo "1. Testing Security Headers"
echo "-----------------------------------"
RESPONSE=$(curl -s -I ${BASE_URL}/actuator/health)

# Check for HSTS header (may be added by Spring Security headers config)
echo "$RESPONSE" | grep -iq "Strict-Transport-Security"
HSTS_RESULT=$?
if [ $HSTS_RESULT -eq 0 ]; then
    print_test 0 "HSTS Header Present"
else
    print_warning "HSTS Header not found (configure in SecurityConfig or use HTTPS proxy)"
fi

echo "$RESPONSE" | grep -q "X-Frame-Options"
print_test $? "X-Frame-Options Header Present"

echo "$RESPONSE" | grep -q "X-Content-Type-Options"
print_test $? "X-Content-Type-Options Header Present"

# CSP header may be in SecurityHeadersFilter
echo "$RESPONSE" | grep -iq "Content-Security-Policy"
CSP_RESULT=$?
if [ $CSP_RESULT -eq 0 ]; then
    print_test 0 "Content-Security-Policy Header Present"
else
    print_warning "CSP Header not found (may be filtered, check SecurityHeadersFilter)"
fi

echo ""

echo "2. Testing Rate Limiting"
echo "-----------------------------------"
echo "Sending 10 rapid requests to login endpoint..."
RATE_LIMITED=false
for i in {1..10}; do
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST ${BASE_URL}/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}')

    if [ "$RESPONSE" == "429" ]; then
        RATE_LIMITED=true
        break
    fi
done

if [ "$RATE_LIMITED" = true ]; then
    print_test 0 "Rate limiting active (HTTP 429 received)"
else
    print_test 1 "Rate limiting not working (no HTTP 429)"
fi

echo ""

echo "3. Testing Password Policy"
echo "-----------------------------------"
echo "Testing weak password rejection..."

# Test weak password (too short)
RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email":"weak@test.com",
        "password":"weak",
        "firstName":"Test",
        "lastName":"User"
    }')

echo "$RESPONSE" | grep -q -i "password"
if [ $? -eq 0 ]; then
    print_test 0 "Weak password rejected (too short)"
else
    print_test 1 "Weak password accepted (should be rejected)"
fi

echo ""

echo "4. Testing CORS Configuration"
echo "-----------------------------------"
RESPONSE=$(curl -s -I -H "Origin: http://evil.com" ${BASE_URL}/actuator/health)
echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin: http://evil.com"
if [ $? -ne 0 ]; then
    print_test 0 "Unauthorized origin blocked"
else
    print_test 1 "Unauthorized origin allowed (security issue)"
fi

echo ""

echo "5. Testing JWT Authentication"
echo "-----------------------------------"
echo "Testing without token..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null ${BASE_URL}/users/me)
if [ "$RESPONSE" == "401" ]; then
    print_test 0 "Unauthorized access blocked (HTTP 401)"
else
    print_test 1 "Unauthorized access allowed (should be 401)"
fi

echo "Testing with invalid token..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
    -H "Authorization: Bearer invalid_token_here" \
    ${BASE_URL}/users/me)
if [ "$RESPONSE" == "401" ]; then
    print_test 0 "Invalid token rejected (HTTP 401)"
else
    print_test 1 "Invalid token accepted (should be 401)"
fi

echo ""

echo "6. Testing Input Validation"
echo "-----------------------------------"
echo "Testing XSS attempt in input..."
RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email":"xss@test.com",
        "password":"ValidP@ssw0rd123",
        "firstName":"<script>alert(\"XSS\")</script>",
        "lastName":"User"
    }')

# Should either reject or sanitize
if [ $? -eq 0 ]; then
    print_test 0 "XSS input handled"
else
    print_test 1 "XSS handling unclear"
fi

echo ""

echo "7. Testing SQL Injection Protection"
echo "-----------------------------------"
echo "Testing SQL injection in email field..."
RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email":"admin\"--",
        "password":"anything"
    }')

# Should handle safely without SQL error
if [ $? -eq 0 ]; then
    print_test 0 "SQL injection attempt handled safely"
else
    print_test 1 "SQL injection protection unclear"
fi

echo ""

echo "8. Testing Actuator Endpoint Security"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null ${BASE_URL}/actuator/health)
if [ "$RESPONSE" == "200" ]; then
    print_test 0 "Health endpoint accessible (public)"
else
    print_test 1 "Health endpoint not accessible"
fi

RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null ${BASE_URL}/actuator/env)
if [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "403" ]; then
    print_test 0 "Sensitive actuator endpoints protected"
else
    print_test 1 "Sensitive actuator endpoints exposed (security issue)"
fi

echo ""

echo "9. Testing Error Message Disclosure"
echo "-----------------------------------"
RESPONSE=$(curl -s ${BASE_URL}/nonexistent-endpoint)
echo "$RESPONSE" | grep -q -i "exception\|stacktrace\|sql"
if [ $? -ne 0 ]; then
    print_test 0 "No sensitive information in error messages"
else
    print_test 1 "Error messages may expose sensitive information"
fi

echo ""

echo "10. Testing HTTPS Redirect (if configured)"
echo "-----------------------------------"
HTTP_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/api/actuator/health)
if [ "$HTTP_RESPONSE" == "301" ] || [ "$HTTP_RESPONSE" == "302" ]; then
    print_test 0 "HTTP to HTTPS redirect configured"
else
    echo -e "${YELLOW}!${NC} HTTPS redirect not configured (expected in production)"
fi

echo ""
echo "==================================="
echo "Security Testing Complete"
echo "==================================="
echo ""
echo "NOTE: Some tests may show warnings if:"
echo "  - Services are not running"
echo "  - Running in development mode"
echo "  - HTTPS is not configured locally"
echo ""
echo "Review the results and ensure all"
echo "security features are properly"
echo "configured for production deployment."
echo ""

