import express from 'express';
import { validationResult } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import {
  getUserAttendees,
  getAttendeeById,
  getEventAttendees,
  createRsvp,
  updateRsvp
} from '../controllers/attendeeController.js';
import {
  createRsvpValidation,
  updateRsvpValidation,
  attendeeIdValidation,
  eventIdValidation
} from '../validators/attendeeValidators.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// ============================================================================
// ORGANIZER ROUTES - View attendees/RSVPs for their events
// ============================================================================
// Get all attendees/RSVPs for a specific event (organizers, admins)
router.get('/events/:eventId/attendees', verifyToken, eventIdValidation, validate, getEventAttendees);

// ============================================================================
// ATTENDEE ROUTES - Manage their own RSVPs
// ============================================================================
// Get all my RSVPs across all events
router.get('/rsvps', verifyToken, getUserAttendees);

// Get details of a specific RSVP by ID
router.get('/rsvps/:id', verifyToken, attendeeIdValidation, validate, getAttendeeById);

// RSVP to an event (attendees only) - RESTful sub-resource pattern
// POST /events/123/rsvps?status=going
// PUT /events/123/rsvps?status=interested
router.post('/events/:eventId/rsvps', verifyToken, createRsvpValidation, validate, createRsvp);
router.put('/events/:eventId/rsvps', verifyToken, updateRsvpValidation, validate, updateRsvp);

export default router;