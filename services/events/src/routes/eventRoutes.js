import express from 'express';
import { validationResult } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { 
  getAllEvents, 
  createEvent, 
  getEventById, 
  updateEvent, 
  deleteEvent,
  createEventTask,
  getEventTasks,
} from '../controllers/eventController.js';
import { 
  createEventValidation, 
  updateEventValidation, 
  eventIdValidation 
} from '../validators/eventValidators.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

router.get('/events', verifyToken, getAllEvents);
router.post('/events', verifyToken, requireRole('admin', 'organizer'), createEventValidation, validate, createEvent);
router.get('/events/:id', verifyToken, eventIdValidation, validate, getEventById);
router.patch('/events/:id', verifyToken, requireRole('admin', 'organizer'), updateEventValidation, validate, updateEvent);
router.delete('/events/:id', verifyToken, requireRole('admin', 'organizer'), eventIdValidation, validate, deleteEvent);

// New nested resource endpoints
router.post('/events/:eventId/tasks', verifyToken, requireRole('admin', 'organizer'), createEventTask);
router.get('/events/:eventId/tasks', verifyToken, getEventTasks);

export default router;
