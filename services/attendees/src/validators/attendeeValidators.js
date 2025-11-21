import { body, param } from 'express-validator';

export const createRsvpValidation = [
  param('eventId').notEmpty().withMessage('Event ID is required'),
  body('status')
    .isIn(['going', 'interested', 'not_going'])
    .withMessage('Status must be one of: going, interested, not_going')
];

export const attendeeIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Attendee ID must be a positive integer')
];

export const eventIdValidation = [
  param('eventId').notEmpty().withMessage('Event ID is required')
];