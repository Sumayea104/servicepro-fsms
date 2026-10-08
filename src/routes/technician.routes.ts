import { Router } from 'express';
import * as technicianController from '../controllers/technician.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { updateAvailabilitySchema, updateSkillsSchema, updateLocationSchema, setWeeklyAvailabilitySchema } from '../validators/technician.validator.js';

const router = Router();

router.get('/', technicianController.listTechnicians);
router.get('/suggest', authenticate, requireRole('ADMIN'), technicianController.suggestTechnicians);
router.get('/:id', technicianController.getTechnician);

router.use(authenticate, requireRole('TECHNICIAN'));
router.patch('/me/availability', validate(updateAvailabilitySchema), technicianController.updateAvailability);
router.patch('/me/location', validate(updateLocationSchema), technicianController.updateLocation);
router.patch('/me/skills', validate(updateSkillsSchema), technicianController.updateSkills);
router.put('/me/weekly-availability', validate(setWeeklyAvailabilitySchema), technicianController.setWeeklyAvailability);

export default router;
