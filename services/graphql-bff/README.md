# GraphQL BFF (Backend-for-Frontend)

GraphQL aggregation layer for the Event Management System microservices.

## 🚀 Features

- **Unified GraphQL API** - Single endpoint for all microservices
- **Query Aggregation** - Fetch data from multiple services in one query
- **JWT Authentication** - Token forwarding to downstream services
- **Type-Safe** - TypeScript implementation
- **Auto-Generated Docs** - GraphQL Playground/Apollo Studio
- **Nested Resolvers** - Automatic relationship resolution
- **Aggregated Queries** - Dashboard and detail views

## 📋 Prerequisites

- Node.js 20+
- All microservices running (Auth, Events, Vendors, Tasks, Attendees, Notifications)

## 🛠️ Installation

```bash
npm install
```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=4000
NODE_ENV=development

# Microservice URLs
AUTH_SERVICE_URL=http://auth-service:8000
EVENTS_SERVICE_URL=http://events-service:3000
VENDORS_SERVICE_URL=http://vendors-service:8000
TASKS_SERVICE_URL=http://tasks-service:3000
ATTENDEES_SERVICE_URL=http://attendees-service:3000
NOTIFICATIONS_SERVICE_URL=http://notifications-service:3001

# JWT
JWT_SECRET=your-secret-key-here

# CORS
CORS_ORIGIN=*
```

## 🏃 Running Locally

```bash
# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production
npm start
```

Server will start at: `http://localhost:4000/graphql`

## 🐳 Docker

```bash
# Build
docker build -t graphql-bff:latest .

# Run
docker run -p 4000:4000 \
  -e AUTH_SERVICE_URL=http://host.docker.internal:8000 \
  -e EVENTS_SERVICE_URL=http://host.docker.internal:3000 \
  graphql-bff:latest
```

## ☸️ Kubernetes Deployment

```bash
# Deploy all resources
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n event-management -l app=graphql-bff
kubectl logs -n event-management -l app=graphql-bff
```

Access at: `https://graphql.c-8c5e74f.kyma.ondemand.com/graphql`

## 📖 GraphQL Schema

### Queries

```graphql
# Get all events with pagination
query {
  events(page: 1, limit: 10, sort: "-createdAt") {
    data {
      id
      name
      description
      location
      startAt
      endAt
    }
    pagination {
      total
      page
      totalPages
    }
  }
}

# Get event with all details (aggregated)
query {
  eventWithDetails(id: "1") {
    event {
      id
      name
      description
    }
    tasks {
      id
      title
      status
    }
    attendees {
      id
      status
      user {
        email
      }
    }
    vendors {
      id
      name
    }
  }
}

# User dashboard (requires authentication)
query {
  userDashboard {
    user {
      id
      email
      role
    }
    upcomingEvents {
      id
      name
      startAt
    }
    myRSVPs {
      id
      status
      event {
        name
      }
    }
    myTasks {
      id
      title
      status
    }
    unreadNotifications {
      id
      message
    }
  }
}
```

### Mutations

```graphql
# Login
mutation {
  login(email: "user@example.com", password: "password") {
    token
    user {
      id
      email
      role
    }
  }
}

# Create event
mutation {
  createEvent(
    name: "Tech Conference 2025"
    description: "Annual tech conference"
    location: "San Francisco"
    startAt: "2025-06-01T09:00:00Z"
    endAt: "2025-06-01T18:00:00Z"
    organizerId: 1
  ) {
    id
    name
  }
}

# Create RSVP
mutation {
  createRSVP(eventId: 1, status: "going") {
    id
    status
    event {
      name
    }
  }
}
```

## 🔐 Authentication

Include JWT token in requests:

```http
Authorization: Bearer <your-jwt-token>
```

GraphQL Playground example:

```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🌟 Key Features

### 1. Query Aggregation
Fetch data from multiple microservices in a single query:

```graphql
query {
  event(id: "1") {
    name
    tasks {
      title
      vendor {
        name
      }
    }
    attendees {
      user {
        email
      }
    }
  }
}
```

### 2. Nested Resolvers
Automatically resolves relationships across services

### 3. Aggregated Views
- `eventWithDetails` - Event + Tasks + Attendees + Vendors
- `userDashboard` - User + Events + RSVPs + Tasks + Notifications

### 4. Type Safety
Full TypeScript implementation with type checking

## 📊 API Endpoints

- **GraphQL Endpoint**: `/graphql`
- **Health Check**: `/.well-known/apollo/server-health`
- **Root**: `/`

## 🧪 Testing with GraphQL Playground

1. Navigate to `http://localhost:4000/graphql`
2. Add Authorization header (HTTP HEADERS tab):
   ```json
   {
     "Authorization": "Bearer YOUR_TOKEN"
   }
   ```
3. Run queries and mutations

## 🏗️ Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
┌──────▼──────┐
│  GraphQL    │
│     BFF     │ (Port 4000)
└──────┬──────┘
       │
       ├────────────────┬────────────────┬─────────────┐
       │                │                │             │
┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼─────┐  ┌───▼───┐
│    Auth     │  │   Events    │  │  Vendors  │  │ Tasks │
│  Service    │  │  Service    │  │  Service  │  │ Svc   │
└─────────────┘  └─────────────┘  └───────────┘  └───────┘
```

## 📝 Development

```bash
# Install dependencies
npm install

# Run in watch mode
npm run dev

# Type checking
npx tsc --noEmit

# Build
npm run build
```

## 🐛 Troubleshooting

**Connection errors to microservices:**
- Check service URLs in environment variables
- Ensure all services are running
- Verify network connectivity

**Authentication errors:**
- Verify JWT_SECRET matches auth service
- Check token format (Bearer prefix)
- Ensure token hasn't expired

**GraphQL errors:**
- Check Apollo Server logs
- Verify schema syntax
- Test resolvers individually

## 📚 Resources

- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [GraphQL Spec](https://graphql.org/)
- [TypeScript](https://www.typescriptlang.org/)

## 🤝 Contributing

Team 6 - API Based Products Course
