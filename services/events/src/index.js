import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { body, param, validationResult } from 'express-validator';
import { Kafka } from 'kafkajs';
import pool, { initDB } from './database.js';
import { verifyToken, requireRole } from './middleware.js';

const PORT = Number(process.env.PORT || 8002);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const app = express();

app.use(cors());
app.use(express.json());

// Kafka setup
const kafka = new Kafka({
  clientId: 'events-service',
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

async function publishNotification(recipientId, type, message, eventData = {}, recipientEmail = null) {
  if (!producer) return;
  try {
    await producer.send({
      topic: 'notifications',
      messages: [{
        key: String(recipientId),
        value: JSON.stringify({
          recipientId: String(recipientId),
          type,
          message,
          eventData,
          recipientEmail,
          createdAt: new Date().toISOString()
        })
      }]
    });
  } catch (error) {
    console.error('Failed to publish notification:', error);
  }
}

// Helper function to get user email from auth service
async function getUserEmail(userId) {
  try {
    const response = await fetch(`http://auth-service:8001/v1/users/${userId}`);
    if (response.ok) {
      const user = await response.json();
      return user.email;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
}

// Helper function to get vendor email from vendor service
async function getVendorEmail(vendorId) {
  try {
    const response = await fetch(`http://vendors-service:8003/v1/vendors/${vendorId}`);
    if (response.ok) {
      const vendor = await response.json();
      return vendor.email;
    }
    return null;
  } catch (error) {
    console.error('Error fetching vendor email:', error);
    return null;
  }
}

// Helper function to get all stakeholders for an event
async function getEventStakeholders(eventId, userToken = null) {
  try {
    const stakeholders = [];
    
    // Get event organizer
    const eventResult = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventResult.rows.length > 0) {
      const organizerId = eventResult.rows[0].organizer_id;
      const organizerEmail = await getUserEmail(organizerId);
      if (organizerEmail) {
        stakeholders.push({ id: organizerId, type: 'organizer', email: organizerEmail });
      }
    }

    // Get attendees from attendees service
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      // Add authorization if token is provided
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      const attendeesResponse = await fetch(`http://attendees-service:8005/v1/events/${eventId}/attendees`, {
        headers
      });
      if (attendeesResponse.ok) {
        const attendees = await attendeesResponse.json();
        for (const attendee of attendees) {
          const attendeeEmail = await getUserEmail(attendee.userId);
          if (attendeeEmail) {
            stakeholders.push({ id: attendee.userId, type: 'attendee', email: attendeeEmail });
          }
        }
      } else {
        console.log('Attendees service response:', attendeesResponse.status, await attendeesResponse.text());
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }

    // Get vendors assigned to tasks for this event from tasks service
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      const tasksResponse = await fetch(`http://tasks-service:8004/v1/tasks?eventId=${eventId}`, {
        headers
      });
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        const vendorIds = [...new Set(tasks.filter(task => task.vendorId).map(task => task.vendorId))];
        
        for (const vendorId of vendorIds) {
          const vendorEmail = await getVendorEmail(vendorId);
          if (vendorEmail) {
            stakeholders.push({ id: vendorId, type: 'vendor', email: vendorEmail });
          }
        }
      } else {
        console.log('Tasks service response:', tasksResponse.status, await tasksResponse.text());
      }
    } catch (error) {
      console.error('Error fetching task vendors:', error);
    }

    return stakeholders;
  } catch (error) {
    console.error('Error getting event stakeholders:', error);
    return [];
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
  res.json({ status: 'ok', service: 'events' });
});

app.get('/v1/events', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, location, start_at as \"startAt\", end_at as \"endAt\", organizer_id as \"organizerId\" FROM events ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.post('/v1/events', verifyToken, requireRole('admin', 'organizer'), [body('name').notEmpty().trim(), body('description').optional().trim(), body('location').notEmpty().trim(), body('startAt').isISO8601(), body('endAt').isISO8601(), body('organizerId').notEmpty()], validate, async (req, res) => {
  try {
    const { name, description, location, startAt, endAt, organizerId } = req.body;
    const result = await pool.query('INSERT INTO events (name, description, location, start_at, end_at, organizer_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, location, start_at as \"startAt\", end_at as \"endAt\", organizer_id as \"organizerId\"', [name, description, location, startAt, endAt, organizerId]);
    
    const event = result.rows[0];
    
    // Get organizer email and publish notification
    const organizerEmail = await getUserEmail(organizerId);
    await publishNotification(
      organizerId,
      'event_created',
      `🎉 Event "${name}" has been created successfully! It's scheduled for ${new Date(startAt).toLocaleDateString()}.`,
      { eventId: event.id, eventName: name, location },
      organizerEmail
    );
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/v1/events/:id', verifyToken, [param('id').isInt()], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, description, location, start_at as \"startAt\", end_at as \"endAt\", organizer_id as \"organizerId\" FROM events WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.patch('/v1/events/:id', verifyToken, requireRole('admin', 'organizer'), [param('id').isInt(), body('name').optional().trim(), body('description').optional().trim(), body('location').optional().trim(), body('startAt').optional().isISO8601(), body('endAt').optional().isISO8601()], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, startAt, endAt } = req.body;
    
    // Check if event exists and get current data
    const checkResult = await pool.query('SELECT id, name, description, location, start_at, end_at, organizer_id FROM events WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Event not found' });
    }
    
    const currentEvent = checkResult.rows[0];
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (location !== undefined) { updates.push(`location = $${paramCount++}`); values.push(location); }
    if (startAt !== undefined) { updates.push(`start_at = $${paramCount++}`); values.push(startAt); }
    if (endAt !== undefined) { updates.push(`end_at = $${paramCount++}`); values.push(endAt); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    // Update the event
    const result = await pool.query(`UPDATE events SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, description, location, start_at as "startAt", end_at as "endAt", organizer_id as "organizerId", created_at as "createdAt", updated_at as "updatedAt"`, values);
    const updatedEvent = result.rows[0];
    
    // Prepare change summary for notification
    const changes = [];
    if (name !== undefined && name !== currentEvent.name) changes.push(`name to "${name}"`);
    if (description !== undefined && description !== currentEvent.description) changes.push('description');
    if (location !== undefined && location !== currentEvent.location) changes.push(`location to "${location}"`);
    if (startAt !== undefined && startAt !== currentEvent.start_at) changes.push(`start time to ${new Date(startAt).toLocaleDateString()}`);
    if (endAt !== undefined && endAt !== currentEvent.end_at) changes.push(`end time to ${new Date(endAt).toLocaleDateString()}`);
    
    // Send notifications to all stakeholders if there are changes
    if (changes.length > 0) {
      const userToken = req.headers.authorization?.replace('Bearer ', '');
      const stakeholders = await getEventStakeholders(id, userToken);
      const changeText = changes.length === 1 ? changes[0] : changes.slice(0, -1).join(', ') + ' and ' + changes.slice(-1);
      
      for (const stakeholder of stakeholders) {
        const roleEmoji = stakeholder.type === 'organizer' ? '👤' : stakeholder.type === 'vendor' ? '🏢' : '👥';
        const roleText = stakeholder.type === 'organizer' ? 'organizer' : stakeholder.type === 'vendor' ? 'vendor' : 'attendee';
        
        await publishNotification(
          stakeholder.id,
          'event_updated',
          `📢 Event "${updatedEvent.name}" has been updated! Changed: ${changeText}. ${roleEmoji} You are notified as ${roleText}.`,
          { 
            eventId: updatedEvent.id, 
            eventName: updatedEvent.name, 
            changes: changes,
            location: updatedEvent.location,
            startAt: updatedEvent.startAt,
            endAt: updatedEvent.endAt
          },
          stakeholder.email
        );
      }
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.delete('/v1/events/:id', verifyToken, requireRole('admin', 'organizer'), [param('id').isInt()], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Event not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    if (error.code === '23503') {
      return res.status(409).json({ detail: 'Cannot delete event with existing dependencies' });
    }
    res.status(500).json({ detail: 'Internal server error' });
  }
});

initDB().then(async () => {
  await initKafka();
  app.listen(PORT, () => {
    console.log(`Events service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
