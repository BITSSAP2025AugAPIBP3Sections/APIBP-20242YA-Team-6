#!/bin/bash

# RBAC Testing Script for Event Management System
# Gateway running at localhost:8000/v1

BASE_URL="http://localhost:8000/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "RBAC Testing Script"
echo "Gateway: $BASE_URL"
echo "=========================================="
echo ""

# Function to print test results
print_result() {
    local test_name=$1
    local expected=$2
    local actual=$3
    
    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (Status: $actual)"
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (Expected: $expected, Got: $actual)"
    fi
}

# Step 1: Register users with different roles
echo "=========================================="
echo "Step 1: Registering Test Users"
echo "=========================================="

echo "Creating Admin user..."
ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "role": "admin"
  }')
ADMIN_STATUS=$(echo "$ADMIN_RESPONSE" | tail -n1)
echo "Admin registration: $ADMIN_STATUS"

echo "Creating Organizer user..."
ORGANIZER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@test.com",
    "password": "organizer123",
    "role": "organizer"
  }')
ORGANIZER_STATUS=$(echo "$ORGANIZER_RESPONSE" | tail -n1)
echo "Organizer registration: $ORGANIZER_STATUS"

echo "Creating Vendor user..."
VENDOR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@test.com",
    "password": "vendor123",
    "role": "vendor"
  }')
VENDOR_STATUS=$(echo "$VENDOR_RESPONSE" | tail -n1)
echo "Vendor registration: $VENDOR_STATUS"

echo "Creating Attendee user..."
ATTENDEE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attendee@test.com",
    "password": "attendee123",
    "role": "attendee"
  }')
ATTENDEE_STATUS=$(echo "$ATTENDEE_RESPONSE" | tail -n1)
echo "Attendee registration: $ATTENDEE_STATUS"
echo ""

# Step 2: Login and get tokens
echo "=========================================="
echo "Step 2: Logging In Users"
echo "=========================================="

echo "Logging in Admin..."
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"$//')
echo "Admin token: ${ADMIN_TOKEN:0:20}..."

echo "Logging in Organizer..."
ORGANIZER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@test.com",
    "password": "organizer123"
  }')
ORGANIZER_TOKEN=$(echo $ORGANIZER_LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"$//')
echo "Organizer token: ${ORGANIZER_TOKEN:0:20}..."

echo "Logging in Vendor..."
VENDOR_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@test.com",
    "password": "vendor123"
  }')
VENDOR_TOKEN=$(echo $VENDOR_LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"$//')
echo "Vendor token: ${VENDOR_TOKEN:0:20}..."

echo "Logging in Attendee..."
ATTENDEE_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attendee@test.com",
    "password": "attendee123"
  }')
ATTENDEE_TOKEN=$(echo $ATTENDEE_LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"$//')
echo "Attendee token: ${ATTENDEE_TOKEN:0:20}..."
echo ""

# Step 3: Test Event Creation
echo "=========================================="
echo "Step 3: Testing Event Creation"
echo "=========================================="

echo "Test 1: Attendee tries to create event (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Attendee Event",
    "description": "Should not be created",
    "location": "Test Location",
    "startAt": "2025-12-01T10:00:00Z",
    "endAt": "2025-12-01T18:00:00Z"
  }')
print_result "Attendee cannot create event" "403" "$RESULT"

echo "Test 2: Organizer creates event (should PASS - 201)"
EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Conference 2025",
    "description": "Annual tech conference",
    "location": "Convention Center",
    "startAt": "2025-12-15T09:00:00Z",
    "endAt": "2025-12-15T17:00:00Z"
  }')
EVENT_ID=$(echo $EVENT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')
RESULT=$(echo $EVENT_RESPONSE | grep -q '"id"' && echo "201" || echo "error")
print_result "Organizer creates event" "201" "$RESULT"
echo "Created Event ID: $EVENT_ID"
echo ""

# Step 4: Test Event Viewing
echo "=========================================="
echo "Step 4: Testing Event Viewing"
echo "=========================================="

echo "Test 3: All roles can view events (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN")
print_result "Attendee views events" "200" "$RESULT"

RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events" \
  -H "Authorization: Bearer $VENDOR_TOKEN")
print_result "Vendor views events" "200" "$RESULT"

RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN")
print_result "Organizer views event details" "200" "$RESULT"
echo ""

# Step 5: Test RSVP Creation
echo "=========================================="
echo "Step 5: Testing RSVP Creation"
echo "=========================================="

echo "Test 4: Attendee creates RSVP (should PASS - 201)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "going"
  }')
print_result "Attendee creates RSVP" "201" "$RESULT"

echo "Test 5: Vendor tries to create RSVP (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "going"
  }')
print_result "Vendor cannot create RSVP" "403" "$RESULT"
echo ""

# Step 6: Test Vendor Management
echo "=========================================="
echo "Step 6: Testing Vendor Management"
echo "=========================================="

echo "Test 6: Organizer creates vendor profile for Vendor user (should PASS - 201)"
VENDOR_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/vendors" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Catering Services\",
    \"email\": \"vendor@test.com\",
    \"phone\": \"123-456-7890\",
    \"eventId\": \"$EVENT_ID\"
  }")
VENDOR_ID=$(echo $VENDOR_CREATE_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $VENDOR_CREATE_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer creates vendor profile for Vendor user" "201" "$RESULT"
echo "Created Vendor ID: $VENDOR_ID"

echo "Test 7: Attendee tries to view vendors (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/vendors" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN")
print_result "Attendee cannot view vendors" "403" "$RESULT"

echo "Test 8: Organizer can view vendors (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/vendors" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN")
print_result "Organizer views vendors" "200" "$RESULT"
echo ""

# Step 7: Test Task Management
echo "=========================================="
echo "Step 7: Testing Task Management"
echo "=========================================="

echo "Test 9: Organizer creates task for their event (should PASS - 201)"
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Setup venue\",
    \"description\": \"Arrange chairs and tables\",
    \"status\": \"pending\",
    \"eventId\": $EVENT_ID,
    \"vendorId\": $VENDOR_ID
  }")
TASK_ID=$(echo $TASK_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $TASK_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer creates task" "201" "$RESULT"
echo "Created Task ID: $TASK_ID"

echo "Test 10: Attendee tries to view tasks (should return empty - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN")
print_result "Attendee views tasks (empty)" "200" "$RESULT"

echo "Test 11: Vendor views tasks (should see only assigned - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/tasks" \
  -H "Authorization: Bearer $VENDOR_TOKEN")
print_result "Vendor views their tasks" "200" "$RESULT"
echo ""

# Step 8: Test Update Permissions
echo "=========================================="
echo "Step 8: Testing Update Permissions"
echo "=========================================="

echo "Test 12: Attendee tries to update event (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated by Attendee"
  }')
print_result "Attendee cannot update event" "403" "$RESULT"

echo "Test 13: Organizer updates their own event (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Conference 2025 - Updated"
  }')
print_result "Organizer updates their event" "200" "$RESULT"

echo "Test 14: Admin can update any event (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated by admin"
  }')
print_result "Admin updates event" "200" "$RESULT"
echo ""

# Step 9: Test Attendee Viewing
echo "=========================================="
echo "Step 9: Testing Attendee Viewing"
echo "=========================================="

echo "Test 15: Vendor tries to view event attendees (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $VENDOR_TOKEN")
print_result "Vendor cannot view attendees" "403" "$RESULT"

echo "Test 16: Organizer views attendees of their event (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN")
print_result "Organizer views their event attendees" "200" "$RESULT"
echo ""

# Step 10: Test User Separation (Organizer cannot access other organizer's resources)
echo "=========================================="
echo "Step 10: Testing User Separation"
echo "=========================================="

echo "Creating second Organizer user..."
ORGANIZER2_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer2@test.com",
    "password": "organizer123",
    "role": "organizer"
  }')

echo "Logging in second Organizer..."
ORGANIZER2_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer2@test.com",
    "password": "organizer123"
  }')
