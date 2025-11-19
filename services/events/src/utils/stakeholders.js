import pool from '../config/database.js';
import { getUserEmail, getVendorEmail, getAttendees, getTasks } from './externalServices.js';

export async function getEventStakeholders(eventId, userToken = null) {
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

    // Get attendees
    const attendees = await getAttendees(eventId, userToken);
    for (const attendee of attendees) {
      const attendeeEmail = await getUserEmail(attendee.userId);
      if (attendeeEmail) {
        stakeholders.push({ id: attendee.userId, type: 'attendee', email: attendeeEmail });
      }
    }

    // Get vendors assigned to tasks
    const tasks = await getTasks(eventId, userToken);
    const vendorIds = [...new Set(tasks.filter(task => task.vendorId).map(task => task.vendorId))];
    
    for (const vendorId of vendorIds) {
      const vendorEmail = await getVendorEmail(vendorId);
      if (vendorEmail) {
        stakeholders.push({ id: vendorId, type: 'vendor', email: vendorEmail });
      }
    }

    return stakeholders;
  } catch (error) {
    console.error('Error getting event stakeholders:', error);
    return [];
  }
}
