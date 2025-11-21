import pool from '../config/database.js';
import { publishNotification } from '../config/kafka.js';
import { getUserEmail, getVendorEmail, getVendorUserId, getUserIdFromVendorId, getVendorIdFromUserId } from '../utils/externalServices.js';
import axios from 'axios';

function buildPaginationInfo(page, pageSize, totalCount) {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
        current_page: page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: hasNext,
        has_previous: hasPrev,
        next_page: hasNext ? page + 1 : null,
        previous_page: hasPrev ? page - 1 : null
    };
}

function applyFilters(conditions, values, filters, userRole, userId, vendorId = null) {
    let paramCount = values.length + 1;

    // Role-based filtering
    // Note: For vendors, we need to filter by vendor_id (not userId)
    // The vendorId should be passed from the calling function
    if (userRole === 'vendor' && vendorId) {
        conditions.push(`vendor_id = $${paramCount++}`);
        values.push(vendorId);
    }

    if (filters.title) {
        conditions.push(`title ILIKE $${paramCount++}`);
        values.push(`%${filters.title}%`);
    }
    if (filters.status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(filters.status);
    }
    if (filters.eventId) {
        conditions.push(`event_id = $${paramCount++}`);
        values.push(filters.eventId);
    }
    if (filters.vendorId) {
        conditions.push(`vendor_id = $${paramCount++}`);
        values.push(filters.vendorId);
    }
    if (filters.organizerId) {
        conditions.push(`organizer_id = $${paramCount++}`);
        values.push(filters.organizerId);
    }
    if (filters.search) {
        conditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
        values.push(`%${filters.search}%`);
        paramCount++;
    }

    return paramCount;
}

function selectFields(taskData, fields) {
    if (!fields || fields.length === 0) {
        return taskData;
    }

    const validFields = ['id', 'title', 'description', 'status', 'eventId', 'vendorId', 'organizerId', 'createdAt', 'updatedAt'];
    const invalidFields = fields.filter(f => !validFields.includes(f));

    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${validFields.join(', ')}`);
    }

    const result = {};
    fields.forEach(field => {
        if (taskData.hasOwnProperty(field)) {
            result[field] = taskData[field];
        }
    });

    return result;
}

export async function getAllTasks(req, res) {
    try {
        const userRole = req.user.role;
        const userId = req.user.sub;

        // Attendees have no task access
        if (userRole === 'attendee') {
            return res.json({
                data: [],
                pagination: buildPaginationInfo(1, 10, 0)
            });
        }

        // For vendors, get their vendorId from userId
        let vendorId = null;
        if (userRole === 'vendor') {
            vendorId = await getVendorIdFromUserId(userId);
            if (!vendorId) {
                // User is a vendor role but no vendor record found
                return res.json({
                    data: [],
                    pagination: buildPaginationInfo(1, 10, 0)
                });
            }
        }

        // Parse query parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size) || 10));
        const sortBy = req.query.sort_by || 'id';
        const sortOrder = (req.query.sort_order || 'desc').toLowerCase();
        const fields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()).filter(f => f) : null;

        // Parse filters
        const filters = {
            title: req.query.title,
            status: req.query.status,
            eventId: req.query.event_id,
            vendorId: req.query.vendor_id,
            organizerId: req.query.organizer_id,
            search: req.query.search
        };

        // Validate sort parameters
        const validSortFields = ['id', 'title', 'status', 'eventId', 'vendorId', 'organizerId', 'createdAt', 'updatedAt'];
        const fieldMapping = {
            'id': 'id',
            'title': 'title',
            'status': 'status',
            'eventId': 'event_id',
            'vendorId': 'vendor_id',
            'organizerId': 'organizer_id',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        };

        if (!validSortFields.includes(sortBy)) {
            return res.status(400).json({
                detail: `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`
            });
        }

        if (!['asc', 'desc'].includes(sortOrder)) {
            return res.status(400).json({
                detail: 'Invalid sort order. Must be "asc" or "desc"'
            });
        }

        // Build WHERE conditions
        const conditions = [];
        const values = [];
        applyFilters(conditions, values, filters, userRole, userId, vendorId);

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM tasks ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const totalCount = parseInt(countResult.rows[0].count);

        // Build and execute main query
        const sortColumn = fieldMapping[sortBy];
        const offset = (page - 1) * pageSize;

        const dataQuery = `
            SELECT 
                id, 
                title, 
                description, 
                status, 
                event_id as "eventId", 
                vendor_id as "vendorId", 
                organizer_id as "organizerId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM tasks 
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `;

        const dataResult = await pool.query(dataQuery, [...values, pageSize, offset]);

        // Apply field selection if specified
        let tasks = dataResult.rows;
        if (fields) {
            try {
                tasks = tasks.map(task => selectFields(task, fields));
            } catch (error) {
                return res.status(400).json({ detail: error.message });
            }
        }

        // Build pagination info
        const pagination = buildPaginationInfo(page, pageSize, totalCount);

        res.json({
            data: tasks,
            pagination
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ detail: 'Internal server error' });
    }
}

export async function createTask(req, res) {
    try {
        const { title, description, status, eventId, vendorId } = req.body;
        const organizerId = req.user.sub; // Get organizer ID from JWT token
        
        // Organizers can only create tasks for their own events
        if (req.user.role === 'organizer') {
            const token = req.headers.authorization;
            try {
                const eventResponse = await axios.get(`http://events-service:8002/v1/events/${eventId}`, {
                    headers: { Authorization: token }
                });
                if (eventResponse.data.organizerId !== req.user.sub) {
                    return res.status(403).json({ detail: 'You can only create tasks for your own events' });
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    return res.status(404).json({ detail: 'Event not found' });
                }
                throw error;
            }
        }

        const result = await pool.query(
            'INSERT INTO tasks (title, description, status, event_id, vendor_id, organizer_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId"',
            [title, description, status || 'pending', eventId, vendorId || null, organizerId]
        );

        const task = result.rows[0];

        // Notify vendor if task is assigned
        if (vendorId) {
            console.log(`📧 Fetching vendor email for vendor ID: ${vendorId}`);
            const vendorEmail = await getVendorEmail(vendorId);
            console.log(`📧 Got vendor email: ${vendorEmail}`);

            const vendorUserId = await getVendorUserId(vendorEmail);
            console.log(`👤 Got vendor user ID: ${vendorUserId}`);

            if (vendorUserId) {
                console.log(`📤 Publishing notification to user ID: ${vendorUserId} with email: ${vendorEmail}`);
                await publishNotification(
                    vendorUserId,  // Use the actual vendor user ID from auth service
                    'task_assigned',
                    `📋 New task "${title}" has been assigned to you!`,
                    { taskId: task.id, taskTitle: title, eventId },
                    vendorEmail
                );
            } else {
                console.error(`⚠️  Could not find vendor user ID for email ${vendorEmail}`);
            }
        }

        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ detail: 'Internal server error' });
    }
}

