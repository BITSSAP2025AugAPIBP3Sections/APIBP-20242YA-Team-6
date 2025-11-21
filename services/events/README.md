# Events Service

## Overview
Core microservice for managing events in the Event Management Platform. Handles event CRUD operations, pagination, filtering, and publishes notifications via Kafka when events are created, updated, or deleted.

## Responsibilities
- ✅ Event creation, updates, and deletion
- ✅ Event listing with pagination, filtering, and sorting
- ✅ Field selection for optimized responses
- ✅ JWT-based authentication and role-based authorization
- ✅ Kafka event publishing for notifications
- ✅ Integration with Tasks and Attendees services
- ✅ Database persistence with PostgreSQL

## Tech Stack
- **Runtime:** Node.js 20
- **Framework:** Express.js 4.21.2
- **Database:** PostgreSQL 16 (pg driver)
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** express-validator
- **Message Queue:** Kafka (kafkajs)
- **CORS:** Enabled for all origins

## API Endpoints

### Health & Readiness
- `GET /health` - Health check
  - Response: `{ "status": "ok", "service": "events" }`

### Events Management (All require JWT authentication)

#### List Events with Pagination
- `GET /v1/events`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `page_size` (default: 10, max: 100) - Items per page
  - `sort_by` - Sort field: `id`, `name`, `location`, `startAt`, `endAt`, `organizerId`, `createdAt`
  - `sort_order` - Sort order: `asc` or `desc` (default: asc)
  - `fields` - Comma-separated field selection (e.g., `id,name,location`)
  - `name` - Filter by event name (case-insensitive partial match)
  - `location` - Filter by location (case-insensitive partial match)
  - `organizerId` - Filter by organizer ID (exact match)
  - `search` - Full-text search across name, description, and location
- **Response:**
  ```json
  {
    "events": [...],
    "pagination": {
      "current_page": 1,
      "page_size": 10,
      "total_count": 50,
      "total_pages": 5,
      "has_next": true,
      "has_previous": false,
      "next_page": 2,
      "previous_page": null
    },
    "filters": {...},
    "sorting": {"sort_by": "id", "sort_order": "asc"}
  }
  ```

#### Create Event
- `POST /v1/events`
- **Auth:** Requires `admin` or `organizer` role
- **Body:**
  ```json
  {
    "name": "Tech Conference 2025",
    "description": "Annual technology conference",
    "location": "San Francisco, CA",
    "startAt": "2025-06-01T09:00:00Z",
    "endAt": "2025-06-03T17:00:00Z",
    "organizerId": "user-123"
  }
  ```
- **Actions:**
  - Creates event in database
  - Publishes `event_created` notification to Kafka
  - Notifies Tasks service to create vendor task
  - Notifies Attendees service

#### Get Event by ID
- `GET /v1/events/:id`
- **Auth:** Required
- **Response:** Event object with all fields

#### Update Event
- `PATCH /v1/events/:id`
- **Auth:** Requires `admin` or `organizer` role
- **Body:** Partial event object (any fields to update)
- **Actions:**
  - Updates event in database
  - Publishes `event_updated` notification to Kafka
  - Fetches organizer email from Auth service

#### Delete Event
- `DELETE /v1/events/:id`
- **Auth:** Requires `admin` or `organizer` role
- **Actions:**
  - Deletes event from database
  - Publishes `event_deleted` notification to Kafka
  - Notifies all event stakeholders (organizer, attendees, vendors, task assignees)

## Database Schema

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  organizer_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Architecture

### Directory Structure
```
src/
├── config/
│   ├── database.js       # PostgreSQL connection pool & schema init
│   └── kafka.js          # Kafka producer & notification publisher
├── controllers/
│   └── eventController.js # Business logic for all event operations
├── middleware/
│   └── auth.js           # JWT verification & role-based access
├── routes/
│   └── eventRoutes.js    # Express route definitions
├── utils/
│   ├── externalServices.js  # Integration with Auth/Tasks/Attendees
│   └── stakeholders.js      # Fetch event stakeholders for notifications
├── validators/
│   └── eventValidators.js   # Input validation rules
└── index.js              # Express app initialization
```

### Key Features

#### Pagination System
- Page-based pagination with configurable page size
- Total count and page metadata in response
- Efficient offset-based queries

