#!/bin/bash

# Simple API Test Script
echo "======================================"
echo "Testing Spring Boot API"
echo "======================================"
echo ""

# Test Health Endpoint
echo "1. Testing Health Endpoint..."
curl -w "\nHTTP Status: %{http_code}\n" http://localhost:8080/api/actuator/health
echo ""
echo ""

# Test Register Endpoint
echo "2. Testing User Registration..."
curl -w "\nHTTP Status: %{http_code}\n" \
  -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student123@ucu.edu.ua",
    "password": "StudentPass123!",
    "displayName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "locale": "EN"
  }'
echo ""
echo ""

# Test Login (will fail if user doesn't exist)
echo "3. Testing Login..."
curl -w "\nHTTP Status: %{http_code}\n" \
  -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student123@ucu.edu.ua",
    "password": "StudentPass123!"
  }'
echo ""
echo ""

echo "======================================"
echo "API Tests Complete"
echo "======================================"

