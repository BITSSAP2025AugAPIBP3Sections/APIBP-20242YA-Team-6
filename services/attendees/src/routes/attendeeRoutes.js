import express from 'express';
import { validationResult } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import {
  getUserAttendees,
  getAttendeeById,
  getEventAttendees,
  createRsvp
} from '../controllers/attendeeController.js';
import {
  createRsvpValidation,
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

// Routes
router.get('/attendees', verifyToken, getUserAttendees);
router.get('/attendees/:id', verifyToken, attendeeIdValidation, validate, getAttendeeById);
router.get('/events/:eventId/attendees', verifyToken, eventIdValidation, validate, getEventAttendees);
router.post('/events/:eventId/attendees', verifyToken, createRsvpValidation, validate, createRsvp);

export default router;