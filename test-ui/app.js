// Global State
let currentUser = null;
let authToken = null;
let apiBaseUrl = 'https://event-management-api.c-282f7f4.kyma.ondemand.com';

// Quick login credentials
const QUICK_LOGIN = {
    admin: { email: 'admin@test.com', password: 'admin123' },
    organizer: { email: 'organizer@test.com', password: 'organizer123' },
    vendor: { email: 'vendor@test.com', password: 'vendor123' },
    attendee: { email: 'attendee@test.com', password: 'attendee123' }
};

// ===== API Helpers =====
function getApiUrl() {
    const input = document.getElementById('apiUrl');
    return input ? input.value : apiBaseUrl;
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const url = `${getApiUrl()}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    console.log(`API ${method} ${url}`, body || '');

    try {
        const response = await fetch(url, options);
        let data;

        try {
            data = await response.json();
        } catch (e) {
            data = { detail: 'Invalid response' };
        }

        console.log(`Response ${response.status}:`, data);

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error(`Access Denied: ${data.detail || 'Permission required'}`);
            } else if (response.status === 401) {
                throw new Error(`Authentication required: ${data.detail || 'Please login'}`);
            } else if (response.status === 422) {
                const errors = data.errors || data.detail || 'Validation error';
                throw new Error(JSON.stringify(errors, null, 2));
            } else {
                throw new Error(data.detail || JSON.stringify(data) || `HTTP ${response.status}`);
            }
        }

        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// ===== Toast Notifications =====
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ===== Authentication =====
function showAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => tab.classList.remove('active'));

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
}

async function register() {
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    if (!email || !password) {
        showToast('Error', 'Please fill all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Error', 'Password must be at least 6 characters', 'error');
        return;
    }

    const result = await apiCall('/v1/auth/register', 'POST', { email, password, role });

    if (result.success) {
        showToast('Success', 'Account created! You can now login', 'success');
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        setTimeout(() => {
            showAuthMode('login');
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = password;
        }, 1500);
    } else {
        showToast('Registration Failed', result.error, 'error');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Error', 'Please enter email and password', 'error');
        return;
    }

    const result = await apiCall('/v1/auth/login', 'POST', { email, password });

    if (result.success) {
        authToken = result.data.token;
        await fetchCurrentUser();
    } else {
        showToast('Login Failed', result.error, 'error');
    }
}

async function quickLogin(role) {
    const creds = QUICK_LOGIN[role];

    // Try to register (if doesn't exist)
    await apiCall('/v1/auth/register', 'POST', { ...creds, role });

    // Login
    const result = await apiCall('/v1/auth/login', 'POST', creds);

    if (result.success) {
        authToken = result.data.token;
        await fetchCurrentUser();
    } else {
        showToast('Quick Login Failed', result.error, 'error');
    }
}

async function fetchCurrentUser() {
    const result = await apiCall('/v1/auth/me', 'GET');

    if (result.success) {
        currentUser = result.data;
        // Auth service returns 'id' but JWT uses 'sub', normalize it
        if (currentUser.id && !currentUser.sub) {
            currentUser.sub = currentUser.id;
        }
        console.log('Current User:', currentUser);
        showDashboard();
    } else {
        showToast('Error', 'Failed to fetch user info', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    showToast('Logged Out', 'See you soon!', 'info');
}

// ===== Dashboard =====
function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    // Update nav
    document.getElementById('navUserEmail').textContent = currentUser.email;
    const roleBadge = document.getElementById('navUserRole');
    roleBadge.textContent = currentUser.role.toUpperCase();
    roleBadge.className = `user-role-badge ${currentUser.role}`;

    // Show role-specific dashboard
    const dashboards = ['adminDashboard', 'organizerDashboard', 'vendorDashboard', 'attendeeDashboard'];
    dashboards.forEach(id => document.getElementById(id).classList.add('hidden'));

    const roleDashboardMap = {
        admin: 'adminDashboard',
        organizer: 'organizerDashboard',
        vendor: 'vendorDashboard',
        attendee: 'attendeeDashboard'
    };

    const dashboardId = roleDashboardMap[currentUser.role];
    if (dashboardId) {
        document.getElementById(dashboardId).classList.remove('hidden');
        loadRoleData(currentUser.role);
    }
}

// ===== Role-Specific Data Loading =====
async function loadRoleData(role) {
    showToast('Loading', 'Fetching your data...', 'info');

    switch (role) {
        case 'admin':
            await loadAdminData();
            break;
        case 'organizer':
            await loadOrganizerData();
            break;
        case 'vendor':
            await loadVendorData();
            break;
        case 'attendee':
            await loadAttendeeData();
            break;
    }
}

// ===== ADMIN Module =====
async function loadAdminData() {
    await Promise.all([
        loadAdminEvents(),
        loadAdminVendors(),
        loadAdminTasks(),
        loadAdminAttendees()
    ]);
}

async function loadAdminEvents() {
    const result = await apiCall('/v1/events', 'GET');
    const container = document.getElementById('adminEventsModule');

    if (result.success) {
        const events = result.data.events || result.data || [];
        container.innerHTML = `
            <button class="btn btn-success btn-small" onclick="openCreateEventModal()">➕ Create Event</button>
            <div class="data-list" style="margin-top: 16px;">
                ${events.length ? events.map(event => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(event.name || event.title)}</div>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📍 Location:</strong> ${escapeHtml(event.location || 'N/A')}</p>
                            <p><strong>📅 Start:</strong> ${formatDate(event.start_at || event.startAt)}</p>
                            <p>${escapeHtml((event.description || '').substring(0, 100))}...</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-warning btn-small" onclick="editEvent(${event.id})">✏️ Edit</button>
                            <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">🗑️ Delete</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">No events yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadAdminVendors() {
    const result = await apiCall('/v1/vendors', 'GET');
    const container = document.getElementById('adminVendorsModule');

    if (result.success) {
        const vendors = result.data.vendors || result.data || [];
        container.innerHTML = `
            <button class="btn btn-success btn-small" onclick="openCreateVendorModal()">➕ Create Vendor</button>
            <div class="data-list" style="margin-top: 16px;">
                ${vendors.length ? vendors.map(vendor => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(vendor.name)}</div>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📧 Email:</strong> ${escapeHtml(vendor.email)}</p>
                            <p><strong>📞 Phone:</strong> ${escapeHtml(vendor.phone || 'N/A')}</p>
                            <p><strong>🎪 Event ID:</strong> ${vendor.event_id || vendor.eventId}</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-danger btn-small" onclick="deleteVendor('${vendor.id}')">🗑️ Delete</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-text">No vendors yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadAdminTasks() {
    const result = await apiCall('/v1/tasks', 'GET');
    const container = document.getElementById('adminTasksModule');

    if (result.success) {
        const tasks = result.data.tasks || result.data || [];
        container.innerHTML = `
            <button class="btn btn-success btn-small" onclick="openCreateTaskModal()">➕ Create Task</button>
            <div class="data-list" style="margin-top: 16px;">
                ${tasks.length ? tasks.map(task => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(task.title)}</div>
                            <span class="status-badge status-${task.status}">${task.status}</span>
                        </div>
                        <div class="data-item-body">
                            <p>${escapeHtml(task.description || '')}</p>
                            <p><strong>🎪 Event ID:</strong> ${task.event_id || task.eventId}</p>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">No tasks yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadAdminAttendees() {
    const result = await apiCall('/v1/attendees', 'GET');
    const container = document.getElementById('adminAttendeesModule');

    if (result.success) {
        const attendees = result.data.attendees || result.data || [];
        container.innerHTML = `
            <div class="data-list">
                ${attendees.length ? attendees.map(att => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">User ${att.user_id || att.userId}</div>
                            <span class="status-badge status-${att.status}">${att.status}</span>
                        </div>
                        <div class="data-item-body">
                            <p><strong>🎪 Event ID:</strong> ${att.event_id || att.eventId}</p>
                            <p><strong>📅 RSVP At:</strong> ${formatDate(att.rsvp_at || att.rsvpAt)}</p>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No attendees yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

// ===== ORGANIZER Module =====
async function loadOrganizerData() {
    await Promise.all([
        loadOrganizerEvents(),
        loadOrganizerVendors(),
        loadOrganizerTasks(),
        loadOrganizerAttendees()
    ]);
}

async function loadOrganizerEvents() {
    const result = await apiCall('/v1/events', 'GET');
    const container = document.getElementById('organizerEventsModule');

    if (result.success) {
        const allEvents = result.data.events || result.data || [];
        console.log('All events:', allEvents);
        console.log('Current user sub:', currentUser.sub);
        
        // Filter events where organizerId matches current user's sub
        const myEvents = allEvents.filter(e => {
            const eventOrganizerId = String(e.organizerId || e.organizer_id || '');
            const userId = String(currentUser.sub || '');
            console.log(`Comparing event ${e.id}: organizerId=${eventOrganizerId}, userId=${userId}`);
            return eventOrganizerId === userId;
        });

        console.log('My events:', myEvents);

        container.innerHTML = `
            <button class="btn btn-success btn-small" onclick="openCreateEventModal()">➕ Create New Event</button>
            <div class="data-list" style="margin-top: 16px;">
                ${myEvents.length ? myEvents.map(event => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(event.name || event.title)}</div>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📍 Location:</strong> ${escapeHtml(event.location || 'N/A')}</p>
                            <p><strong>📅 Start:</strong> ${formatDate(event.start_at || event.startAt)}</p>
                            <p>${escapeHtml((event.description || '').substring(0, 100))}...</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-warning btn-small" onclick="editEvent(${event.id})">✏️ Edit</button>
                            <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">🗑️ Delete</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">No events created yet</div><div class="empty-state-hint">Create your first event to get started!</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadOrganizerVendors() {
    const result = await apiCall('/v1/vendors', 'GET');
    const container = document.getElementById('organizerVendorsModule');

    if (result.success) {
        const vendors = result.data.vendors || result.data || [];
        container.innerHTML = `
            <button class="btn btn-success btn-small" onclick="openCreateVendorModal()">➕ Add Vendor</button>
            <div class="data-list" style="margin-top: 16px;">
                ${vendors.length ? vendors.map(vendor => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(vendor.name)}</div>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📧 Email:</strong> ${escapeHtml(vendor.email)}</p>
                            <p><strong>📞 Phone:</strong> ${escapeHtml(vendor.phone || 'N/A')}</p>
                            <p><strong>🎪 Event ID:</strong> ${vendor.event_id || vendor.eventId}</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-danger btn-small" onclick="deleteVendor('${vendor.id}')">🗑️ Remove</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-text">No vendors yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadOrganizerTasks() {
    const result = await apiCall('/v1/tasks', 'GET');
    const container = document.getElementById('organizerTasksModule');

    if (result.success) {
        const tasks = result.data.tasks || result.data || [];
        container.innerHTML = `
            <button class="btn btn-success btn-small" onclick="openCreateTaskModal()">➕ Create Task</button>
            <div class="data-list" style="margin-top: 16px;">
                ${tasks.length ? tasks.map(task => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(task.title)}</div>
                            <span class="status-badge status-${task.status}">${task.status}</span>
                        </div>
                        <div class="data-item-body">
                            <p>${escapeHtml(task.description || '')}</p>
                            <p><strong>🎪 Event ID:</strong> ${task.event_id || task.eventId}</p>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">No tasks yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadOrganizerAttendees() {
    const result = await apiCall('/v1/attendees', 'GET');
    const container = document.getElementById('organizerAttendeesModule');

    if (result.success) {
        const attendees = result.data.attendees || result.data || [];
        container.innerHTML = `
            <div class="data-list">
                ${attendees.length ? attendees.map(att => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">User ${att.user_id || att.userId}</div>
                            <span class="status-badge status-${att.status}">${att.status}</span>
                        </div>
                        <div class="data-item-body">
                            <p><strong>🎪 Event ID:</strong> ${att.event_id || att.eventId}</p>
                            <p><strong>📅 RSVP At:</strong> ${formatDate(att.rsvp_at || att.rsvpAt)}</p>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No attendees yet</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

// ===== VENDOR Module =====
async function loadVendorData() {
    await Promise.all([
        loadVendorEvents(),
        loadVendorTasks()
    ]);
}

async function loadVendorEvents() {
    const result = await apiCall('/v1/events', 'GET');
    const container = document.getElementById('vendorEventsModule');

    if (result.success) {
        const events = result.data.events || result.data || [];
        container.innerHTML = `
            <div class="data-list">
                ${events.length ? events.map(event => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(event.name || event.title)}</div>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📍 Location:</strong> ${escapeHtml(event.location || 'N/A')}</p>
                            <p><strong>📅 Start:</strong> ${formatDate(event.start_at || event.startAt)}</p>
                            <p>${escapeHtml((event.description || '').substring(0, 150))}...</p>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">No events available</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadVendorTasks() {
    const result = await apiCall('/v1/tasks', 'GET');
    const container = document.getElementById('vendorTasksModule');

    if (result.success) {
        const tasks = result.data.tasks || result.data || [];
        container.innerHTML = `
            <div class="data-list">
                ${tasks.length ? tasks.map(task => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(task.title)}</div>
                            <span class="status-badge status-${task.status}">${task.status}</span>
                        </div>
                        <div class="data-item-body">
                            <p>${escapeHtml(task.description || '')}</p>
                            <p><strong>🎪 Event ID:</strong> ${task.event_id || task.eventId}</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-warning btn-small" onclick="updateTaskStatus(${task.id}, 'in_progress')">▶️ In Progress</button>
                            <button class="btn btn-success btn-small" onclick="updateTaskStatus(${task.id}, 'completed')">✅ Complete</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">No tasks assigned</div><div class="empty-state-hint">Check back later for new assignments</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

// ===== ATTENDEE Module =====
async function loadAttendeeData() {
    await Promise.all([
        loadAttendeeEvents(),
        loadAttendeeRSVPs()
    ]);
}

async function loadAttendeeEvents() {
    const result = await apiCall('/v1/events', 'GET');
    const container = document.getElementById('attendeeEventsModule');

    if (result.success) {
        const events = result.data.events || result.data || [];
        container.innerHTML = `
            <div class="data-list">
                ${events.length ? events.map(event => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">${escapeHtml(event.name || event.title)}</div>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📍 Location:</strong> ${escapeHtml(event.location || 'N/A')}</p>
                            <p><strong>📅 Start:</strong> ${formatDate(event.start_at || event.startAt)}</p>
                            <p>${escapeHtml((event.description || '').substring(0, 150))}...</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-success btn-small" onclick="createRSVP(${event.id}, 'going')">✅ Going</button>
                            <button class="btn btn-warning btn-small" onclick="createRSVP(${event.id}, 'interested')">🤔 Interested</button>
                            <button class="btn btn-danger btn-small" onclick="createRSVP(${event.id}, 'not_going')">❌ Not Going</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">No events available</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

async function loadAttendeeRSVPs() {
    const result = await apiCall('/v1/attendees', 'GET');
    const container = document.getElementById('attendeeRSVPsModule');

    if (result.success) {
        const rsvps = result.data.attendees || result.data || [];
        container.innerHTML = `
            <div class="data-list">
                ${rsvps.length ? rsvps.map(rsvp => `
                    <div class="data-item">
                        <div class="data-item-header">
                            <div class="data-item-title">Event ${rsvp.event_id || rsvp.eventId}</div>
                            <span class="status-badge status-${rsvp.status}">${rsvp.status}</span>
                        </div>
                        <div class="data-item-body">
                            <p><strong>📅 RSVP Date:</strong> ${formatDate(rsvp.rsvp_at || rsvp.rsvpAt)}</p>
                        </div>
                        <div class="data-item-actions">
                            <button class="btn btn-warning btn-small" onclick="updateRSVP(${rsvp.event_id || rsvp.eventId}, 'interested')">🤔 Maybe</button>
                            <button class="btn btn-danger btn-small" onclick="updateRSVP(${rsvp.event_id || rsvp.eventId}, 'not_going')">❌ Cancel</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-state-icon">🎫</div><div class="empty-state-text">No RSVPs yet</div><div class="empty-state-hint">Browse events and RSVP to get started!</div></div>'}
            </div>
        `;
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-text">❌ ${result.error}</div></div>`;
    }
}

// ===== Actions =====
async function createRSVP(eventId, status) {
    const result = await apiCall(`/v1/events/${eventId}/attendees`, 'POST', { status });
    if (result.success) {
        showToast('Success', 'RSVP created!', 'success');
        loadAttendeeRSVPs();
    } else {
        showToast('Error', result.error, 'error');
    }
}

async function updateRSVP(eventId, status) {
    const result = await apiCall(`/v1/events/${eventId}/attendees`, 'PUT', { status });
    if (result.success) {
        showToast('Success', 'RSVP updated!', 'success');
        loadAttendeeRSVPs();
    } else {
        showToast('Error', result.error, 'error');
    }
}

async function updateTaskStatus(taskId, status) {
    const result = await apiCall(`/v1/tasks/${taskId}`, 'PATCH', { status });
    if (result.success) {
        showToast('Success', 'Task status updated!', 'success');
        loadVendorTasks();
    } else {
        showToast('Error', result.error, 'error');
    }
}

function handleCreateTask(e) {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const eventId = parseInt(document.getElementById('taskEventId').value);
    const vendorId = document.getElementById('taskVendorId').value.trim();

    closeModal();
    createTask({ title, description, status: 'pending', eventId, vendorId: vendorId || null });
}

async function createTask(data) {
    const result = await apiCall('/v1/tasks', 'POST', data);
    if (result.success) {
        showToast('Success', 'Task created!', 'success');
        loadRoleData(currentUser.role);
    } else {
        showToast('Error', result.error, 'error');
    }
}

function editEvent(eventId) {
    showToast('Info', 'Edit functionality coming soon!', 'info');
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleString();
    } catch {
        return dateStr;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Event Management System - Role-Based UI loaded');
});

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const result = await apiCall(`/v1/events/${eventId}`, 'DELETE');
    if (result.success) {
        showToast('Success', 'Event deleted!', 'success');
        loadRoleData(currentUser.role);
    } else {
        showToast('Error', result.error, 'error');
    }
}

async function deleteVendor(vendorId) {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    const result = await apiCall(`/v1/vendors/${vendorId}`, 'DELETE');
    if (result.success) {
        showToast('Success', 'Vendor deleted!', 'success');
        loadRoleData(currentUser.role);
    } else {
        showToast('Error', result.error, 'error');
    }
}

// ===== Modals =====
function openCreateEventModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Event</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="createEventForm" onsubmit="handleCreateEvent(event)">
                    <div class="form-group">
                        <label for="eventName">Event Name *</label>
                        <input type="text" id="eventName" required placeholder="Enter event name">
                    </div>
                    <div class="form-group">
                        <label for="eventLocation">Location *</label>
                        <input type="text" id="eventLocation" required placeholder="Enter location">
                    </div>
                    <div class="form-group">
                        <label for="eventDescription">Description *</label>
                        <textarea id="eventDescription" required placeholder="Enter description" rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="eventStartAt">Start Date & Time *</label>
                            <input type="datetime-local" id="eventStartAt" required>
                        </div>
                        <div class="form-group">
                            <label for="eventEndAt">End Date & Time *</label>
                            <input type="datetime-local" id="eventEndAt" required>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-success">Create Event</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function handleCreateEvent(e) {
    e.preventDefault();
    const name = document.getElementById('eventName').value.trim();
    const location = document.getElementById('eventLocation').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const startAt = document.getElementById('eventStartAt').value;
    const endAt = document.getElementById('eventEndAt').value;

    // Convert datetime-local format to ISO8601 format (required by backend)
    const startAtISO = startAt ? new Date(startAt).toISOString() : '';
    const endAtISO = endAt ? new Date(endAt).toISOString() : '';

    closeModal();
    createEvent({ name, location, description, startAt: startAtISO, endAt: endAtISO });
}

async function createEvent(data) {
    console.log('Creating event with data:', data);
    const result = await apiCall('/v1/events', 'POST', data);
    console.log('Create event result:', result);
    
    if (result.success) {
        console.log('Event created successfully:', result.data);
        showToast('Success', 'Event created!', 'success');
        
        // Wait a moment before reloading to ensure DB commit
        setTimeout(() => {
            loadRoleData(currentUser.role);
        }, 500);
    } else {
        showToast('Error', result.error, 'error');
    }
}

function openCreateVendorModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Vendor</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="createVendorForm" onsubmit="handleCreateVendor(event)">
                    <div class="form-group">
                        <label for="vendorName">Vendor Name *</label>
                        <input type="text" id="vendorName" required placeholder="Enter vendor name">
                    </div>
                    <div class="form-group">
                        <label for="vendorEmail">Email *</label>
                        <input type="email" id="vendorEmail" required placeholder="vendor@example.com">
                    </div>
                    <div class="form-group">
                        <label for="vendorPhone">Phone</label>
                        <input type="tel" id="vendorPhone" placeholder="+1 234 567 8900">
                    </div>
                    <div class="form-group">
                        <label for="vendorEventId">Event ID *</label>
                        <input type="number" id="vendorEventId" required placeholder="Enter event ID">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-success">Add Vendor</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function handleCreateVendor(e) {
    e.preventDefault();
    const name = document.getElementById('vendorName').value.trim();
    const email = document.getElementById('vendorEmail').value.trim();
    const phone = document.getElementById('vendorPhone').value.trim();
    const eventId = parseInt(document.getElementById('vendorEventId').value);

    closeModal();
    createVendor({ name, email, phone, eventId });
}

async function createVendor(data) {
    const result = await apiCall('/v1/vendors', 'POST', data);
    if (result.success) {
        showToast('Success', 'Vendor created!', 'success');
        loadRoleData(currentUser.role);
    } else {
        showToast('Error', result.error, 'error');
    }
}

function openCreateTaskModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create Task</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="createTaskForm" onsubmit="handleCreateTask(event)">
                    <div class="form-group">
                        <label for="taskTitle">Task Title *</label>
                        <input type="text" id="taskTitle" required placeholder="Enter task title">
                    </div>
                    <div class="form-group">
                        <label for="taskDescription">Description *</label>
                        <textarea id="taskDescription" required placeholder="Enter task description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="taskEventId">Event ID *</label>
                        <input type="number" id="taskEventId" required placeholder="Enter event ID">
                    </div>
                    <div class="form-group">
                        <label for="taskVendorId">Vendor ID (Optional)</label>
                        <input type="text" id="taskVendorId" placeholder="Enter vendor ID (optional)">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-success">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}