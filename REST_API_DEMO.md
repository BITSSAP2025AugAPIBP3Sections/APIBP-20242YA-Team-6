# REST API Demo - Event Management System

Concise REST API demonstration using Swagger UI with 4-person scenario.

## 🚀 Quick Start

**Access Swagger UI**: 
- **Local**: http://localhost:8000
- **Production**: https://event-management-api.c-8c5e74f.kyma.ondemand.com/v1

**Setup**: Click any endpoint → "Try it out" → Fill parameters → "Execute"

**Authentication**: Click "Authorize" (🔒) → Enter `Bearer YOUR_TOKEN` → "Authorize"

---

## 🎭 Characters

- **Alice Chen** - Event Organizer (admin)
- **Bob Martinez** - Vendor (AV Solutions Inc)
- **Carol Davis** - Vendor (Catering Masters)
- **David Kim** - Attendee

---

## 📋 ACT 1: Registration & Authentication

### Alice Registers (Admin)

`POST /v1/auth/register`

```json
{
  "email": "alice.chen@eventmanager.com",
  "password": "Alice2025!",
  "role": "admin"
}
```

**Save token as `ALICE_TOKEN`**

---

### Bob Registers (Vendor)

`POST /v1/auth/register`

```json
{
  "email": "bob.martinez@avsolutions.com",
  "password": "Bob2025!",
  "role": "vendor"
}
```

**Save token as `BOB_TOKEN`**

---

### Carol Registers (Vendor)

`POST /v1/auth/register`

```json
{
  "email": "carol.davis@cateringmasters.com",
  "password": "Carol2025!",
  "role": "vendor"
}
```

**Save token as `CAROL_TOKEN`**

---

### David Registers (Attendee)

`POST /v1/auth/register`

```json
{
  "email": "david.kim@techmail.com",
  "password": "David2025!",
  "role": "attendee"
}
```

**Save token as `DAVID_TOKEN`**

---

## 📋 ACT 2: Alice Creates Event

**🔐 Auth**: Use `ALICE_TOKEN`

### Create Tech Conference

`POST /v1/events`

```json
{
  "name": "Tech Conference 2025 - AI & Cloud Summit",
  "description": "Three-day conference featuring cutting-edge AI, Cloud Computing, and Web3 technologies with 50+ speakers",
  "location": "San Francisco Convention Center, Hall A",
  "startAt": "2025-06-15T09:00:00Z",
  "endAt": "2025-06-17T18:00:00Z",
  "organizerId": "1"
}
```

**Save `id` as `EVENT_ID=1`**

---

## 📋 ACT 3: Alice Adds Vendors

**🔐 Auth**: Use `ALICE_TOKEN`

### Add Bob's Company

`POST /v1/vendors`

```json
{
  "name": "AV Solutions Inc",
  "email": "bob.martinez@avsolutions.com",
  "phone": "+1-555-0100",
  "eventId": "1"
}
```

**Save `id` as `VENDOR_BOB_ID=1`**

---

### Add Carol's Company

`POST /v1/vendors`

```json
{
  "name": "Catering Masters",
  "email": "carol.davis@cateringmasters.com",
  "phone": "+1-555-0200",
  "eventId": "1"
}
```

**Save `id` as `VENDOR_CAROL_ID=2`**

---

## 📋 ACT 4: Alice Creates Tasks

**🔐 Auth**: Use `ALICE_TOKEN`

### AV Setup Task for Bob

`POST /v1/tasks`

```json
{
  "title": "Setup Complete AV System for Main Hall",
  "description": "Install 20+ speakers, 4K projectors, wireless microphones, and lighting in Hall A",
  "status": "pending",
  "eventId": "1",
  "vendorId": "1"
}
```

**Save `id` as `TASK_AV_ID=1`**

---

### Catering Task for Carol

`POST /v1/tasks`

```json
{
  "title": "Full Conference Catering Service",
  "description": "Provide breakfast, lunch, and refreshments for 500 attendees daily",
  "status": "pending",
  "eventId": "1",
  "vendorId": "2"
}
```

**Save `id` as `TASK_CATERING_ID=2`**

---

## 📋 ACT 5: Bob Updates Task

**🔐 Auth**: Use `BOB_TOKEN`

### Update Task to In Progress

`PATCH /v1/tasks/{id}` (id: 1)

```json
{
  "status": "in_progress"
}
```

---

## 📋 ACT 6: Carol Updates Task

**🔐 Auth**: Use `CAROL_TOKEN`

### Update Task to In Progress

`PATCH /v1/tasks/{id}` (id: 2)

```json
{
  "status": "in_progress"
}
```

---

## 📋 ACT 7: David RSVPs to Event

**🔐 Auth**: Use `DAVID_TOKEN`

### Browse Events

`GET /v1/events` (page: 1, page_size: 10, sort_by: startAt)

---

### Create RSVP

`POST /v1/events/{eventId}/attendees` (eventId: 1)

```json
{
  "status": "going"
}
```

**Save `id` as `RSVP_ID=1`**

---

## 📋 ACT 8: Alice Monitors Progress

**🔐 Auth**: Use `ALICE_TOKEN`

### Check Event Attendees

`GET /v1/events/{eventId}/attendees` (eventId: 1, status: going, sort_by: rsvpAt)

---

### Check Attendees with Field Selection

`GET /v1/attendees/{id}` (id: 1, fields: id,userId,status,rsvpAt)

---

### Check All Tasks

`GET /v1/tasks` (eventId: 1, status: in_progress)

---

## 📋 ACT 9: Vendors Complete Tasks

### Bob Completes Task

**🔐 Auth**: Use `BOB_TOKEN`

