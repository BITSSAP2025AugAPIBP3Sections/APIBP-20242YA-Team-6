import pool from '../config/database.js';
import { publishNotification } from '../config/kafka.js';
import { getUserEmail } from '../utils/externalServices.js';
import { getEventStakeholders } from '../utils/stakeholders.js';

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

function applyFilters(conditions, values, filters) {
  let paramCount = values.length + 1;
  
  if (filters.name) {
    conditions.push(`name ILIKE $${paramCount++}`);
    values.push(`%${filters.name}%`);
  }
  if (filters.location) {
    conditions.push(`location ILIKE $${paramCount++}`);
    values.push(`%${filters.location}%`);
  }
  if (filters.organizerId) {
    conditions.push(`organizer_id = $${paramCount++}`);
    values.push(filters.organizerId);
  }
  if (filters.search) {
    conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR location ILIKE $${paramCount})`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }
  
  return paramCount;
}

function selectFields(eventData, fields) {
  if (!fields || fields.length === 0) {
    return eventData;
  }
  
  const validFields = ['id', 'name', 'description', 'location', 'startAt', 'endAt', 'organizerId'];
  const invalidFields = fields.filter(f => !validFields.includes(f));
  
  if (invalidFields.length > 0) {
    throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${validFields.join(', ')}`);
  }
  
  const result = {};
  fields.forEach(field => {
    if (eventData.hasOwnProperty(field)) {
      result[field] = eventData[field];
    }
  });
  
  return result;
}

export async function getAllEvents(req, res) {
  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size) || 10));
    const sortBy = req.query.sort_by || 'id';
    const sortOrder = (req.query.sort_order || 'asc').toLowerCase();
    const fields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()).filter(f => f) : null;
    
    // Parse filters
    const filters = {
      name: req.query.name,
      location: req.query.location,
      organizerId: req.query.organizerId,
      search: req.query.search
    };
    
    // Validate sort parameters
    const validSortFields = ['id', 'name', 'location', 'startAt', 'endAt', 'organizerId', 'createdAt'];
    const fieldMapping = {
      'id': 'id',
      'name': 'name',
      'location': 'location',
      'startAt': 'start_at',
      'endAt': 'end_at',
      'organizerId': 'organizer_id',
      'createdAt': 'created_at'
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
    applyFilters(conditions, values, filters);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM events ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Build and execute main query
    const sortColumn = fieldMapping[sortBy];
    const offset = (page - 1) * pageSize;
    
    const dataQuery = `
      SELECT 
        id, 
        name, 
        description, 
        location, 
        start_at as "startAt", 
        end_at as "endAt", 
        organizer_id as "organizerId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM events 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const dataResult = await pool.query(dataQuery, [...values, pageSize, offset]);
    
    // Apply field selection if specified
    let events = dataResult.rows;
    if (fields) {
      try {
        events = events.map(event => selectFields(event, fields));
      } catch (error) {
        return res.status(400).json({ detail: error.message });
      }
    }
    
    // Build pagination info
    const paginationInfo = buildPaginationInfo(page, pageSize, totalCount);
    
    // Build applied filters object
    const appliedFilters = {};
    if (filters.name) appliedFilters.name = filters.name;
    if (filters.location) appliedFilters.location = filters.location;
    if (filters.organizerId) appliedFilters.organizerId = filters.organizerId;
    if (filters.search) appliedFilters.search = filters.search;
    
    const sortingInfo = {
      sort_by: sortBy,
      sort_order: sortOrder
    };
    
    // Build response
    const response = {
      events: events,
      pagination: paginationInfo,
      filters: Object.keys(appliedFilters).length > 0 ? appliedFilters : null,
      sorting: sortingInfo
    };
    
    res.json(response);
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
