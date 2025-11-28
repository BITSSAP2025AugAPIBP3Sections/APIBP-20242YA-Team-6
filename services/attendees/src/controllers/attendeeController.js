import { pool } from '../config/database.js';
import { publishNotification } from '../config/kafka.js';
import grpc from '@grpc/grpc-js';
import axios from 'axios';

// Helper function to get user email from auth service
async function getUserEmail(userId) {
  try {
    const response = await axios.get(`http://auth-service:8001/v1/users/${userId}`);
    return response.data?.email;
  } catch (error) {
    console.error(`Failed to get email for user ${userId}:`, error.message);
    return null;
  }
}

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

function applyFilters(conditions, values, filters, userId = null) {
  let paramCount = values.length + 1;
  
  // Always filter by user_id for user attendees
  if (userId) {
    conditions.push(`user_id = $${paramCount++}`);
    values.push(userId);
  }
  
  if (filters.eventId) {
    conditions.push(`event_id = $${paramCount++}`);
    values.push(filters.eventId);
  }
  if (filters.status) {
    conditions.push(`status = $${paramCount++}`);
    values.push(filters.status);
  }
  if (filters.userId && !userId) { // Only allow filtering by userId if not already filtered
    conditions.push(`user_id = $${paramCount++}`);
    values.push(filters.userId);
  }
  
  return paramCount;
}

function selectFields(attendeeData, fields) {
  if (!fields || fields.length === 0) {
    return attendeeData;
  }
  
  const validFields = ['id', 'userId', 'eventId', 'status', 'rsvpAt', 'createdAt', 'updatedAt'];
  const invalidFields = fields.filter(f => !validFields.includes(f));
  
  if (invalidFields.length > 0) {
    throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Valid fields: ${validFields.join(', ')}`);
  }
  
  const result = {};
  fields.forEach(field => {
    if (attendeeData.hasOwnProperty(field)) {
      result[field] = attendeeData[field];
    }
  });
  
  return result;
}

export const getUserAttendees = async (req, res) => {
  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size) || 10));
    const sortBy = req.query.sort_by || 'id';
    const sortOrder = (req.query.sort_order || 'desc').toLowerCase();
    const fields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()).filter(f => f) : null;
    
    // Parse filters
    const filters = {
      eventId: req.query.eventId,
      status: req.query.status
    };
    
    // Validate sort parameters
    const validSortFields = ['id', 'eventId', 'status', 'rsvpAt', 'createdAt', 'updatedAt'];
    const fieldMapping = {
      'id': 'id',
      'eventId': 'event_id',
      'status': 'status',
      'rsvpAt': 'rsvp_at',
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
    
    // Validate status filter
    if (filters.status && !['invited', 'going', 'interested', 'not_going'].includes(filters.status)) {
      return res.status(400).json({ 
        detail: 'Invalid status. Must be one of: invited, going, interested, not_going' 
      });
    }
    
    // Users can only see their own RSVPs
    const userId = req.user.sub;
    
    // Build WHERE conditions
    const conditions = [];
    const values = [];
    applyFilters(conditions, values, filters, userId);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM attendees ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Build and execute main query
    const sortColumn = fieldMapping[sortBy];
    const offset = (page - 1) * pageSize;
    
    const dataQuery = `
      SELECT 
        id, 
        user_id as "userId", 
        event_id as "eventId", 
        status, 
        rsvp_at as "rsvpAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM attendees 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const dataResult = await pool.query(dataQuery, [...values, pageSize, offset]);
    
    // Apply field selection if specified
    let attendees = dataResult.rows;
    if (fields) {
      try {
        attendees = attendees.map(attendee => selectFields(attendee, fields));
      } catch (error) {
        return res.status(400).json({ detail: error.message });
      }
    }
    
    // Build pagination info
    const paginationInfo = buildPaginationInfo(page, pageSize, totalCount);
    
    // Build applied filters object
    const appliedFilters = {};
    if (filters.eventId) appliedFilters.eventId = filters.eventId;
    if (filters.status) appliedFilters.status = filters.status;
    
    const sortingInfo = {
      sort_by: sortBy,
      sort_order: sortOrder
    };
    
    // Build response
    const response = {
      attendees: attendees,
      pagination: paginationInfo,
      filters: Object.keys(appliedFilters).length > 0 ? appliedFilters : null,
      sorting: sortingInfo
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};

export const getAttendeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()).filter(f => f) : null;
    
    const result = await pool.query(
      'SELECT id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt", created_at as "createdAt", updated_at as "updatedAt" FROM attendees WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Attendee not found' });
    }
    
    let attendee = result.rows[0];
    
    // Apply field selection if specified
    if (fields) {
      try {
        attendee = selectFields(attendee, fields);
      } catch (error) {
        return res.status(400).json({ detail: error.message });
      }
    }
    
    res.json(attendee);
  } catch (error) {
    console.error('Error fetching attendee:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};

export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Only organizers (for their events) and admins can view event attendees
    if (req.user.role === 'organizer') {
      // Verify the organizer owns this event by checking with events service
      // For now, we'll trust the external call - in production, add event ownership validation
      const token = req.headers.authorization;
      try {
        const eventResponse = await axios.get(`http://events-service:8002/v1/events/${eventId}`, {
          headers: { Authorization: token }
        });
        if (eventResponse.data.organizerId !== req.user.sub) {
          return res.status(403).json({ detail: 'You can only view attendees for your own events' });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          return res.status(404).json({ detail: 'Event not found' });
        }
        throw error;
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only organizers and admins can view event attendees' });
    }
    
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size) || 10));
    const sortBy = req.query.sort_by || 'id';
    const sortOrder = (req.query.sort_order || 'desc').toLowerCase();
    const fields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()).filter(f => f) : null;
    
    // Parse filters (for this endpoint, we also filter by eventId from params)
    const filters = {
      eventId: eventId,
      status: req.query.status,
      userId: req.query.userId
    };
    
    // Validate sort parameters
    const validSortFields = ['id', 'userId', 'status', 'rsvpAt', 'createdAt', 'updatedAt'];
    const fieldMapping = {
      'id': 'id',
      'userId': 'user_id',
      'status': 'status',
      'rsvpAt': 'rsvp_at',
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
    
    // Validate status filter
    if (filters.status && !['invited', 'going', 'interested', 'not_going'].includes(filters.status)) {
      return res.status(400).json({ 
        detail: 'Invalid status. Must be one of: invited, going, interested, not_going' 
      });
    }
    
    // Build WHERE conditions
    const conditions = [];
    const values = [];
    applyFilters(conditions, values, filters);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM attendees ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Build and execute main query
    const sortColumn = fieldMapping[sortBy];
    const offset = (page - 1) * pageSize;
    
    const dataQuery = `
      SELECT 
        id, 
        user_id as "userId", 
        event_id as "eventId", 
        status, 
        rsvp_at as "rsvpAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM attendees 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const dataResult = await pool.query(dataQuery, [...values, pageSize, offset]);
    
    // Apply field selection if specified
    let attendees = dataResult.rows;
    if (fields) {
      try {
        attendees = attendees.map(attendee => selectFields(attendee, fields));
      } catch (error) {
        return res.status(400).json({ detail: error.message });
      }
    }
    
    // Build pagination info
    const paginationInfo = buildPaginationInfo(page, pageSize, totalCount);
    
    // Build applied filters object (excluding eventId since it's in the URL)
    const appliedFilters = {};
    if (filters.status) appliedFilters.status = filters.status;
    if (filters.userId) appliedFilters.userId = filters.userId;
    
    const sortingInfo = {
      sort_by: sortBy,
      sort_order: sortOrder
    };
    
    // Build response
    const response = {
      event_id: eventId,
      attendees: attendees,
      pagination: paginationInfo,
      filters: Object.keys(appliedFilters).length > 0 ? appliedFilters : null,
      sorting: sortingInfo
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};

export const createRsvp = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;
    const userId = req.user.sub;
    
    // Only attendees can create RSVPs
    if (req.user.role !== 'attendee' && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only attendees can create RSVPs' });
    }
    
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
      'INSERT INTO attendees (user_id, event_id, status, rsvp_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt", created_at as "createdAt", updated_at as "updatedAt"',
      [userId, eventId, status]
    );
    
    const rsvp = result.rows[0];
    
    // Notify user about their RSVP
    const statusEmoji = status === 'going' ? '✅' : status === 'interested' ? '🤔' : '❌';
    const userEmail = await getUserEmail(userId);
    await publishNotification(
      userId,
      'rsvp_confirmed',
      `${statusEmoji} Your RSVP for event #${eventId} has been confirmed as "${status}".`,
      { eventId, status },
      userEmail
    );
    
    res.status(201).json(rsvp);
  } catch (error) {
    console.error('Error creating RSVP:', error);
    if (error.code === '23503') {
      return res.status(400).json({ detail: 'Invalid event ID or user ID' });
    }
    res.status(500).json({ detail: 'Internal server error' });
  }
};