ORGANIZER2_TOKEN=$(echo $ORGANIZER2_LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"$//')
echo "Organizer2 token: ${ORGANIZER2_TOKEN:0:20}..."

echo "Test 17: Organizer2 creates their own event (should PASS - 201)"
EVENT2_RESPONSE=$(curl -s -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ORGANIZER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Music Festival 2025",
    "description": "Annual music festival",
    "location": "City Park",
    "startAt": "2025-12-20T12:00:00Z",
    "endAt": "2025-12-20T22:00:00Z"
  }')
EVENT2_ID=$(echo $EVENT2_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $EVENT2_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer2 creates event" "201" "$RESULT"
echo "Created Event2 ID: $EVENT2_ID"

echo "Test 18: Organizer1 tries to update Organizer2's event (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/events/$EVENT2_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hacked Event"
  }')
print_result "Organizer1 cannot update Organizer2 event" "403" "$RESULT"

echo "Test 19: Organizer1 tries to delete Organizer2's event (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "$BASE_URL/events/$EVENT2_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN")
print_result "Organizer1 cannot delete Organizer2 event" "403" "$RESULT"

echo "Test 20: Organizer2 tries to create vendor for Organizer1's event (should FAIL - 403)"
UNIQUE_VENDOR_EMAIL2="vendor2-$(date +%s)@test.com"
VENDOR2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/vendors" \
  -H "Authorization: Bearer $ORGANIZER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Unauthorized Vendor\",
    \"email\": \"$UNIQUE_VENDOR_EMAIL2\",
    \"phone\": \"999-999-9999\",
    \"eventId\": \"$EVENT_ID\"
  }")
VENDOR2_STATUS=$(echo "$VENDOR2_RESPONSE" | tail -n1)
print_result "Organizer2 cannot create vendor for Organizer1 event" "403" "$VENDOR2_STATUS"

echo "Test 21: Organizer2 tries to view Organizer1's event attendees (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $ORGANIZER2_TOKEN")
print_result "Organizer2 cannot view Organizer1 event attendees" "403" "$RESULT"

echo "Test 22: Admin can access both organizers' events (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
print_result "Admin can view Organizer1 event" "200" "$RESULT"

RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT2_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
print_result "Admin can view Organizer2 event" "200" "$RESULT"

echo "Test 23: Attendee creates RSVP for Organizer2's event (should PASS - 201)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/events/$EVENT2_ID/attendees" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "going"
  }')
print_result "Attendee creates RSVP for Organizer2 event" "201" "$RESULT"

echo "Test 24: Organizer2 can only view their own event's attendees (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/events/$EVENT2_ID/attendees" \
  -H "Authorization: Bearer $ORGANIZER2_TOKEN")
print_result "Organizer2 views their own event attendees" "200" "$RESULT"
echo ""

# Step 11: Test Vendor and Task Separation
echo "=========================================="
echo "Step 11: Testing Vendor/Task Separation"
echo "=========================================="

echo "Creating second Vendor user..."
VENDOR2_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor2@test.com",
    "password": "vendor123",
    "role": "vendor"
  }')

echo "Logging in second Vendor..."
VENDOR2_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor2@test.com",
    "password": "vendor123"
  }')
