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

// Routes for attendees with pagination, sorting, filtering, and field selection
router.get('/attendees', verifyToken, getUserAttendees);
router.get('/attendees/:id', verifyToken, attendeeIdValidation, validate, getAttendeeById);

// Routes for event attendees with pagination, sorting, filtering, and field selection
router.get('/events/:eventId/attendees', verifyToken, eventIdValidation, validate, getEventAttendees);

// RSVP management routes
router.post('/events/:eventId/attendees', verifyToken, createRsvpValidation, validate, createRsvp);
router.put('/events/:eventId/attendees', verifyToken, updateRsvpValidation, validate, updateRsvp);

export default router;