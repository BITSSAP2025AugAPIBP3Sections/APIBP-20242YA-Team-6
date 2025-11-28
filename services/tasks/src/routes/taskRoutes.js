import express from 'express';
import { validationResult } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
} from '../controllers/taskController.js';
import {
    createTaskValidation,
    updateTaskValidation,
    taskIdValidation,
    getAllTasksValidation
} from '../validators/taskValidators.js';

const router = express.Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    next();
};

router.get('/tasks', verifyToken,requireRole('admin', 'organizer', 'vendor'), getAllTasksValidation, validate, getAllTasks);
// Internal endpoint - called by events service (requires auth token for organizer validation)
router.post('/tasks', verifyToken, requireRole('admin', 'organizer'), createTaskValidation, validate, createTask);
router.get('/tasks/:id', verifyToken, requireRole('admin', 'organizer', 'vendor'),taskIdValidation, validate, getTaskById);
router.patch('/tasks/:id', verifyToken, requireRole('admin', 'organizer', 'vendor'), updateTaskValidation, validate, updateTask);
router.delete('/tasks/:id', verifyToken, requireRole('admin', 'organizer'), taskIdValidation, validate, deleteTask);

export default router;