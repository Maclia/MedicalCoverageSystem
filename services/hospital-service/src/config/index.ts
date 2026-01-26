import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.HOSPITAL_DB_URL || process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  services: {
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3001',
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    insurance: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3002',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
    claims: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3005',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  },

  business: {
    maxAppointmentAdvance: parseInt(process.env.MAX_APPOINTMENT_ADVANCE || '90', 10), // days
    minAppointmentDuration: parseInt(process.env.MIN_APPOINTMENT_DURATION || '15', 10), // minutes
    maxAppointmentDuration: parseInt(process.env.MAX_APPOINTMENT_DURATION || '180', 10), // minutes
    appointmentCancellationWindow: parseInt(process.env.APPOINTMENT_CANCELLATION_WINDOW || '24', 10), // hours
    maxConcurrentAppointments: parseInt(process.env.MAX_CONCURRENT_APPOINTMENTS || '5', 10),
    emergencyAppointmentSlots: parseInt(process.env.EMERGENCY_APPOINTMENT_SLOTS || '2', 10),
  },

  validation: {
    patientNameMaxLength: parseInt(process.env.PATIENT_NAME_MAX_LENGTH || '100', 10),
    patientPhoneMaxLength: parseInt(process.env.PATIENT_PHONE_MAX_LENGTH || '20', 10),
    medicalRecordNumberMaxLength: parseInt(process.env.MR_NUMBER_MAX_LENGTH || '20', 10),
    appointmentReasonMaxLength: parseInt(process.env.APPOINTMENT_REASON_MAX_LENGTH || '500', 10),
    personnelLicenseMaxLength: parseInt(process.env.PERSONNEL_LICENSE_MAX_LENGTH || '50', 10),
    institutionNameMaxLength: parseInt(process.env.INSTITUTION_NAME_MAX_LENGTH || '200', 10),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10), // 1 hour
  },

  caching: {
    defaultTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '300', 10), // 5 minutes
    patientCacheTTL: parseInt(process.env.PATIENT_CACHE_TTL || '1800', 10), // 30 minutes
    appointmentCacheTTL: parseInt(process.env.APPOINTMENT_CACHE_TTL || '600', 10), // 10 minutes
    personnelCacheTTL: parseInt(process.env.PERSONNEL_CACHE_TTL || '3600', 10), // 1 hour
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enabled: process.env.LOGGING_ENABLED !== 'false',
  },

  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT || '100', 10),
  }
};