#### Filtering & Search
- Multiple filter types: exact match, partial match, full-text search
- Combinable filters (AND logic)
- Case-insensitive string matching

#### Field Selection
- Client can specify which fields to return
- Reduces payload size for bandwidth optimization
- Validates field names against allowed list

#### JWT Authentication
- Distributed validation (no auth service calls)
- Extracts user ID and role from token
- Shared secret key across all services

#### Role-Based Authorization
- Roles: `admin`, `organizer`, `vendor`, `attendee`
- Write operations restricted to admin/organizer
- Read operations available to all authenticated users

#### Kafka Integration
- Publishes notifications for all state changes
- Topic: `notifications`
- Includes event data and recipient information
- Asynchronous, non-blocking

#### External Service Integration
- **Auth Service:** Fetch user emails for notifications
- **Tasks Service:** Create vendor assignment tasks
- **Attendees Service:** Notify about event changes
- **Vendors Service:** Fetch vendor lists for notifications

## Environment Variables

```bash
# Server
PORT=8002                          # HTTP server port

# Database
DB_HOST=events-db                  # PostgreSQL host
DB_PORT=5432                       # PostgreSQL port
DB_NAME=events                     # Database name
DB_USER=events                     # Database user
DB_PASSWORD=eventspw               # Database password

# Authentication
JWT_SECRET=your-secret-key         # Shared JWT secret (must match auth service)

# Kafka
KAFKA_BROKERS=kafka:9092           # Kafka broker addresses (comma-separated)

# External Services
AUTH_SERVICE_URL=http://auth-service:8001
TASKS_SERVICE_URL=http://tasks-service:8004
ATTENDEES_SERVICE_URL=http://attendees-service:8005
VENDORS_SERVICE_URL=http://vendors-service:8003
```
## Responsibilities
- ✅ Event creation, updates, and deletion
- ✅ Event listing with pagination, filtering, and sorting
- ✅ Field selection for optimized responses
- ✅ JWT-based authentication and role-based authorization
- ✅ Kafka event publishing for notifications
- ✅ Integration with Tasks and Attendees services
- ✅ Database persistence with PostgreSQL

## Tech Stack
- **Runtime:** Node.js 20
- **Framework:** Express.js 4.21.2
- **Database:** PostgreSQL 16 (pg driver)
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** express-validator
- **Message Queue:** Kafka (kafkajs)
- **CORS:** Enabled for all origins

## API Endpoints

### Health & Readiness
- `GET /health` - Health check
  - Response: `{ "status": "ok", "service": "events" }`

### Events Management (All require JWT authentication)

#### List Events with Pagination
- `GET /v1/events`
- **Query Parameters:**
  - `page` (default: 1) - Page number
  - `page_size` (default: 10, max: 100) - Items per page
  - `sort_by` - Sort field: `id`, `name`, `location`, `startAt`, `endAt`, `organizerId`, `createdAt`
  - `sort_order` - Sort order: `asc` or `desc` (default: asc)
  - `fields` - Comma-separated field selection (e.g., `id,name,location`)
  - `name` - Filter by event name (case-insensitive partial match)
  - `location` - Filter by location (case-insensitive partial match)
  - `organizerId` - Filter by organizer ID (exact match)
  - `search` - Full-text search across name, description, and location
- **Response:**
  ```json
  {
    "events": [...],
    "pagination": {
      "current_page": 1,
      "page_size": 10,
      "total_count": 50,
      "total_pages": 5,
      "has_next": true,
      "has_previous": false,
      "next_page": 2,
      "previous_page": null
    },
    "filters": {...},
    "sorting": {"sort_by": "id", "sort_order": "asc"}
  }
  ```

#### Create Event
- `POST /v1/events`
- **Auth:** Requires `admin` or `organizer` role
- **Body:**
  ```json
  {
    "name": "Tech Conference 2025",
    "description": "Annual technology conference",
    "location": "San Francisco, CA",
    "startAt": "2025-06-01T09:00:00Z",
    "endAt": "2025-06-03T17:00:00Z",
    "organizerId": "user-123"
  }
  ```
- **Actions:**
  - Creates event in database
  - Publishes `event_created` notification to Kafka
  - Notifies Tasks service to create vendor task
  - Notifies Attendees service

#### Get Event by ID
- `GET /v1/events/:id`
- **Auth:** Required
- **Response:** Event object with all fields

