import { Router } from 'express';
import { AppointmentsController, appointmentsValidationMiddleware } from '../api/appointmentsController';
import { PatientsController, patientsValidationMiddleware } from '../api/patientsController';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { responseStandardizationMiddleware } from '../middleware/responseStandardizationMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// Apply response standardization and audit middleware to all routes
router.use(responseStandardizationMiddleware);
router.use(auditMiddleware);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hospital-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Authentication middleware for protected routes
router.use(authMiddleware);

// Rate limiting for write operations
const writeRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Patient routes
router.get('/patients', patientsValidationMiddleware.validateQuery, PatientsController.getPatients);
router.get('/patients/search', patientsValidationMiddleware.validateSearchQuery, PatientsController.searchPatients);
router.get('/patients/stats', PatientsController.getPatientStats);
router.get('/patients/:id', PatientsController.getPatient);
router.post('/patients', writeRateLimit, patientsValidationMiddleware.validateCreatePatient, PatientsController.createPatient);
router.put('/patients/:id', writeRateLimit, patientsValidationMiddleware.validateUpdatePatient, PatientsController.updatePatient);
router.post('/patients/:id/deactivate', writeRateLimit, patientsValidationMiddleware.validateCancelAppointment, PatientsController.deactivatePatient);

// Appointment routes
router.get('/appointments', appointmentsValidationMiddleware.validateQuery, AppointmentsController.getAppointments);
router.get('/appointments/available-slots', appointmentsValidationMiddleware.validateTimeSlotsQuery, AppointmentsController.getAvailableTimeSlots);
router.get('/appointments/:id', AppointmentsController.getAppointment);
router.post('/appointments', writeRateLimit, appointmentsValidationMiddleware.validateCreateAppointment, AppointmentsController.createAppointment);
router.put('/appointments/:id', writeRateLimit, appointmentsValidationMiddleware.validateUpdateAppointment, AppointmentsController.updateAppointment);
router.post('/appointments/:id/cancel', writeRateLimit, appointmentsValidationMiddleware.validateCancelAppointment, AppointmentsController.cancelAppointment);

export default router;