`PATCH /v1/tasks/{id}` (id: 1)

```json
{
  "status": "completed"
}
```

---

### Carol Completes Task

**🔐 Auth**: Use `CAROL_TOKEN`

`PATCH /v1/tasks/{id}` (id: 2)

```json
{
  "status": "completed"
}
```

---

## 📋 ACT 10: Final Updates

### David Updates RSVP

**� Auth**: Use `DAVID_TOKEN`

`PUT /v1/events/{eventId}/attendees` (eventId: 1)

```json
{
  "status": "going"
}
```

---

## 📋 ACT 11: Alice Updates Event

**🔐 Auth**: Use `ALICE_TOKEN`

### Update Event Status

`PATCH /v1/events/{id}` (id: 1)

```json
{
  "name": "Tech Conference 2025 - AI & Cloud Summit [CONFIRMED]",
  "description": "All vendor preparations complete!"
}
```

---

## � Bonus: Advanced Features

### Multi-Filter Attendee Search

`GET /v1/attendees` (eventId: 1, status: going, sort_by: rsvpAt, sort_order: desc)

---

### Field Selection

`GET /v1/attendees/{id}` (id: 1, fields: id,status,rsvpAt)

---

### Test Access Control (Should Fail)

**🔐 Auth**: Use `DAVID_TOKEN`

`DELETE /v1/events/{id}` (id: 1)

**Expected**: ❌ 403 Forbidden

---

---

## 📊 Summary

| **Service** | **Endpoints** | **Operations** |
|-------------|---------------|----------------|
| **Auth** | `/auth/register`, `/auth/me` | Register, Profile |
| **Events** | `/events`, `/events/{id}` | Create, List, Get, Update |
| **Vendors** | `/vendors`, `/vendors/{id}` | Create, List, Get, Update |
| **Tasks** | `/tasks`, `/tasks/{id}` | Create, List, Update |
| **Attendees** | `/attendees`, `/events/{eventId}/attendees` | RSVP, List, Update, Filter |

**Key Features**: JWT Auth, CRUD Operations, Pagination, Sorting, Filtering, Field Selection, RBAC

---

## 🎭 Characters

| Name | Role | Email |
|------|------|-------|
| Alice Chen | Admin | alice.chen@eventmanager.com |
| Bob Martinez | Vendor | bob.martinez@avsolutions.com |
| Carol Davis | Vendor | carol.davis@cateringmasters.com |
| David Kim | Attendee | david.kim@techmail.com |

---

**🎉 Demo Complete!** All major REST API endpoints covered.

---

## 🎯 Key Features Demonstrated

✅ **Authentication & Authorization** - JWT tokens, role-based access  
✅ **CRUD Operations** - Create, Read, Update, Delete for all resources  
✅ **Pagination** - Page-based pagination with size control  
✅ **Sorting** - Multi-field sorting with asc/desc order  
✅ **Filtering** - Complex filters by status, userId, eventId, dates  
✅ **Field Selection** - Optimize responses by selecting specific fields  
✅ **Error Handling** - 401 Unauthorized, 403 Forbidden, 404 Not Found  
✅ **Data Relationships** - Events → Tasks, Events → Attendees, Tasks → Vendors  

---

## � Character Summary

| Character | Role | Email | Key Actions |
|-----------|------|-------|-------------|
| **Alice Chen** | Event Organizer (Admin) | alice.chen@eventmanager.com | Created event, added vendors, assigned tasks, monitored progress |
| **Bob Martinez** | Vendor (AV Solutions) | bob.martinez@avsolutions.com | Handled AV setup task, updated status to completed |
| **Carol Davis** | Vendor (Catering Masters) | carol.davis@cateringmasters.com | Prepared catering, updated status to completed |
| **David Kim** | Attendee | david.kim@techmail.com | Browsed events, created RSVP, checked dashboard |

---

## �🔄 Quick Reset

To run the demo again from scratch:

```bash
docker-compose down -v
docker-compose up -d
```

This will clear all data and allow you to replay the entire scenario!

---

## 💡 Pro Tips for Swagger UI

1. **Organize Your Tokens**: Keep all 4 tokens in a text file for easy copy-paste:
   ```
   ALICE_TOKEN=eyJhbGc...
   BOB_TOKEN=eyJhbGc...
   CAROL_TOKEN=eyJhbGc...
   DAVID_TOKEN=eyJhbGc...
   ```

2. **Use Browser Developer Tools**: Open DevTools (F12) → Network tab to see actual HTTP requests and responses

3. **Bookmark Swagger URL**: http://localhost:8000 (or your Kong gateway URL)

4. **Expand All Sections**: Click on each tag (Auth, Events, Vendors, etc.) to see all available endpoints

5. **Check Response Schemas**: Click "Schema" tab to see expected response structure

6. **Test Error Cases**: Try operations without authorization or with wrong IDs to see error responses

7. **Monitor Service Logs**: Run in separate terminal:
   ```bash
   docker-compose logs -f attendees-service events-service
   ```

8. **Verify Kafka Messages**: Check notifications service logs to see event messages:
   ```bash
   docker-compose logs -f notifications-service
   ```

---

## 🚀 Next Steps

After completing this demo, you can:

1. **Try GraphQL BFF**: Access Apollo Studio at http://localhost:4000/graphql
2. **Explore OpenAPI Spec**: View complete API docs in `open-api-spec.yml`
3. **Test with Postman**: Import OpenAPI spec for automated testing
4. **Review Architecture**: Check `SERVICE_COMMUNICATION_ANALYSIS.md` for system architecture

---

**🎉 Demo Complete!** All major REST API endpoints covered with real-world scenario using Swagger UI.
