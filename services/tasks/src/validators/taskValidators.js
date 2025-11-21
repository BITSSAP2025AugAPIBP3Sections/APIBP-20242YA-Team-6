import { body, param } from 'express-validator';

export const createTaskValidation = [
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('description').optional().trim(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Invalid status'),
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('vendorId').optional()
];

export const updateTaskValidation = [
    param('id').isInt().withMessage('Task ID must be an integer'),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Invalid status'),
    body('vendorId').optional()
];

export const taskIdValidation = [
    param('id').isInt().withMessage('Task ID must be an integer')
];