#### Update Event
- `PATCH /v1/events/:id`
- **Auth:** Requires `admin` or `organizer` role
- **Body:** Partial event object (any fields to update)
- **Actions:**
  - Updates event in database
  - Publishes `event_updated` notification to Kafka
  - Fetches organizer email from Auth service

#### Delete Event
- `DELETE /v1/events/:id`
- **Auth:** Requires `admin` or `organizer` role
- **Actions:**
  - Deletes event from database
  - Publishes `event_deleted` notification to Kafka
  - Notifies all event stakeholders (organizer, attendees, vendors, task assignees)

## Database Schema

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  organizer_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Architecture

### Directory Structure
```
src/
├── config/
│   ├── database.js       # PostgreSQL connection pool & schema init
│   └── kafka.js          # Kafka producer & notification publisher
├── controllers/
│   └── eventController.js # Business logic for all event operations
├── middleware/
│   └── auth.js           # JWT verification & role-based access
├── routes/
│   └── eventRoutes.js    # Express route definitions
├── utils/
│   ├── externalServices.js  # Integration with Auth/Tasks/Attendees
│   └── stakeholders.js      # Fetch event stakeholders for notifications
├── validators/
│   └── eventValidators.js   # Input validation rules
└── index.js              # Express app initialization
```

### Key Features

#### Pagination System
- Page-based pagination with configurable page size
- Total count and page metadata in response
- Efficient offset-based queries

#### Filtering & Search
- Multiple filter types: exact match, partial match, full-text search
- Combinable filters (AND logic)
- Case-insensitive string matching

#### Field Selection
- Client can specify which fields to return
- Reduces payload size for bandwidth optimization
- Validates field names against allowed list

#### JWT Authentication
- Distributed validation (no auth service calls)
- Extracts user ID and role from token
- Shared secret key across all services

#### Role-Based Authorization
- Roles: `admin`, `organizer`, `vendor`, `attendee`
- Write operations restricted to admin/organizer
- Read operations available to all authenticated users

#### Kafka Integration
- Publishes notifications for all state changes
- Topic: `notifications`
- Includes event data and recipient information
- Asynchronous, non-blocking

#### External Service Integration
- **Auth Service:** Fetch user emails for notifications
- **Tasks Service:** Create vendor assignment tasks
- **Attendees Service:** Notify about event changes
- **Vendors Service:** Fetch vendor lists for notifications

## Environment Variables

```bash
# Server
PORT=8002                          # HTTP server port

# Database
DB_HOST=events-db                  # PostgreSQL host
DB_PORT=5432                       # PostgreSQL port
DB_NAME=events                     # Database name
DB_USER=events                     # Database user
DB_PASSWORD=eventspw               # Database password

# Authentication
JWT_SECRET=your-secret-key         # Shared JWT secret (must match auth service)

# Kafka
KAFKA_BROKERS=kafka:9092           # Kafka broker addresses (comma-separated)

# External Services
AUTH_SERVICE_URL=http://auth-service:8001
TASKS_SERVICE_URL=http://tasks-service:8004
ATTENDEES_SERVICE_URL=http://attendees-service:8005
VENDORS_SERVICE_URL=http://vendors-service:8003
```

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Kafka (optional, will warn if unavailable)

### Setup
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your local database credentials

# Run in development mode (auto-reload)
npm run dev

# Run in production mode
npm start
```

### Health Check
```bash
curl http://localhost:8002/health
```

### Test API
```bash
# Get JWT token from auth service first
TOKEN="your-jwt-token"

# List events
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8002/v1/events

# Create event (requires admin/organizer role)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "location": "Online",
    "startAt": "2025-12-01T10:00:00Z",
    "endAt": "2025-12-01T12:00:00Z",
    "organizerId": "user-123"
  }' \
  http://localhost:8002/v1/events
```

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Kafka (optional, will warn if unavailable)

### Setup
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your local database credentials

# Run in development mode (auto-reload)
npm run dev

# Run in production mode
npm start
```

### Health Check
```bash
curl http://localhost:8002/health
```

### Test API
```bash
# Get JWT token from auth service first
TOKEN="your-jwt-token"

# List events
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8002/v1/events

# Create event (requires admin/organizer role)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "location": "Online",
    "startAt": "2025-12-01T10:00:00Z",
    "endAt": "2025-12-01T12:00:00Z",
    "organizerId": "user-123"
  }' \
  http://localhost:8002/v1/events
```

