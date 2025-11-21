# Vendors Service

A FastAPI-based microservice for managing vendors in the event management platform.

## Status: ✅ **FULLY IMPLEMENTED**

## Tech Stack
- **Framework**: FastAPI 
- **Language**: Python 3.11+
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## Port
**Production**: `8003`

## Features

### 🔐 **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC)
- Protected endpoints for sensitive operations

### 📊 **Advanced Query Features**
- **Pagination**: Page-based pagination with configurable limit
- **Sorting**: Sort by any field in ascending/descending order  
- **Filtering**: Search across name, email, and phone fields
- **Field Selection**: Choose specific fields to return in response

### 🛠️ **Core CRUD Operations**
- Create vendors with validation
- Retrieve vendor details
- Update vendor information
- Delete vendors
- List vendors with advanced query options

## API Endpoints

### Health Check
```http
GET /health
```
Response: `{"status": "ok", "service": "vendors"}`

### Vendor Management

#### Create Vendor
```http
POST /v1/vendors
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Vendor Name",
  "email": "vendor@example.com", 
  "phone": "+1234567890",
  "eventId": "event-uuid"
}
```

#### List Vendors (Enhanced)
```http
GET /v1/vendors?page=1&limit=10&sort=name&order=asc&search=tech&fields=id,name,email
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sort`: Sort field (name, email, phone, eventId)
- `order`: Sort order (asc, desc)
- `search`: Search across name, email, phone
- `fields`: Comma-separated field list for response

