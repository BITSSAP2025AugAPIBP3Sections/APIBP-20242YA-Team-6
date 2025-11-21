# Tasks Service

A microservice for managing event tasks and vendor assignments with real-time notifications.

## Overview
The Tasks Service is a core component of the event management system that handles task creation, assignment to vendors, status tracking, and automated notifications. It provides role-based access control, advanced querying capabilities, and seamless integration with other microservices via Kafka events.

**Key Capabilities:**
- Task lifecycle management with status transitions
- Automatic vendor assignment and notification system
- Real-time updates via Kafka event streaming
- Role-based security and data access controls
- Advanced filtering and pagination for large datasets

## Features
- ✅ **CRUD Operations**: Create, read, update, delete tasks with validation
- ✅ **Role-Based Access**: Admin, organizer, vendor, attendee permissions with data isolation
- ✅ **Status Management**: Workflow transitions (pending → in_progress → completed)
- ✅ **Vendor Assignment**: Assign tasks to vendors with automatic email notifications
- ✅ **Advanced Queries**: Pagination, sorting, filtering, field selection, and search
- ✅ **Event Integration**: Kafka notifications for task lifecycle events and external service calls
- ✅ **Modular Architecture**: MVC pattern with controllers, routes, middleware, validators, and utils

## Tech Stack
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **Messaging**: Kafka (task notifications)
- **Architecture**: Modular MVC structure

## Port
`8004`

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t tasks-service .
docker run -p 8004:8004 tasks-service
```

## API Endpoints

### Basic CRUD Operations
- `GET /v1/tasks` - List tasks with pagination, filtering, and sorting
- `POST /v1/tasks` - Create new task (admin/organizer only)
- `GET /v1/tasks/:id` - Get specific task by ID
- `PATCH /v1/tasks/:id` - Update task details or status
- `DELETE /v1/tasks/:id` - Delete task (admin/organizer only)

### Query Parameters (GET /v1/tasks)
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (default: 1) | `?page=2` |
| `page_size` | integer | Items per page (1-100, default: 10) | `?page_size=20` |
| `sort_by` | string | Sort field (id, title, status, createdAt, etc.) | `?sort_by=createdAt` |
| `sort_order` | string | Sort direction (asc, desc) | `?sort_order=desc` |
| `status` | string | Filter by status | `?status=pending` |
| `event_id` | integer | Filter by event ID | `?event_id=123` |
| `vendor_id` | integer | Filter by vendor ID | `?vendor_id=456` |
| `title` | string | Filter by title (partial match) | `?title=setup` |
| `search` | string | Search in title/description | `?search=catering` |
| `fields` | string | Select specific fields | `?fields=id,title,status` |

### Query Examples
```bash
# Get paginated pending tasks for event 123
GET /v1/tasks?event_id=123&status=pending&page=1&page_size=20

# Search for catering tasks, sorted by date
GET /v1/tasks?search=catering&sort_by=createdAt&sort_order=desc

# Get vendor's tasks with minimal fields
GET /v1/tasks?vendor_id=456&fields=id,title,status

# Combined filtering and sorting
GET /v1/tasks?status=in_progress&sort_by=title&sort_order=asc&page=2
```

## Environment Variables
```env
PORT=8004
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasks
DB_USER=tasks
DB_PASSWORD=taskspw
SECRET_KEY=your-jwt-secret
KAFKA_BROKERS=localhost:9092
```

## Database Schema
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    event_id INTEGER NOT NULL,
    vendor_id INTEGER,
    organizer_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


## Integration & Events

### Kafka Events Published

| Event Type            | Trigger                 | Payload                  | Recipients         |
|:----------------------|:-----------------------:|--------------------------|-------------------:|
| `task.created`        | New task created        | Task details, event info | Event stakeholders |
| `task.assigned`       | Task assigned to vendor | Task + vendor details    | Assigned vendor    |
| `task.status_updated` | Status change           | Old/new status, task info | Task organizer    |

### External Service Calls
- **Auth Service** (`8001`): Fetch user emails for notifications
- **Vendors Service** (`8003`): Retrieve vendor details and user mapping
- **Kafka** (`9092`): Publish task lifecycle events

### Response Format
All LIST endpoints return paginated responses:
```json
{
  "data": [
    {
      "id": "1",
      "title": "Setup venue",
      "description": "Arrange chairs and tables",
      "status": "pending",
      "eventId": "123",
      "vendorId": "456",
      "organizerId": "789",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_count": 25,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false,
    "next_page": 2,
    "previous_page": null
  }
}
```

## Health Check
```bash
GET /health
# Response: {"status": "ok", "service": "tasks"}
```

## Development Notes
- **Database**: PostgreSQL with connection pooling
- **Validation**: Express-validator for input validation
- **Authentication**: JWT token verification
- **Error Handling**: Structured error responses with appropriate HTTP status codes
- **Architecture**: Modular structure with separate controllers, routes, middleware, validators, and utilities