## Docker

### Build
```bash
docker build -t events-service:v3 .
```

### Run
```bash
docker run -d \
  -p 8002:8002 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=securepassword \
  -e KAFKA_BROKERS=kafka:9092 \
  -e JWT_SECRET=your-secret \
  events-service:v3
```

## Kubernetes Deployment

### Resources
- **CPU Request:** 50m (0.05 cores)
- **CPU Limit:** 200m (0.2 cores)
- **Memory Request:** 128Mi
- **Memory Limit:** 246Mi
- **Replicas:** 1

### Probes
- **Liveness:** `GET /health` (every 10s after 30s delay)
- **Readiness:** `GET /health` (every 5s after 10s delay)

### Deploy

### Build
```bash
docker build -t events-service:v3 .
```

### Run
```bash
docker run -d \
  -p 8002:8002 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=securepassword \
  -e KAFKA_BROKERS=kafka:9092 \
  -e JWT_SECRET=your-secret \
  events-service:v3
```

## Kubernetes Deployment

### Resources
- **CPU Request:** 50m (0.05 cores)
- **CPU Limit:** 200m (0.2 cores)
- **Memory Request:** 128Mi
- **Memory Limit:** 246Mi
- **Replicas:** 1

### Probes
- **Liveness:** `GET /health` (every 10s after 30s delay)
- **Readiness:** `GET /health` (every 5s after 10s delay)

### Deploy
```bash
kubectl apply -f k8s/db.yaml      # PostgreSQL database
kubectl apply -f k8s/services.yaml # Kubernetes services
kubectl apply -f k8s/app.yaml      # Events service deployment
```

## Dependencies

### Production
- `express` ^4.21.2 - Web framework
- `pg` ^8.13.1 - PostgreSQL client
- `jsonwebtoken` ^9.0.2 - JWT authentication
- `express-validator` ^7.2.0 - Request validation
- `cors` ^2.8.5 - CORS middleware
- `kafkajs` ^2.2.4 - Kafka client
- `dotenv` ^16.4.7 - Environment variables

### Development
- `nodemon` ^3.1.9 - Auto-reload during development

## Feature Checklist

kubectl apply -f k8s/db.yaml      # PostgreSQL database
kubectl apply -f k8s/services.yaml # Kubernetes services
kubectl apply -f k8s/app.yaml      # Events service deployment
```

## Dependencies

### Production
- `express` ^4.21.2 - Web framework
- `pg` ^8.13.1 - PostgreSQL client
- `jsonwebtoken` ^9.0.2 - JWT authentication
- `express-validator` ^7.2.0 - Request validation
- `cors` ^2.8.5 - CORS middleware
- `kafkajs` ^2.2.4 - Kafka client
- `dotenv` ^16.4.7 - Environment variables

### Development
- `nodemon` ^3.1.9 - Auto-reload during development

## Feature Checklist

| Feature | Status |
|---------|--------|
| Tech stack chosen | ✅ |
| Tech stack chosen | ✅ |
| Health endpoint | ✅ |
| Event CRUD operations | ✅ |
| PostgreSQL persistence | ✅ |
| Database migrations | ✅ (auto-init on startup) |
| Pagination | ✅ |
| Filtering & search | ✅ |
| Field selection | ✅ |
| Sorting | ✅ |
| JWT authentication | ✅ |
| Role-based authorization | ✅ |
| Input validation | ✅ |
| Kafka integration | ✅ |
| External service integration | ✅ |
| Error handling | ✅ |
| Liveness probe | ✅ |
| Event CRUD operations | ✅ |
| PostgreSQL persistence | ✅ |
| Database migrations | ✅ (auto-init on startup) |
| Pagination | ✅ |
| Filtering & search | ✅ |
| Field selection | ✅ |
| Sorting | ✅ |
| JWT authentication | ✅ |
| Role-based authorization | ✅ |
| Input validation | ✅ |
| Kafka integration | ✅ |
| External service integration | ✅ |
| Error handling | ✅ |
| Liveness probe | ✅ |
| Readiness probe | ✅ |
| Docker containerization | ✅ |
| Kubernetes deployment | ✅ |
| OpenAPI documentation | ✅ (in root open-api-spec.yml) |
