import express from 'express';
import { protect } from '../middleware/auth.js';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAsRead);
router.delete('/', notificationController.clearNotifications);

export default router;
