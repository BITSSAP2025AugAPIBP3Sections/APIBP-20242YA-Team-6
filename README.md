## **Event Management Platform**

The application is  **event management platform** that enables organizers, vendors, and participants to interact seamlessly in planning and executing events.

### **Backend :**

Handles business logic and communicates with **Postgres databases**. Exposes **REST and GraphQL APIs** for operations such as event creation, vendor management, task assignment, notifications, event discovery, and RSVP tracking. Supports **real-time updates** via Kafka events for inter-service communication.

### **REST & GraphQL API:**

Acts as the bridge between frontend and backend. Supports operations like:

* **User authentication & role-based access** (admin, organizer, vendor, participant)
* **CRUD operations** for events, vendors, and tasks/deliverables
* **Event search, filtering, and discovery**
* **RSVP to events and viewing attendee status**
* **Vendor task tracking and status updates**
* **Notifications and alerts** for important updates

### **Core Features:**

**Organizer:**

* Create, update, and delete events
* Assign tasks to vendors and track progress
* Monitor event timeline and milestones

**Vendor:**

* View assigned tasks and deliverables
* Update task status and submit reports

**Participant / Attendee:**

* Discover events based on location, category, or date
* RSVP to events and manage attendance
* View event details, schedules, and notifications

**System-Wide:**

* Authentication and **role-based access control**
* Real-time notifications for critical updates
* Event-driven architecture for seamless inter-service communication

### **Team Members:**

- Mohd Kaif - 93018 - @kaifcoder 
- Meenu Singh - 93093 - @meenu155 
- Abhinav Yadav - 93064 - @DevAbhinav3033 
- Shruti Mishra - 93030 - @shrutim07 
- Shipra Singh - 93075 - @Shipra-Singh-Asd

## **Local Development Workflow**

Follow these steps to set up and run the complete Event Management Platform locally.

### **Prerequisites**

- Docker and Docker Compose installed
- Python 3.x installed
- Git installed

### **Step 1: Clone and Navigate to Project**

```bash
cd APIBP-20242YA-Team-6
```

### **Step 2: Start Services with Docker Compose**

Start all backend services (databases, APIs, Kong gateway):

```bash
docker-compose up -d
```

This will start:
- PostgreSQL databases for each service
- All microservices (auth, events, attendees, vendors, tasks, notifications)
- Kong API Gateway
- Any other required infrastructure

Wait for all services to be healthy. You can check the status with:

```bash
docker-compose ps
```

### **Step 3: Install and Configure Kong with Deck**

#### **Install Deck (Kong's Configuration Management Tool)**

**For macOS:**
```bash
# Using Homebrew
brew install deck

# Or download binary directly
curl -sL https://github.com/Kong/deck/releases/latest/download/deck_darwin_amd64.tar.gz -o deck.tar.gz
tar -xf deck.tar.gz -C /tmp
sudo cp /tmp/deck /usr/local/bin/
```

**For Linux:**
```bash
# Download and install
curl -sL https://github.com/Kong/deck/releases/latest/download/deck_linux_amd64.tar.gz -o deck.tar.gz
tar -xf deck.tar.gz -C /tmp
sudo cp /tmp/deck /usr/local/bin/
```

**For Windows:**
```bash
# Using Scoop
scoop install deck

# Or download from GitHub releases
# https://github.com/Kong/deck/releases/latest
```

#### **Verify Deck Installation**
```bash
deck version
```

#### **Configure Kong Gateway**

Sync the Kong configuration from the project:

```bash
deck gateway sync kong/kong.yml/kong.yaml --kong-addr http://localhost:8001
```

This will configure Kong with:
- API routes for all microservices
- Authentication policies
- Rate limiting
- Load balancing
- Any other gateway configurations

#### **Verify Kong Configuration**
```bash
# Check Kong admin API
curl http://localhost:8001/

# List configured services
curl http://localhost:8001/services

# List configured routes
curl http://localhost:8001/routes
```

### **Step 4: Run Test UI**

Start the test UI using Python's built-in HTTP server:

```bash
cd test-ui
python3 -m http.server 3000
```

The test UI will be available at: **http://localhost:3000**

### **Step 5: Access the Application**

Once everything is running:

- **Kong Gateway (API)**: http://localhost:8000
- **Kong Admin API**: http://localhost:8001
- **Test UI**: http://localhost:3000
- **Individual Services** (if needed for debugging):
  - Auth Service: Check docker-compose.yml for port
  - Events Service: Check docker-compose.yml for port
  - Attendees Service: Check docker-compose.yml for port
  - Vendors Service: Check docker-compose.yml for port
  - Tasks Service: Check docker-compose.yml for port
  - Notifications Service: Check docker-compose.yml for port

### **Development Commands**

#### **Stop Services**
```bash
docker-compose down
```

#### **View Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f <service-name>
```

#### **Rebuild Services (after code changes)**
```bash
docker-compose up --build
```

#### **Update Kong Configuration**
```bash
deck gateway sync kong/kong.yml/kong.yaml --kong-addr http://localhost:8001
```

#### **Database Access**
```bash
# Access PostgreSQL (check docker-compose.yml for credentials)
docker-compose exec <db-service-name> psql -U <username> -d <database>
```

### **Troubleshooting**

1. **Port Conflicts**: Ensure ports 8000, 8001, 8080, and database ports are not in use
2. **Kong Sync Issues**: Verify Kong is running before running deck sync
3. **Service Health**: Use `docker-compose ps` to check if all services are healthy
4. **Logs**: Check service logs with `docker-compose logs <service-name>` for errors

### **API Testing**

Use the test UI at http://localhost:3000 to:
- Test authentication endpoints
- Create and manage events
- Test vendor and attendee operations
- Verify notification functionality
- Test all CRUD operations through the Kong gateway 
