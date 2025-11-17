import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { body, param, validationResult } from 'express-validator';
import { Kafka } from 'kafkajs';
import pool, { initDB } from './database.js';
import { verifyToken, requireRole } from './middleware.js';

const PORT = Number(process.env.PORT || 8004);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
const SECRET_KEY = process.env.SECRET_KEY || 'your-super-secret-jwt-key-change-in-production';

const app = express();

app.use(cors());
app.use(express.json());

// Kafka setup
const kafka = new Kafka({
  clientId: 'tasks-service',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 100, retries: 8 }
});

let producer = null;

async function initKafka() {
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('✅ Kafka producer connected');
  } catch (error) {
    console.error('⚠️  Kafka connection failed:', error.message);
  }
}

async function getUserEmail(userId) {
  try {
    const response = await fetch(`http://auth-service:8001/v1/users/${userId}`);
    if (response.ok) {
      const user = await response.json();
      return user.email;
    }
  } catch (error) {
    console.error(`⚠️  Failed to fetch email for user ${userId}:`, error);
  }
  return null;
}

// Simple in-memory cache for vendor emails (updated via events in production)
const vendorEmailCache = new Map();

async function getVendorEmail(vendorId) {
  try {
    // First check cache
    if (vendorEmailCache.has(vendorId)) {
      console.log(`📋 Using cached vendor email for vendor ID: ${vendorId}`);
      return vendorEmailCache.get(vendorId);
    }
    
    // Fallback to HTTP call (should be replaced with event-driven updates)
    console.log(`🌐 Cache miss - fetching vendor email via HTTP for vendor ID: ${vendorId}`);
    const serviceToken = jwt.sign(
      { 
        sub: 'tasks-service',
        email: 'service@internal.com',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      }, 
      SECRET_KEY
    );
    
    const response = await fetch(`http://vendors-service:8003/v1/vendors/${vendorId}`, {
      headers: { 'Authorization': `Bearer ${serviceToken}` }
    });
    
    if (response.ok) {
      const vendor = await response.json();
      console.log(`📧 Vendor data fetched:`, vendor);
      
      // Cache the result
      vendorEmailCache.set(vendorId, vendor.email);
      
      return vendor.email;
    } else {
      console.error(`❌ Failed to fetch vendor ${vendorId}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`⚠️  Failed to fetch email for vendor ${vendorId}:`, error);
  }
  return null;
}

async function getVendorUserId(vendorEmail) {
  try {
    console.log(`🔍 Looking for user ID for vendor email: ${vendorEmail}`);
    
    // Generate service token for auth service call
    const serviceToken = jwt.sign(
      { 
        sub: 'tasks-service',
        email: 'service@internal.com',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      }, 
      SECRET_KEY
    );
    
    // Call auth service to search user by email
    const response = await fetch(`http://auth-service:8001/v1/auth/users/search?email=${encodeURIComponent(vendorEmail)}`, {
      headers: { 'Authorization': `Bearer ${serviceToken}` }
    });
    
    if (response.ok) {
      const user = await response.json();
      console.log(`✅ Found vendor user ID: ${user.id} for email ${vendorEmail}`);
      return parseInt(user.id);
    } else if (response.status === 404) {
      console.log(`⚠️  No user found for email ${vendorEmail}`);
    } else {
      console.error(`❌ Failed to search user: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`⚠️  Failed to fetch user ID for email ${vendorEmail}:`, error);
  }
  return null;
}

async function publishNotification(recipientId, type, message, eventData = {}, recipientEmail = null) {
  if (!producer) return;
  try {
    await producer.send({
      topic: 'notifications',
      messages: [{
        key: String(recipientId),
        value: JSON.stringify({
          recipientId: String(recipientId),
          recipientEmail,
          type,
          message,
          eventData,
          createdAt: new Date().toISOString()
        })
      }]
    });
    console.log(`📤 Notification published: ${type} to user ${recipientId}`);
  } catch (error) {
    console.error('Error publishing notification:', error);
  }
}

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tasks' });
});

app.get('/v1/tasks', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.sub;
    let result;

    if (userRole === 'admin' || userRole === 'organizer') {
      // Admins and organizers can see all tasks
      result = await pool.query('SELECT id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId" FROM tasks ORDER BY created_at DESC');
    } else if (userRole === 'vendor') {
      // Vendors can only see tasks assigned to them
      result = await pool.query('SELECT id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId" FROM tasks WHERE vendor_id = $1 ORDER BY created_at DESC', [userId]);
    } else {
      // Attendees get empty array (no task access)
      return res.json([]);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.post('/v1/tasks', verifyToken, requireRole('admin', 'organizer'), [body('title').notEmpty().trim(), body('description').optional().trim(), body('status').optional().isIn(['pending', 'in_progress', 'completed']), body('eventId').notEmpty(), body('vendorId').optional()], validate, async (req, res) => {
  try {
    const { title, description, status, eventId, vendorId } = req.body;
    const organizerId = req.user.sub; // Get organizer ID from JWT token
    const result = await pool.query('INSERT INTO tasks (title, description, status, event_id, vendor_id, organizer_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, status, event_id as \"eventId\", vendor_id as \"vendorId\", organizer_id as \"organizerId\"', [title, description, status || 'pending', eventId, vendorId || null, organizerId]);
    
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
});

app.get('/v1/tasks/:id', verifyToken, [param('id').isInt()], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, title, description, status, event_id as \"eventId\", vendor_id as \"vendorId\", organizer_id as \"organizerId\" FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.patch('/v1/tasks/:id', verifyToken, requireRole('admin', 'organizer', 'vendor'), [param('id').isInt(), body('title').optional().trim(), body('description').optional().trim(), body('status').optional().isIn(['pending', 'in_progress', 'completed']), body('vendorId').optional()], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, vendorId } = req.body;
    
    // Get current task data before update
    const currentTaskResult = await pool.query('SELECT id, title, status, event_id, vendor_id, organizer_id FROM tasks WHERE id = $1', [id]);
    if (currentTaskResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    const currentTask = currentTaskResult.rows[0];
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    if (title !== undefined) { updates.push(`title = $${paramCount++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (vendorId !== undefined) { updates.push(`vendor_id = $${paramCount++}`); values.push(vendorId); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const result = await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, title, description, status, event_id as "eventId", vendor_id as "vendorId", organizer_id as "organizerId"`, values);
    
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
});

app.delete('/v1/tasks/:id', verifyToken, requireRole('admin', 'organizer'), [param('id').isInt()], validate, async (req, res) => {
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
});

initDB().then(async () => {
  await initKafka();
  app.listen(PORT, () => {
    console.log(`Tasks service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
