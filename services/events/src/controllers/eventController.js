import pool from '../config/database.js';
import { publishNotification } from '../config/kafka.js';
import { getUserEmail } from '../utils/externalServices.js';
import { getEventStakeholders } from '../utils/stakeholders.js';

export async function getAllEvents(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, description, location, start_at as "startAt", end_at as "endAt", organizer_id as "organizerId" FROM events ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

export async function createEvent(req, res) {
  try {
    const { name, description, location, startAt, endAt, organizerId } = req.body;
    const result = await pool.query(
      'INSERT INTO events (name, description, location, start_at, end_at, organizer_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, location, start_at as "startAt", end_at as "endAt", organizer_id as "organizerId"',
      [name, description, location, startAt, endAt, organizerId]
    );
    
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
}

export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, description, location, start_at as "startAt", end_at as "endAt", organizer_id as "organizerId" FROM events WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

export async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { name, description, location, startAt, endAt } = req.body;
    
    // Check if event exists and get current data
    const checkResult = await pool.query(
      'SELECT id, name, description, location, start_at, end_at, organizer_id FROM events WHERE id = $1',
      [id]
    );
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
    const result = await pool.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, description, location, start_at as "startAt", end_at as "endAt", organizer_id as "organizerId", created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );
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
}

export async function deleteEvent(req, res) {
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
}
