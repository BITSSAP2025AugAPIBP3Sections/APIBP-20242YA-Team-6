// Global state
let currentUser = null;
let authToken = null;

// Quick login credentials
const quickLoginCreds = {
    admin: { email: 'admin@test.com', password: 'admin123', role: 'admin' },
    organizer: { email: 'organizer@test.com', password: 'organizer123', role: 'organizer' },
    user: { email: 'user@test.com', password: 'user123', role: 'user' }
};

// API Helper
function getApiUrl() {
    return document.getElementById('apiUrl').value;
}

function getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const url = `${getApiUrl()}${endpoint}`;
    const options = {
        method,
        headers: getHeaders()
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }

    console.log(`API Call: ${method} ${url}`, body ? body : '');

    try {
        const response = await fetch(url, options);
        let data;
        
        try {
            data = await response.json();
        } catch (e) {
            data = { detail: 'Invalid response from server' };
        }
        
        console.log(`API Response: ${response.status}`, data);
        
        if (!response.ok) {
            // Handle specific error cases
            if (response.status === 403) {
                throw new Error(`⛔ Access Denied: ${data.detail || 'You do not have permission to perform this action'}`);
            } else if (response.status === 401) {
                throw new Error(`🔒 Authentication Required: ${data.detail || 'Please login again'}`);
            } else if (response.status === 422) {
                throw new Error(`❌ Validation Error:\n${JSON.stringify(data, null, 2)}`);
            } else {
                throw new Error(JSON.stringify(data, null, 2) || `HTTP ${response.status}`);
            }
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// Display helpers
function showResponse(elementId, result) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (result.success) {
        el.className = 'response success';
        el.textContent = '✅ Success!\n\n' + JSON.stringify(result.data, null, 2);
    } else {
        el.className = 'response error';
        el.textContent = '❌ Error!\n\n' + result.error;
    }
    el.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (result.success) {
        setTimeout(() => {
            el.style.display = 'none';
        }, 5000);
    }
}

function showLoading(sectionId, show = true) {
    const el = document.getElementById(`${sectionId}Loading`);
    if (el) {
        el.className = show ? 'loading active' : 'loading';
    }
}

// Authentication Tab Switching
function showAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTabBtn.style.background = '#667eea';
        loginTabBtn.style.color = 'white';
        registerTabBtn.style.background = '#e9ecef';
        registerTabBtn.style.color = '#333';
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTabBtn.style.background = '#e9ecef';
        loginTabBtn.style.color = '#333';
        registerTabBtn.style.background = '#667eea';
        registerTabBtn.style.color = 'white';
    }
}

// Authentication
async function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    if (!email || !password) {
        showResponse('registerResponse', { success: false, error: 'Please fill in all fields' });
        return;
    }

    if (password.length < 6) {
        showResponse('registerResponse', { success: false, error: 'Password must be at least 6 characters' });
        return;
    }

    const result = await apiCall('/v1/auth/register', 'POST', { email, password, role });
    
    if (result.success) {
        showResponse('registerResponse', result);
        // Clear form
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerRole').value = 'attendee';
        
        // Show success message and switch to login
        setTimeout(() => {
            showAuthTab('login');
            // Pre-fill login with registered email
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = password;
            alert('✅ Registration successful! You can now login.');
        }, 2000);
    } else {
        showResponse('registerResponse', result);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    const result = await apiCall('/v1/auth/login', 'POST', { email, password });
    
    if (result.success) {
        authToken = result.data.token;
        await getCurrentUser();
        alert('✅ Login successful!');
    } else {
        alert('❌ Login failed: ' + result.error);
    }
}

async function getCurrentUser() {
    const result = await apiCall('/v1/auth/me', 'GET');
    
    if (result.success) {
        currentUser = result.data;
        updateUI();
        loadAllData();
    }
}

