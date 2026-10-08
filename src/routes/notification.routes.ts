import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', notificationController.listMyNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);

export default router;
