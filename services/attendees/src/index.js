import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { body, param, validationResult } from 'express-validator';
import { Kafka } from 'kafkajs';
import pool, { initDB } from './database.js';
import { verifyToken, requireRole } from './middleware.js';

const PORT = Number(process.env.PORT || 8005);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const app = express();

app.use(cors());
app.use(express.json());

// Kafka setup
const kafka = new Kafka({
  clientId: 'attendees-service',
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

async function publishNotification(recipientId, type, message, eventData = {}) {
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
  res.json({ status: 'ok', service: 'attendees' });
});

app.get('/v1/attendees', verifyToken, async (req, res) => {
  try {
    // Users can only see their own RSVPs
    const userId = req.user.sub;
    const result = await pool.query('SELECT id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt" FROM attendees WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/v1/attendees/:id', verifyToken, [param('id').isInt()], validate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, user_id as \"userId\", event_id as \"eventId\", status, rsvp_at as \"rsvpAt\" FROM attendees WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Attendee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching attendee:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/v1/events/:eventId/attendees', verifyToken, [param('eventId').notEmpty()], validate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await pool.query('SELECT id, user_id as \"userId\", event_id as \"eventId\", status, rsvp_at as \"rsvpAt\" FROM attendees WHERE event_id = $1 ORDER BY created_at DESC', [eventId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.post('/v1/events/:eventId/attendees', verifyToken, [param('eventId').notEmpty(), body('status').isIn(['going', 'interested', 'not_going'])], validate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.user.sub;
    const existing = await pool.query('SELECT id FROM attendees WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ detail: 'RSVP already exists for this user and event' });
    }
    const result = await pool.query('INSERT INTO attendees (user_id, event_id, status, rsvp_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, user_id as \"userId\", event_id as \"eventId\", status, rsvp_at as \"rsvpAt\"', [userId, eventId, status]);
    
    const rsvp = result.rows[0];
    
    // Notify user about their RSVP
    const statusEmoji = status === 'going' ? '✅' : status === 'interested' ? '🤔' : '❌';
    await publishNotification(
      userId,
      'rsvp_confirmed',
      `${statusEmoji} Your RSVP for event #${eventId} has been confirmed as "${status}".`,
      { eventId, status }
    );
    
    res.status(201).json(rsvp);
  } catch (error) {
    console.error('Error creating RSVP:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

initDB().then(async () => {
  await initKafka();
  app.listen(PORT, () => {
    console.log(`Attendees service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