export async function getTaskById(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId" FROM tasks WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        const task = result.rows[0];
        
        // Vendors can only view tasks assigned to them
        // Note: task.vendorId is the vendor record ID, req.user.sub is the userId
        if (req.user.role === 'vendor' && task.vendorId) {
            const vendorUserId = await getUserIdFromVendorId(task.vendorId);
            if (vendorUserId !== req.user.sub) {
                return res.status(403).json({ detail: 'You can only view tasks assigned to you' });
            }
        } else if (req.user.role === 'vendor' && !task.vendorId) {
            return res.status(403).json({ detail: 'You can only view tasks assigned to you' });
        }
        
        // Organizers can only view tasks for their own events
        if (req.user.role === 'organizer' && task.organizerId !== req.user.sub) {
            return res.status(403).json({ detail: 'You can only view tasks for your own events' });
        }

        res.json(task);

        res.json(task);
        
        // Vendors can only view tasks assigned to them
        if (req.user.role === 'vendor' && task.vendorId !== req.user.sub) {
            return res.status(403).json({ detail: 'You can only view tasks assigned to you' });
        }
        
        // Organizers can only view tasks for their own events
        if (req.user.role === 'organizer' && task.organizerId !== req.user.sub) {
            return res.status(403).json({ detail: 'You can only view tasks for your own events' });
        }

        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ detail: 'Internal server error' });
    }
}

export async function updateTask(req, res) {
    try {
        const { id } = req.params;
        const { title, description, status, vendorId } = req.body;

        // Get current task data before update
        const currentTaskResult = await pool.query(
            'SELECT id, title, status, event_id, vendor_id, organizer_id FROM tasks WHERE id = $1',
            [id]
        );

        if (currentTaskResult.rows.length === 0) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        const currentTask = currentTaskResult.rows[0];
        
        // Vendors can only update tasks assigned to them
        if (req.user.role === 'vendor') {
            // Get the vendorId for this user
            const userVendorId = await getVendorIdFromUserId(req.user.sub);
            
            if (!userVendorId) {
                return res.status(403).json({ detail: 'No vendor profile found for this user' });
            }
            
            if (!currentTask.vendor_id || String(currentTask.vendor_id) !== String(userVendorId)) {
                return res.status(403).json({ detail: 'You can only update tasks assigned to you' });
            }
            
            
            // Vendors can only update status, not reassign or change other fields
            if (title !== undefined || description !== undefined || vendorId !== undefined) {
                return res.status(403).json({ detail: 'Vendors can only update task status' });
            }
        }
        
        // Organizers can only update tasks for their own events
        if (req.user.role === 'organizer' && currentTask.organizer_id !== req.user.sub) {
            return res.status(403).json({ detail: 'You can only update tasks for your own events' });
        }

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramCount++}`);
            values.push(title);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }
        if (vendorId !== undefined) {
            updates.push(`vendor_id = $${paramCount++}`);
            values.push(vendorId);
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId"`,
            values
        );

        const updatedTask = result.rows[0];

        // Send notifications for status updates
        if (status && status !== currentTask.status && currentTask.organizer_id) {
            const statusEmoji = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '📋';
            const statusMessage = status === 'completed' ? 'completed' : status === 'in_progress' ? 'started working on' : 'updated';

            // Get organizer email and notify about task status change
            const organizerEmail = await getUserEmail(currentTask.organizer_id);
            await publishNotification(
                currentTask.organizer_id,
                'task_status_updated',
                `${statusEmoji} Task "${updatedTask.title}" has been ${statusMessage}${currentTask.vendor_id ? ' by the vendor' : ''}.`,
                {
                    taskId: updatedTask.id,
                    taskTitle: updatedTask.title,
                    oldStatus: currentTask.status,
                    newStatus: status,
                    eventId: updatedTask.eventId
                },
                organizerEmail
            );
        }

        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ detail: 'Internal server error' });
    }
}

export async function deleteTask(req, res) {
    try {
        const { id } = req.params;
        
        // Organizers can only delete tasks for their own events
        if (req.user.role === 'organizer') {
            const checkResult = await pool.query(
                'SELECT organizer_id FROM tasks WHERE id = $1',
                [id]
            );
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ detail: 'Task not found' });
            }
            if (checkResult.rows[0].organizer_id !== req.user.sub) {
                return res.status(403).json({ detail: 'You can only delete tasks for your own events' });
            }
        }
        
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: 'Task not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ detail: 'Internal server error' });
    }
}
