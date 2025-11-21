import { body, param } from 'express-validator';

export const createEventValidation = [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('location').notEmpty().trim(),
  body('startAt').isISO8601(),
  body('endAt').isISO8601()
  // organizerId is automatically set from authenticated user, not from request body
];

export const updateEventValidation = [
  param('id').isInt(),
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('startAt').optional().isISO8601(),
  body('endAt').optional().isISO8601()
];

export const eventIdValidation = [
  param('id').isInt()
];