async function quickLogin(role) {
    const creds = quickLoginCreds[role];
    
    // Try to register first (in case user doesn't exist)
    await apiCall('/v1/auth/register', 'POST', {
        email: creds.email,
        password: creds.password,
        role: creds.role
    });
    
    // Then login
    const result = await apiCall('/v1/auth/login', 'POST', {
        email: creds.email,
        password: creds.password
    });
    
    if (result.success) {
        authToken = result.data.token;
        await getCurrentUser();
        alert(`✅ Logged in as ${role.toUpperCase()}`);
    } else {
        alert('❌ Login failed: ' + result.error);
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    updateUI();
    alert('✅ Logged out successfully');
}

function updateUI() {
    if (currentUser) {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('loggedInSection').classList.remove('hidden');
        document.getElementById('userInfo').classList.add('active');
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userId').textContent = currentUser.id || currentUser.sub;
        
        const roleSpan = document.getElementById('userRole');
        roleSpan.textContent = currentUser.role.toUpperCase();
        roleSpan.className = `badge ${currentUser.role}`;
        
        // Show/hide create forms based on role permissions
        updatePermissionsUI();
    } else {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('loggedInSection').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('active');
    }
}

function updatePermissionsUI() {
    const role = currentUser.role;
    const canCreate = role === 'admin' || role === 'organizer';
    const canUpdateTasks = role === 'admin' || role === 'organizer' || role === 'vendor';
    
    // Show warning for attendees
    const createCards = document.querySelectorAll('.card h3');
    createCards.forEach(card => {
        if (card.textContent.includes('Create') || card.textContent.includes('➕')) {
            const cardEl = card.parentElement;
            let warning = cardEl.querySelector('.permission-warning');
            
            if (!canCreate && !warning) {
                warning = document.createElement('div');
                warning.className = 'permission-warning';
                warning.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 15px; color: #856404;';
                warning.innerHTML = `⚠️ <strong>Note:</strong> Only <strong>Admin</strong> and <strong>Organizer</strong> roles can create resources. You are logged in as <strong>${role}</strong>.`;
                cardEl.insertBefore(warning, card.nextSibling);
            } else if (canCreate && warning) {
                warning.remove();
            }
        }
    });
}

// Tab switching
function switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load data for the tab
    switch(tabName) {
        case 'events':
            loadEvents();
            break;
        case 'vendors':
            loadVendors();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'attendees':
            loadAttendees();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// Events
async function createEvent() {
    const data = {
        name: document.getElementById('eventName').value,
        description: document.getElementById('eventDescription').value,
        location: document.getElementById('eventLocation').value,
        startAt: document.getElementById('eventStartAt').value + ':00Z',
        endAt: document.getElementById('eventEndAt').value + ':00Z',
        organizerId: document.getElementById('eventOrganizerId').value
    };

    if (!data.name || !data.description || !data.location || !data.startAt || !data.endAt) {
        alert('Please fill in all required fields');
        return;
    }

    const result = await apiCall('/v1/events', 'POST', data);
    showResponse('createEventResponse', result);
    
    if (result.success) {
        loadEvents();
        // Clear form
        document.getElementById('eventName').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventLocation').value = '';
        document.getElementById('eventStartAt').value = '';
        document.getElementById('eventEndAt').value = '';
    }
}

async function loadEvents() {
    if (!authToken) {
        alert('Please login first');
        return;
    }

    showLoading('events', true);
    const result = await apiCall('/v1/events', 'GET');
    showLoading('events', false);
    
    if (result.success) {
        const events = result.data;
        document.getElementById('eventsCount').textContent = events.length;
        
        const listEl = document.getElementById('eventsList');
        if (events.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #666;">No events found. Create one above!</p>';
        } else {
            listEl.innerHTML = events.map(event => `
                <div class="item">
                    <div class="item-info">
                        <h4>${event.name}</h4>
                        <p>📍 ${event.location}</p>
                        <p>📝 ${event.description}</p>
                        <p>🗓️ ${new Date(event.start_at || event.startAt).toLocaleString()} - ${new Date(event.end_at || event.endAt).toLocaleString()}</p>
                        <p style="font-size: 11px; color: #999;">ID: ${event.id} | Organizer: ${event.organizer_id || event.organizerId}</p>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-warning btn-small" onclick="updateEvent(${event.id})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function updateEvent(id) {
    const newDescription = prompt('Enter new description:');
    if (!newDescription) return;
    
    const result = await apiCall(`/v1/events/${id}`, 'PATCH', { description: newDescription });
    if (result.success) {
        alert('✅ Event updated successfully');
        loadEvents();
    } else {
        alert('❌ Failed to update event: ' + result.error);
    }
}

async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    const result = await apiCall(`/v1/events/${id}`, 'DELETE');
    if (result.success) {
        alert('✅ Event deleted successfully');
        loadEvents();
    } else {
        alert('❌ Failed to delete event: ' + result.error);
    }
}

// Vendors
async function createVendor() {
    const data = {
        name: document.getElementById('vendorName').value,
        email: document.getElementById('vendorEmail').value,
        phone: document.getElementById('vendorPhone').value,
        eventId: document.getElementById('vendorEventId').value
    };

    if (!data.name || !data.email || !data.eventId) {
        alert('Please fill in all required fields');
        return;
    }

    const result = await apiCall('/v1/vendors', 'POST', data);
    showResponse('createVendorResponse', result);
    
    if (result.success) {
        loadVendors();
        // Clear form
        document.getElementById('vendorName').value = '';
        document.getElementById('vendorEmail').value = '';
        document.getElementById('vendorPhone').value = '';
    }
}

async function loadVendors() {
    if (!authToken) {
        alert('Please login first');
        return;
    }

    showLoading('vendors', true);
    const result = await apiCall('/v1/vendors', 'GET');
    showLoading('vendors', false);
    
    if (result.success) {
        const vendors = result.data;
        document.getElementById('vendorsCount').textContent = vendors.length;
        
        const listEl = document.getElementById('vendorsList');
        if (vendors.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #666;">No vendors found. Create one above!</p>';
        } else {
            listEl.innerHTML = vendors.map(vendor => `
                <div class="item">
                    <div class="item-info">
                        <h4>${vendor.name}</h4>
                        <p>📧 ${vendor.email}</p>
                        <p>📞 ${vendor.phone || 'N/A'}</p>
                        <p style="font-size: 11px; color: #999;">ID: ${vendor.id} | Event: ${vendor.eventId || vendor.event_id}</p>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-warning btn-small" onclick="updateVendor(${vendor.id})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="deleteVendor(${vendor.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function updateVendor(id) {
    const newPhone = prompt('Enter new phone number:');
    if (!newPhone) return;
    
    const result = await apiCall(`/v1/vendors/${id}`, 'PATCH', { phone: newPhone });
    if (result.success) {
        alert('✅ Vendor updated successfully');
        loadVendors();
    } else {
        alert('❌ Failed to update vendor: ' + result.error);
    }
}

async function deleteVendor(id) {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    const result = await apiCall(`/v1/vendors/${id}`, 'DELETE');
    if (result.success) {
        alert('✅ Vendor deleted successfully');
        loadVendors();
    } else {
        alert('❌ Failed to delete vendor: ' + result.error);
    }
}

// Tasks
async function createTask() {
    const data = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        eventId: document.getElementById('taskEventId').value,
        vendorId: document.getElementById('taskVendorId').value || null
    };

    if (!data.title || !data.description || !data.eventId) {
        alert('Please fill in all required fields');
        return;
    }

    const result = await apiCall('/v1/tasks', 'POST', data);
    showResponse('createTaskResponse', result);
    
    if (result.success) {
        loadTasks();
        // Clear form
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
    }
}

async function loadTasks() {
    if (!authToken) {
        alert('Please login first');
        return;
    }

    showLoading('tasks', true);
    const result = await apiCall('/v1/tasks', 'GET');
    showLoading('tasks', false);
    
    if (result.success) {
        const tasks = result.data;
        document.getElementById('tasksCount').textContent = tasks.length;
        
        const listEl = document.getElementById('tasksList');
        if (tasks.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #666;">No tasks found. Create one above!</p>';
        } else {
            listEl.innerHTML = tasks.map(task => `
                <div class="item">
                    <div class="item-info">
                        <h4>${task.title} <span class="status-badge status-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span></h4>
                        <p>📝 ${task.description}</p>
                        <p style="font-size: 11px; color: #999;">ID: ${task.id} | Event: ${task.eventId || task.event_id} | Vendor: ${task.vendorId || task.vendor_id || 'N/A'}</p>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-warning btn-small" onclick="updateTaskStatus(${task.id})">Update Status</button>
                        <button class="btn btn-danger btn-small" onclick="deleteTask(${task.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function updateTaskStatus(id) {
    const newStatus = prompt('Enter new status (pending, in_progress, completed):');
    if (!newStatus || !['pending', 'in_progress', 'completed'].includes(newStatus)) {
        alert('Invalid status');
        return;
    }
    
    const result = await apiCall(`/v1/tasks/${id}`, 'PATCH', { status: newStatus });
    if (result.success) {
        alert('✅ Task status updated successfully');
        loadTasks();
    } else {
        alert('❌ Failed to update task: ' + result.error);
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    const result = await apiCall(`/v1/tasks/${id}`, 'DELETE');
    if (result.success) {
        alert('✅ Task deleted successfully');
        loadTasks();
    } else {
        alert('❌ Failed to delete task: ' + result.error);
    }
}

// Attendees
async function createRSVP() {
    const eventId = document.getElementById('rsvpEventId').value;
    const status = document.getElementById('rsvpStatus').value;
    
    if (!eventId || !currentUser) {
        alert('Please select an event and login first');
        return;
    }

    const data = {
        userId: currentUser.id || currentUser.sub,
        status: status
    };

    const result = await apiCall(`/v1/events/${eventId}/attendees`, 'POST', data);
    showResponse('createRSVPResponse', result);
    
    if (result.success) {
        loadAttendees();
    }
}

async function loadAttendees() {
    if (!authToken) {
        alert('Please login first');
        return;
    }

    showLoading('attendees', true);
    const result = await apiCall('/v1/attendees', 'GET');
    showLoading('attendees', false);
    
    if (result.success) {
        const attendees = result.data;
        document.getElementById('attendeesCount').textContent = attendees.length;
        
        const listEl = document.getElementById('attendeesList');
        if (attendees.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #666;">No attendees found. Create an RSVP above!</p>';
        } else {
            listEl.innerHTML = attendees.map(attendee => `
                <div class="item">
                    <div class="item-info">
                        <h4>User ${attendee.userId || attendee.user_id} <span class="status-badge status-${attendee.status}">${attendee.status.replace('_', ' ').toUpperCase()}</span></h4>
                        <p>🎫 Event: ${attendee.eventId || attendee.event_id}</p>
                        <p style="font-size: 11px; color: #999;">ID: ${attendee.id}</p>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-danger btn-small" onclick="deleteAttendee(${attendee.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function deleteAttendee(id) {
    if (!confirm('Are you sure you want to delete this attendee?')) return;
    
    const result = await apiCall(`/v1/attendees/${id}`, 'DELETE');
    if (result.success) {
        alert('✅ Attendee deleted successfully');
        loadAttendees();
    } else {
        alert('❌ Failed to delete attendee: ' + result.error);
    }
}

// Notifications
async function createNotification() {
    const data = {
        recipientId: document.getElementById('notificationRecipientId').value,
        type: document.getElementById('notificationType').value,
        message: document.getElementById('notificationMessage').value
    };

    if (!data.recipientId || !data.message) {
        alert('Please fill in all required fields');
        return;
    }

    const result = await apiCall('/v1/notifications', 'POST', data);
    showResponse('createNotificationResponse', result);
    
    if (result.success) {
        loadNotifications();
        // Clear form
        document.getElementById('notificationMessage').value = '';
    }
}

async function loadNotifications() {
    if (!authToken) {
        alert('Please login first');
        return;
    }

    showLoading('notifications', true);
    const result = await apiCall('/v1/notifications', 'GET');
    showLoading('notifications', false);
    
    if (result.success) {
        const notifications = result.data;
        document.getElementById('notificationsCount').textContent = notifications.length;
        
        const listEl = document.getElementById('notificationsList');
        if (notifications.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: #666;">No notifications found. Create one above!</p>';
        } else {
            listEl.innerHTML = notifications.map(notif => `
                <div class="item">
                    <div class="item-info">
                        <h4>${notif.type.replace('_', ' ').toUpperCase()}</h4>
                        <p>💬 ${notif.message}</p>
                        <p>👤 Recipient: ${notif.recipientId || notif.recipient_id}</p>
                        <p style="font-size: 11px; color: #999;">ID: ${notif.id} | Created: ${new Date(notif.createdAt || notif.created_at).toLocaleString()}</p>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Load all data
function loadAllData() {
    loadEvents();
    loadVendors();
    loadTasks();
    loadAttendees();
    loadNotifications();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎉 Event Management Test UI loaded');
    console.log('API URL:', getApiUrl());
    
    // Set default datetime values
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    document.getElementById('eventStartAt').value = tomorrow.toISOString().slice(0, 16);
    document.getElementById('eventEndAt').value = new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
});