// Add a new function to update RSVP status
export const updateRsvp = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;
    const userId = req.user.sub;
    
    // Only attendees can update their own RSVPs
    if (req.user.role !== 'attendee' && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only attendees can update their RSVPs' });
    }
    
    // Check if RSVP exists
    const existing = await pool.query(
      'SELECT id, status as current_status FROM attendees WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ detail: 'RSVP not found for this user and event' });
    }
    
    const currentStatus = existing.rows[0].current_status;
    
    // If status is the same, return the current RSVP
    if (currentStatus === status) {
      const result = await pool.query(
        'SELECT id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt", created_at as "createdAt", updated_at as "updatedAt" FROM attendees WHERE user_id = $1 AND event_id = $2',
        [userId, eventId]
      );
      return res.json(result.rows[0]);
    }
    
    // Update RSVP status
    const result = await pool.query(
      'UPDATE attendees SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND event_id = $3 RETURNING id, user_id as "userId", event_id as "eventId", status, rsvp_at as "rsvpAt", created_at as "createdAt", updated_at as "updatedAt"',
      [status, userId, eventId]
    );
    
    const updatedRsvp = result.rows[0];
    
    // Notify user about their RSVP update
    const statusEmoji = status === 'going' ? '✅' : status === 'interested' ? '🤔' : '❌';
    const userEmail = await getUserEmail(userId);
    await publishNotification(
      userId,
      'rsvp_updated',
      `${statusEmoji} Your RSVP for event #${eventId} has been updated to "${status}".`,
      { eventId, status, previousStatus: currentStatus },
      userEmail
    );
    
    res.json(updatedRsvp);
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
};