#!/usr/bin/env bash
# Test that POST /api/v1/device/report returns 400 Invalid JSON when body is invalid.
# Usage: DEVICE_API_KEY=your_key ./scripts/test-device-report-invalid-json.sh
# Or:   export DEVICE_API_KEY=your_key && ./scripts/test-device-report-invalid-json.sh

set -e
BASE_URL="${BASE_URL:-https://tip.live}"
if [ -z "${DEVICE_API_KEY}" ]; then
  echo "Error: DEVICE_API_KEY is not set. Set it in the environment to run this test."
  echo "Example: DEVICE_API_KEY=your_key $0"
  exit 1
fi

echo "Testing POST ${BASE_URL}/api/v1/device/report with invalid JSON body..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/device/report" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${DEVICE_API_KEY}" \
  -d 'not json')
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -n 1)

if [ "$CODE" = "400" ] && echo "$BODY" | grep -q "Invalid JSON"; then
  echo "PASS: Got 400 with Invalid JSON response."
  echo "Body: $BODY"
  exit 0
else
  echo "FAIL: Expected 400 with 'Invalid JSON'. Got HTTP $CODE"
  echo "Body: $BODY"
  exit 1
fi
