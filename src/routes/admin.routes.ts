import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { updateUserRoleSchema, verifyTechnicianSchema, upsertSystemSettingSchema } from '../validators/admin.validator.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/users', adminController.listUsers);
router.patch('/users/:id/role', validate(updateUserRoleSchema), adminController.updateUserRole);
router.delete('/users/:id', adminController.deactivateUser);

router.get('/technicians/pending', adminController.listPendingTechnicians);
router.patch('/technicians/:id/verify', validate(verifyTechnicianSchema), adminController.verifyTechnician);

router.get('/dashboard-stats', adminController.dashboardStats);
router.get('/audit-logs', adminController.listAuditLogs);
router.put('/settings', validate(upsertSystemSettingSchema), adminController.upsertSystemSetting);

export default router;
