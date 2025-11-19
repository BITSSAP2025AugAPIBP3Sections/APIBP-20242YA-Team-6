import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { getNotifications, createNotification } from '../controllers/notificationController.js';
import { createNotificationValidation } from '../validators/notificationValidators.js';

const router = express.Router();

router.get('/notifications', verifyToken, getNotifications);
router.post('/notifications', verifyToken, requireRole('admin', 'organizer'), createNotificationValidation, validate, createNotification);

export default router;
