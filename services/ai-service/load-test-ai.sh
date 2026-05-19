#!/bin/bash
# Load Test Script for AI Service
# Tests the AI service with concurrent requests
#
# Prerequisites:
# - jq installed
# - curl installed
# - AI service running on localhost:8085 (or set AI_SERVICE_URL)
#
# Usage: ./load-test-ai.sh [concurrent_users] [requests_per_user]

set -e

# Configuration
AI_SERVICE_URL="${AI_SERVICE_URL:-https://localhost:8085}"
CONCURRENT_USERS="${1:-10}"
REQUESTS_PER_USER="${2:-10}"
TOTAL_REQUESTS=$((CONCURRENT_USERS * REQUESTS_PER_USER))

echo "=================================================="
echo "AI Service Load Test"
echo "=================================================="
echo "Service URL: $AI_SERVICE_URL"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Requests per User: $REQUESTS_PER_USER"
echo "Total Requests: $TOTAL_REQUESTS"
echo "=================================================="

# Check if service is up
echo "Checking service health..."
if ! curl -s "$AI_SERVICE_URL/actuator/health" | jq -e '.status == "UP"' > /dev/null 2>&1; then
    echo "ERROR: AI service is not healthy at $AI_SERVICE_URL"
    exit 1
fi
echo "Service is healthy."

# Create temp directory for results
RESULTS_DIR=$(mktemp -d)
trap "rm -rf $RESULTS_DIR" EXIT

echo ""
echo "Starting load test..."
START_TIME=$(date +%s.%N)

# Function to run single user simulation
run_user() {
    local user_id=$1
    local results_file="$RESULTS_DIR/user_$user_id.json"

    echo "[]" > "$results_file"

    for i in $(seq 1 $REQUESTS_PER_USER); do
        local request_start=$(date +%s.%N)

        # Make request to content generation endpoint
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
            -X POST "$AI_SERVICE_URL/api/v1/ai/generate/content" \
            -H "Content-Type: application/json" \
            -H "X-User-Id: load-test-user-$user_id" \
            -d '{
                "courseTitle": "Load Test Course '$i'",
                "topic": "Introduction to Testing",
                "targetAudience": "Developers",
                "contentType": "module_description",
                "maxLength": 100
            }' 2>/dev/null || echo -e "\nerror\n0")

        local request_end=$(date +%s.%N)

        # Parse response
        local http_code=$(echo "$response" | tail -n2 | head -n1)
        local time_total=$(echo "$response" | tail -n1)

        # Append result
        local result="{\"user\":$user_id,\"request\":$i,\"status\":\"$http_code\",\"time\":$time_total}"

        # Update results file
        jq ". += [$result]" "$results_file" > "$results_file.tmp" && mv "$results_file.tmp" "$results_file"

        echo "User $user_id - Request $i: HTTP $http_code (${time_total}s)"
    done
}

# Run users in parallel
for user in $(seq 1 $CONCURRENT_USERS); do
    run_user $user &
done

# Wait for all to complete
wait

END_TIME=$(date +%s.%N)
TOTAL_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo ""
echo "=================================================="
echo "Load Test Results"
echo "=================================================="

# Aggregate results
SUCCESSFUL=0
FAILED=0
TOTAL_RESPONSE_TIME=0

for file in "$RESULTS_DIR"/user_*.json; do
    while read -r result; do
        status=$(echo "$result" | jq -r '.status')
        time=$(echo "$result" | jq -r '.time')

        if [[ "$status" == "200" || "$status" == "201" ]]; then
            SUCCESSFUL=$((SUCCESSFUL + 1))
        else
            FAILED=$((FAILED + 1))
        fi

        TOTAL_RESPONSE_TIME=$(echo "$TOTAL_RESPONSE_TIME + $time" | bc)
    done < <(jq -c '.[]' "$file")
done

AVG_RESPONSE_TIME=$(echo "scale=3; $TOTAL_RESPONSE_TIME / $TOTAL_REQUESTS" | bc)
REQUESTS_PER_SECOND=$(echo "scale=2; $TOTAL_REQUESTS / $TOTAL_TIME" | bc)
SUCCESS_RATE=$(echo "scale=2; $SUCCESSFUL * 100 / $TOTAL_REQUESTS" | bc)

echo "Total Time: ${TOTAL_TIME}s"
echo "Total Requests: $TOTAL_REQUESTS"
echo "Successful: $SUCCESSFUL"
echo "Failed: $FAILED"
echo "Success Rate: ${SUCCESS_RATE}%"
echo "Avg Response Time: ${AVG_RESPONSE_TIME}s"
echo "Requests/Second: $REQUESTS_PER_SECOND"
echo "=================================================="

# Determine pass/fail
if (( $(echo "$SUCCESS_RATE >= 95" | bc -l) )); then
    echo "✅ PASS: Success rate >= 95%"
    exit 0
else
    echo "❌ FAIL: Success rate < 95%"
    exit 1
fi

