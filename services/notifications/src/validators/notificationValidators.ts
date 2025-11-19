import { body } from 'express-validator';

export const createNotificationValidation = [
  body('recipientId').notEmpty(),
  body('type').notEmpty().trim(),
  body('message').notEmpty().trim()
];
