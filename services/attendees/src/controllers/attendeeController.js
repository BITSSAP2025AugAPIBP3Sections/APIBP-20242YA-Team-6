import pool from '../config/database.js';
import { publishNotification } from '../config/kafka.js';

export const getUserAttendees = async (req, res) => {
  try {
    // Users can only see their own RSVPs
    const userId = req.user.sub;
    const result = await pool.query(
      'SELECT id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt" FROM attendees WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};

export const getAttendeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt" FROM attendees WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Attendee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching attendee:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};

export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await pool.query(
      'SELECT id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt" FROM attendees WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};

export const createRsvp = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.user.sub;
    
    // Check if RSVP already exists
    const existing = await pool.query(
      'SELECT id FROM attendees WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ detail: 'RSVP already exists for this user and event' });
    }
    
    // Create new RSVP
    const result = await pool.query(
      'INSERT INTO attendees (user_id, event_id, status, rsvp_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt"',
      [userId, eventId, status]
    );
    
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
};