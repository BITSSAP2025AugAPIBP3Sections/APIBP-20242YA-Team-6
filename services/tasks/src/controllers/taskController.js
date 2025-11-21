import pool from '../config/database.js';
import { publishNotification } from '../config/kafka.js';
import { getUserEmail, getVendorEmail, getVendorUserId } from '../utils/externalServices.js';

export async function getAllTasks(req, res) {
    try {
        const userRole = req.user.role;
        const userId = req.user.sub;
        let result;

        if (userRole === 'admin' || userRole === 'organizer') {
            // Admins and organizers can see all tasks
            result = await pool.query(
                'SELECT id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId" FROM tasks ORDER BY created_at DESC'
            );
        } else if (userRole === 'vendor') {
            // Vendors can only see tasks assigned to them
            result = await pool.query(
                'SELECT id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId" FROM tasks WHERE vendor_id = $1 ORDER BY created_at DESC',
                [userId]
            );
        } else {
            // Attendees get empty array (no task access)
            return res.json([]);
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ detail: 'Internal server error' });
    }
}

export async function createTask(req, res) {
    try {
        const { title, description, status, eventId, vendorId } = req.body;
        const organizerId = req.user.sub; // Get organizer ID from JWT token

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

        res.json(result.rows[0]);
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
