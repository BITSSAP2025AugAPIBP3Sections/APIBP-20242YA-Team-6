import { body, param, query } from 'express-validator';

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

export const getAllTasksValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('page_size').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
    query('sort_by').optional().isIn(['id', 'title', 'status', 'eventId', 'vendorId', 'organizerId', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
    query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be "asc" or "desc"'),
    query('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Invalid status filter'),
    query('event_id').optional().isInt().withMessage('Event ID must be an integer'),
    query('vendor_id').optional().isInt().withMessage('Vendor ID must be an integer'),
    query('organizer_id').optional().isInt().withMessage('Organizer ID must be an integer'),
    query('title').optional().trim(),
    query('search').optional().trim(),
    query('fields').optional().trim()
];