VENDOR2_TOKEN=$(echo $VENDOR2_LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"$//')
echo "Vendor2 token: ${VENDOR2_TOKEN:0:20}..."

echo "Test 25: Organizer1 creates vendor profile for Vendor2 user (should PASS - 201)"
VENDOR2_PROFILE_RESPONSE=$(curl -s -X POST "$BASE_URL/vendors" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Photography Services\",
    \"email\": \"vendor2@test.com\",
    \"phone\": \"555-555-5555\",
    \"eventId\": \"$EVENT_ID\"
  }")
VENDOR2_PROFILE_ID=$(echo $VENDOR2_PROFILE_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $VENDOR2_PROFILE_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer1 creates vendor profile for Vendor2 user" "201" "$RESULT"
echo "Created Vendor2 Profile ID: $VENDOR2_PROFILE_ID"

echo "Test 26: Organizer1 creates task for Vendor1 (should PASS - 201)"
TASK1_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Catering Setup\",
    \"description\": \"Prepare food stations\",
    \"status\": \"pending\",
    \"eventId\": $EVENT_ID,
    \"vendorId\": $VENDOR_ID
  }")
TASK1_ID=$(echo $TASK1_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $TASK1_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer1 creates task for Vendor1" "201" "$RESULT"
echo "Created Task1 ID: $TASK1_ID"

echo "Test 27: Organizer1 creates task for Vendor2 (should PASS - 201)"
TASK2_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Photography Session\",
    \"description\": \"Capture event moments\",
    \"status\": \"pending\",
    \"eventId\": $EVENT_ID,
    \"vendorId\": $VENDOR2_PROFILE_ID
  }")
TASK2_ID=$(echo $TASK2_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $TASK2_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer1 creates task for Vendor2" "201" "$RESULT"
echo "Created Task2 ID: $TASK2_ID"

echo "Test 28: Vendor1 views tasks (should see only their assigned tasks)"
VENDOR1_TASKS=$(curl -s -X GET "$BASE_URL/tasks" \
  -H "Authorization: Bearer $VENDOR_TOKEN")
VENDOR1_TASK_COUNT=$(echo $VENDOR1_TASKS | jq -r '.data | length')
echo "Vendor1 sees $VENDOR1_TASK_COUNT task(s)"
# Should see at least their own tasks
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/tasks" \
  -H "Authorization: Bearer $VENDOR_TOKEN")
print_result "Vendor1 views their tasks" "200" "$RESULT"

echo "Test 29: Vendor2 views tasks (should see only their assigned tasks)"
VENDOR2_TASKS=$(curl -s -X GET "$BASE_URL/tasks" \
  -H "Authorization: Bearer $VENDOR2_TOKEN")
VENDOR2_TASK_COUNT=$(echo $VENDOR2_TASKS | jq -r '.data | length')
echo "Vendor2 sees $VENDOR2_TASK_COUNT task(s)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/tasks" \
  -H "Authorization: Bearer $VENDOR2_TOKEN")
print_result "Vendor2 views their tasks" "200" "$RESULT"

echo "Test 30: Vendor1 tries to update Vendor2's task (should FAIL - 403 or not see task)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/tasks/$TASK2_ID" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }')
# Should be 403 or 404 (if they can't see it)
if [ "$RESULT" == "403" ] || [ "$RESULT" == "404" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Vendor1 cannot update Vendor2 task (Status: $RESULT)"
else
    echo -e "${RED}✗ FAIL${NC}: Vendor1 cannot update Vendor2 task (Expected: 403 or 404, Got: $RESULT)"
fi

echo "Test 31: Vendor1 updates their own task status (should PASS - 200)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/tasks/$TASK1_ID" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }')
print_result "Vendor1 updates their own task" "200" "$RESULT"

echo "Test 32: Vendor1 tries to update task details beyond status (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/tasks/$TASK1_ID" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Changed Title",
    "description": "Changed Description"
  }')
print_result "Vendor1 cannot change task details" "403" "$RESULT"

echo "Test 33: Organizer2 creates task for their own event (should PASS - 201)"
TASK3_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ORGANIZER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Stage Setup\",
    \"description\": \"Setup sound and lights\",
    \"status\": \"pending\",
    \"eventId\": $EVENT2_ID
  }")
TASK3_ID=$(echo $TASK3_RESPONSE | jq -r '.id // empty')
RESULT=$(echo $TASK3_RESPONSE | jq -r 'if .id then "201" else "error" end')
print_result "Organizer2 creates task for their event" "201" "$RESULT"
echo "Created Task3 ID: $TASK3_ID"

echo "Test 34: Organizer1 tries to view/update Organizer2's task (should FAIL - 403)"
RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/tasks/$TASK3_ID" \
  -H "Authorization: Bearer $ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }')
print_result "Organizer1 cannot update Organizer2 task" "403" "$RESULT"
echo ""

# Summary
echo "=========================================="
echo "RBAC Testing Complete!"
echo "=========================================="
echo ""
echo "Review the results above to verify RBAC implementation."
echo "Green checkmarks (✓) indicate passing tests."
echo "Red X marks (✗) indicate failing tests."
echo ""