**Response:**
```json
{
  "vendors": [
    {
      "id": 1,
      "name": "Tech Vendor",
      "email": "tech@vendor.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Get Vendor Details
```http
GET /v1/vendors/{vendor_id}
Authorization: Bearer <jwt_token>
```

#### Update Vendor
```http
PATCH /v1/vendors/{vendor_id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Delete Vendor
```http
DELETE /v1/vendors/{vendor_id}
Authorization: Bearer <jwt_token>
```

## Database Schema

```sql
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    phone VARCHAR,
    event_id VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8003` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY` | JWT secret key | Required |
| `ENVIRONMENT` | Environment (development/production) | `development` |

## Development

### Local Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/vendors"
export SECRET_KEY="your-secret-key"

# Run the service
python src/main.py
```

### Docker
```bash
# Build image
docker build -t vendors-service:latest .

# Run container
docker run -p 8003:8003 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/vendors" \
  -e SECRET_KEY="your-secret-key" \
  vendors-service:latest
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

## Error Handling & Status Codes

### Success Responses
- `200 OK` - Successful GET, PATCH operations
- `201 Created` - Successful POST operations
- `204 No Content` - Successful DELETE operations

### Client Errors
- `400 Bad Request` - Invalid request data or parameters
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Insufficient permissions for operation
- `404 Not Found` - Vendor resource not found
- `409 Conflict` - Email already exists (duplicate vendor)
- `422 Unprocessable Entity` - Validation errors

### Error Response Format
```json
{
  "detail": "Error description",
  "error_code": "VENDOR_NOT_FOUND",
  "timestamp": "2025-11-21T10:30:00Z",
  "path": "/v1/vendors/123"
}
```

## Validation Rules

### Vendor Creation/Update
- **Name**: Required, 2-100 characters, alphanumeric + spaces/hyphens
- **Email**: Required, valid email format, unique, max 254 characters
- **Phone**: Optional, 10-20 characters, international format recommended
- **Event ID**: Required, UUID v4 or alphanumeric, 1-50 characters

## Testing

Use the Bruno API collection in `/api/` folder:
- `create vendor.bru` - Create vendor
- `get.bru` - Health check and vendor listing
- `login user.bru` - Authentication

### Unit Tests
```bash
# Run unit tests
pytest tests/unit/ -v --cov=src

# Test coverage report
pytest --cov=src --cov-report=html
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" \
   http://localhost:8003/v1/vendors

# Using wrk
wrk -t12 -c400 -d30s -H "Authorization: Bearer <token>" \
    http://localhost:8003/v1/vendors
```

## Monitoring & Health

### Health Check Details
```json
GET /health
{
  "status": "ok",
  "service": "vendors",
  "version": "1.1.0",
  "timestamp": "2025-11-21T10:30:00Z",
  "database": {
    "status": "connected"
  }
}
```

### Key Metrics
- **Response Time**: < 200ms for GET operations
- **Throughput**: 100 requests/minute sustained
- **Error Rate**: < 1% for normal operations

### Database Configuration
```python
# Connection Pool Settings
SQLALCHEMY_POOL_SIZE = 10
SQLALCHEMY_MAX_OVERFLOW = 20
SQLALCHEMY_POOL_TIMEOUT = 30
SQLALCHEMY_POOL_RECYCLE = 3600
```

### Performance Indexes
```sql
-- Optimization indexes
CREATE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_event_id ON vendors(event_id);
CREATE INDEX idx_vendors_name_search ON vendors USING gin(to_tsvector('english', name));
```

## Deployment & Scaling

### Kubernetes Resources
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "50m"
  limits:
    memory: "512Mi"
    cpu: "200m"
```

### Rate Limiting (Kong Gateway)
- **Per Hour**: 5000 requests
- **Per Minute**: 100 requests

### Horizontal Pod Autoscaling
```yaml
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vendors-service
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database pod status
kubectl get pods -n event-management | grep vendors-db

# Test connectivity
kubectl exec -it vendors-service-xxx -- ping vendors-db
```

#### JWT Authentication Failures
```bash
# Verify token
curl -H "Authorization: Bearer <token>" http://localhost:8003/v1/vendors

# Check token validity
echo "<token>" | jwt decode -
```

#### Performance Issues
```bash
# Check pod resources
kubectl top pods vendors-service

# Scale if needed
kubectl scale deployment vendors-service --replicas=3
```

### Debug Mode
```python
# Enable debug mode for development
app = FastAPI(title="Vendors Service", debug=True)

# Enable SQL query logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

## Security Features

- JWT token validation on all endpoints
- Role-based access control
- SQL injection protection via SQLAlchemy ORM
- CORS configuration
- Request size limiting (10MB max)

### Container Security
```dockerfile
# Multi-stage build for security
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
# Create non-root user
RUN groupadd -r vendors && useradd -r -g vendors vendors
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --chown=vendors:vendors src/ ./src/
USER vendors
EXPOSE 8003
CMD ["python", "src/main.py"]
```

## Implementation Checklist
| Item | Status |
|------|--------|
| Tech stack decided | ✅ FastAPI + PostgreSQL |
| Health endpoint | ✅ `/health` |
| Vendor model & validation | ✅ Pydantic models |
| Assignment linkage (events/tasks) | ✅ Event ID linking |
| Persistence layer | ✅ SQLAlchemy + PostgreSQL |
| Readiness probe | ✅ K8s health checks |
| API schema | ✅ OpenAPI/Swagger |
| Observability | ✅ FastAPI metrics |
| **Advanced Features** | |
| Pagination | ✅ Page-based pagination |
| Sorting | ✅ Multi-field sorting |
| Filtering/Search | ✅ Full-text search |
| Field Selection | ✅ Response optimization |
| RBAC | ✅ Role-based access |

## Architecture Integration

The vendors service integrates with:
- **Auth Service**: JWT validation and user roles
- **Events Service**: Vendor-event associations via eventId field
- **Kong Gateway**: API routing and rate limiting
- **PostgreSQL Database**: Data persistence and queries

### Current Architecture
The vendors service operates as a **synchronous REST API**:

```python
# Direct database operations
@app.post("/v1/vendors")
async def create_vendor(vendor_data: VendorCreate, db: Session = Depends(get_db)):
    # 1. Validate input data
    # 2. Check for duplicate email
    # 3. Create vendor in database
    # 4. Return vendor response
```

## API Usage Examples

### Advanced Query Examples
```bash
# Search vendors by partial name match
GET /v1/vendors?search=acme&limit=5

# Get vendors sorted by creation date (newest first)
GET /v1/vendors?sort=created_at&order=desc

# Pagination through large result sets
GET /v1/vendors?page=3&limit=25

# Get only specific fields for bandwidth optimization
GET /v1/vendors?fields=id,name,email&limit=50

# Complex query combining multiple filters
GET /v1/vendors?search=tech&sort=name&order=asc&limit=10&fields=id,name,email,phone
```

## Backup & Recovery

### Database Backup
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER -d vendors > vendors_backup_$DATE.sql

# Backup retention (keep last 30 days)
find /backups -name "vendors_backup_*.sql" -mtime +30 -delete
```

### Service Recovery
```bash
# Emergency recovery runbook
echo "Starting vendors service recovery..."

# 1. Check service health
kubectl get pods -n event-management | grep vendors

# 2. Scale up if needed
kubectl scale deployment vendors-service --replicas=3 -n event-management

# 3. Restart unhealthy pods
kubectl delete pods -l app=vendors-service -n event-management
```