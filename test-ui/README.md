# Event Management System - Test UI

A simple, interactive web interface to test all microservices through Kong Gateway with different user roles.

## 🚀 Quick Start

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\start-test-ui.ps1
```

This will automatically start a web server and open the UI at `http://localhost:3000`

### Option 2: Using Python
```bash
cd test-ui
python -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

### Option 3: Direct Browser
Simply open `test-ui/index.html` in your browser (note: CORS may cause issues with direct file access).

## 🎭 User Roles

The test UI supports three different roles:

### 👑 Admin
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Permissions:** Full access to all resources
- **Can:** Create, read, update, delete all entities

### 📋 Organizer
- **Email:** `organizer@test.com`
- **Password:** `organizer123`
- **Permissions:** Can manage events, vendors, tasks
- **Can:** Create events, manage vendors, assign tasks

### 👤 User
- **Email:** `user@test.com`
- **Password:** `user123`
- **Permissions:** Read access and RSVP to events
- **Can:** View events, create RSVPs, view notifications

## ✨ Features

### 📅 Events Management
- Create new events with name, description, location, dates
- View all events in a list
- Update event details
- Delete events
- Real-time event count

### 🏢 Vendors Management
- Add vendors with contact information
- Link vendors to specific events
- Update vendor details
- Delete vendors
- Search and filter vendors

### ✅ Tasks Management
- Create tasks with title, description, status
- Link tasks to events and vendors
- Update task status (pending → in_progress → completed)
- Delete tasks
- Visual status badges

### 👥 Attendees Management
- Create RSVP for events
- View all attendees
- Status tracking (going, maybe, not_going)
- Event-specific attendee lists

### 🔔 Notifications
- Send notifications to users
- Multiple notification types (event_reminder, event_update, task_assigned, general)
- View all notifications
- Timestamp tracking

## 🔐 Authentication Flow

1. **Quick Login:** Click one of the role buttons for instant login
2. **Manual Login:** Enter email and password manually
3. **Auto-Registration:** First-time users are automatically registered
4. **JWT Token:** All requests use Bearer token authentication
5. **Session Persistence:** Login state maintained during session

## 🎨 UI Features

- **Responsive Design:** Works on desktop, tablet, and mobile
- **Real-time Updates:** Instant feedback on all actions
- **Color-coded Roles:** Visual distinction between admin, organizer, user
- **Status Badges:** Clear visual indicators for task and RSVP statuses
- **Error Handling:** User-friendly error messages
- **Loading Indicators:** Spinners while fetching data
- **Auto-refresh:** Data refreshes after successful operations

## 📊 Statistics Dashboard

Each section shows:
- Total count of items
- Visual stat cards with gradient backgrounds
- Real-time updates

## 🔌 Kong Gateway Integration

All API calls go through Kong Gateway at `http://localhost:8000`

### Active Kong Features:
- ✅ CORS (Cross-Origin Resource Sharing)
- ✅ Rate Limiting (10-100 requests/minute per endpoint)
- ✅ JWT Authentication
- ✅ Request Correlation ID
- ✅ Request Size Limiting (10MB max)

### API Endpoints Used:

#### Auth Service
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login
- `GET /v1/auth/me` - Get current user

#### Events Service
- `GET /v1/events` - List all events
- `POST /v1/events` - Create event
- `GET /v1/events/:id` - Get event details
- `PATCH /v1/events/:id` - Update event
- `DELETE /v1/events/:id` - Delete event

#### Vendors Service
- `GET /v1/vendors` - List all vendors
- `POST /v1/vendors` - Create vendor
- `GET /v1/vendors/:id` - Get vendor details
- `PATCH /v1/vendors/:id` - Update vendor
- `DELETE /v1/vendors/:id` - Delete vendor

#### Tasks Service
- `GET /v1/tasks` - List all tasks
- `POST /v1/tasks` - Create task
- `GET /v1/tasks/:id` - Get task details
- `PATCH /v1/tasks/:id` - Update task
- `DELETE /v1/tasks/:id` - Delete task

#### Attendees Service
- `GET /v1/attendees` - List all attendees
- `POST /v1/events/:id/attendees` - Create RSVP
- `GET /v1/events/:id/attendees` - List event attendees
- `DELETE /v1/attendees/:id` - Delete attendee

#### Notifications Service
- `GET /v1/notifications` - List notifications
- `POST /v1/notifications` - Create notification

## 🧪 Testing Scenarios

### Scenario 1: Complete Event Flow (Admin)
1. Login as Admin
2. Create a new event
3. Add vendors for the event
4. Create tasks for event planning
5. Send notifications to team
6. View all created resources

### Scenario 2: Organizer Workflow
1. Login as Organizer
2. View existing events
3. Create vendors for their events
4. Assign tasks to team members
5. Update task statuses

### Scenario 3: User Experience
1. Login as User
2. Browse available events
3. RSVP to events (going/maybe/not_going)
4. View personal notifications
5. Check event details

## 🛠️ Customization

### Change API URL
You can change the Kong Gateway URL in the sidebar:
- Default: `http://localhost:8000`
- For remote server: Update to your server URL

### Add Custom Roles
Edit `app.js` and add to `quickLoginCreds`:
```javascript
customRole: { 
    email: 'custom@test.com', 
    password: 'custom123', 
    role: 'custom' 
}
```

## 📝 Code Structure

```
test-ui/
├── index.html          # Main UI structure and styling
├── app.js              # JavaScript logic and API calls
└── README.md           # This file
```

### Key Functions in app.js:
- `apiCall()` - Generic API wrapper with error handling
- `login()` / `quickLogin()` - Authentication
- `createEvent()`, `createVendor()`, etc. - Create operations
- `loadEvents()`, `loadVendors()`, etc. - List operations
- `updateX()`, `deleteX()` - Update and delete operations

## 🔍 Troubleshooting

### CORS Errors
- Make sure Kong Gateway is running
- Check that CORS plugin is enabled on all routes
- Verify API URL is correct

### Authentication Errors
- Ensure auth service is running
- Check credentials are correct
- Verify JWT token is valid

### Data Not Loading
- Check if all microservices are running
- Verify Kong Gateway routes are configured
- Look at browser console for errors

### Rate Limiting
- If you hit rate limits, wait 1 minute
- Check Kong rate limiting configuration
- Admin endpoints have lower limits (10/min)

## 🎯 Best Practices

1. **Always login first** before testing features
2. **Use Quick Login buttons** for faster testing
3. **Create events before vendors/tasks** (they need event IDs)
4. **Check browser console** for detailed error messages
5. **Refresh data** after operations to see updates

## 📦 Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Kong Gateway running on port 8000
- All microservices deployed and healthy
- CORS enabled in Kong

## 🚀 Next Steps

After testing, you can:
1. Extend the UI with more features
2. Add search and filter capabilities
3. Implement real-time updates with WebSockets
4. Add file upload functionality
5. Create admin dashboard with analytics

## 📞 Support

For issues or questions:
- Check Kong Gateway status: `http://localhost:8001/status`
- View service health: Run `test-kong-gateway.ps1`
- Check Docker containers: `docker-compose ps`

---

**Built with ❤️ for testing Event Management System microservices**
