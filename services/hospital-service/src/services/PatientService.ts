import { eq, and, desc, asc, ilike, count, or } from 'drizzle-orm';
import { db } from '../config/database';
import {
  patients,
  medicalRecords,
  appointments,
  medicalInstitutions,
  medicalPersonnel,
  genderEnum,
  membershipStatusEnum
} from '../models/schema';
import { config } from '../config';
import { createLogger, generateCorrelationId } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger();

export interface PatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  nationalId?: string;
  passportNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  preferredLanguage?: string;
  medicalRecordNumber?: string;
}

export interface MedicalRecordData {
  patientId: number;
  recordDate: Date;
  chiefComplaint?: string;
  diagnosis?: string[];
  treatment?: string[];
  medications?: string[];
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    spo2?: number;
  };
  notes?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  referredTo?: number; // personnel ID
  referredFrom?: number; // personnel ID
  attachmentPaths?: string[];
}

export class PatientService {
  private static instance: PatientService;

  public static getInstance(): PatientService {
    if (!PatientService.instance) {
      PatientService.instance = new PatientService();
    }
    return PatientService.instance;
  }

  private generateMedicalRecordNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `MR-${year}-${random}`;
  }

  private validatePatientData(data: PatientData): string[] {
    const errors: string[] = [];

    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (data.firstName.length > config.validation.patientNameMaxLength) {
      errors.push(`First name cannot exceed ${config.validation.patientNameMaxLength} characters`);
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (data.lastName.length > config.validation.patientNameMaxLength) {
      errors.push(`Last name cannot exceed ${config.validation.patientNameMaxLength} characters`);
    }

    if (!data.dateOfBirth) {
      errors.push('Date of birth is required');
    }

    if (new Date(data.dateOfBirth) > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }

    if (!data.gender) {
      errors.push('Gender is required');
    }

    const validGenders = ['male', 'female', 'other'];
    if (!validGenders.includes(data.gender)) {
      errors.push(`Gender must be one of: ${validGenders.join(', ')}`);
    }

    if (!data.phone || data.phone.trim().length === 0) {
      errors.push('Phone number is required');
    }

    if (data.phone.length > config.validation.patientPhoneMaxLength) {
      errors.push(`Phone number cannot exceed ${config.validation.patientPhoneMaxLength} characters`);
    }

    // Basic phone format validation
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (data.phone && !phoneRegex.test(data.phone)) {
      errors.push('Invalid phone number format');
    }

    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.dateOfBirth) {
      const age = this.calculateAge(new Date(data.dateOfBirth));
      if (age > 120) {
        errors.push('Date of birth suggests invalid age');
      }
    }

    return errors;
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  private async checkForDuplicatePatient(data: PatientData): Promise<boolean> {
    // Check for duplicate based on name, date of birth, and phone
    const duplicate = await db
      .select()
      .from(patients)
      .where(and(
        ilike(patients.firstName, data.firstName),
        ilike(patients.lastName, data.lastName),
        eq(patients.dateOfBirth, data.dateOfBirth),
        eq(patients.phone, data.phone)
      ))
      .limit(1);

    return duplicate.length > 0;
  }

  async createPatient(data: PatientData, correlationId?: string): Promise<any> {
    try {
      logger.info('Creating new patient', {
        name: `${data.firstName} ${data.lastName}`,
        dateOfBirth: data.dateOfBirth,
        correlationId
      });

      // Validate patient data
      const validationErrors = this.validatePatientData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Check for duplicate patient
      const isDuplicate = await this.checkForDuplicatePatient(data);
      if (isDuplicate) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.CONFLICT,
          'A patient with these details already exists',
          {
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            phone: data.phone
          },
          correlationId
        );
      }

      // Generate medical record number if not provided
      const medicalRecordNumber = data.medicalRecordNumber || this.generateMedicalRecordNumber();

      // Ensure medical record number is unique
      const existingMRN = await db
        .select()
        .from(patients)
        .where(eq(patients.medicalRecordNumber, medicalRecordNumber))
        .limit(1);

      const finalMRN = existingMRN.length > 0 ? this.generateMedicalRecordNumber() : medicalRecordNumber;

      // Create patient
      const [newPatient] = await db
        .insert(patients)
        .values({
          medicalRecordNumber: finalMRN,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender as any,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country || 'Kenya',
          nationalId: data.nationalId,
          passportNumber: data.passportNumber,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelationship: data.emergencyContactRelationship,
          bloodType: data.bloodType,
          allergies: data.allergies || [],
          chronicConditions: data.chronicConditions || [],
          medications: data.medications || [],
          insuranceProvider: data.insuranceProvider,
          insurancePolicyNumber: data.insurancePolicyNumber,
          preferredLanguage: data.preferredLanguage || 'English',
          registrationDate: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('Patient created successfully', {
        patientId: newPatient.id,
        medicalRecordNumber: finalMRN,
        name: `${newPatient.firstName} ${newPatient.lastName}`,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(newPatient, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to create patient', error as Error, {
        patientData: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email
        },
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create patient',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getPatient(id: number, correlationId?: string): Promise<any> {
    try {
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id))
        .limit(1);

      if (patient.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Patient not found',
          { id },
          correlationId
        );
      }

      // Get patient's medical records count
      const [recordsCount] = await db
        .select({ count: count() })
        .from(medicalRecords)
        .where(eq(medicalRecords.patientId, id));

      // Get patient's upcoming appointments count
      const [appointmentsCount] = await db
        .select({ count: count() })
        .from(appointments)
        .where(and(
          eq(appointments.patientId, id),
          eq(appointments.status, 'scheduled'),
          // Date is in the future
          // Note: This would need proper date comparison based on your database
        ));

      const patientWithStats = {
        ...patient[0],
        age: this.calculateAge(patient[0].dateOfBirth),
        medicalRecordsCount: recordsCount.count,
        upcomingAppointmentsCount: appointmentsCount.count
      };

      logger.debug('Patient retrieved', {
        patientId: id,
        medicalRecordNumber: patientWithStats.medicalRecordNumber,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(patientWithStats, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get patient', error as Error, {
        patientId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve patient',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getPatients(
    filters: {
      search?: string;
      gender?: string;
      ageRange?: { min?: number; max?: number };
      isActive?: boolean;
      registrationDateRange?: { start?: Date; end?: Date };
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ): Promise<any> {
    try {
      let query = db.select().from(patients);

      // Apply filters
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(
          or(
            ilike(patients.firstName, searchTerm),
            ilike(patients.lastName, searchTerm),
            ilike(patients.medicalRecordNumber, searchTerm),
            ilike(patients.phone, searchTerm),
            ilike(patients.email, searchTerm)
          )
        );
      }

      if (filters.gender) {
        query = query.where(eq(patients.gender, filters.gender as any));
      }

      if (filters.isActive !== undefined) {
        query = query.where(eq(patients.isActive, filters.isActive));
      }

      if (filters.ageRange) {
        const today = new Date();
        let minDate: Date | undefined;
        let maxDate: Date | undefined;

        if (filters.ageRange.max !== undefined) {
          maxDate = new Date(today.getFullYear() - filters.ageRange.max, today.getMonth(), today.getDate());
        }

        if (filters.ageRange.min !== undefined) {
          minDate = new Date(today.getFullYear() - filters.ageRange.min, today.getMonth(), today.getDate());
        }

        if (minDate) {
          query = query.where(patients.dateOfBirth <= minDate);
        }

        if (maxDate) {
          query = query.where(patients.dateOfBirth >= maxDate);
        }
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(patients.registrationDate))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      // Add calculated age to each patient
      const patientsWithAge = results.map(patient => ({
        ...patient,
        age: this.calculateAge(patient.dateOfBirth)
      }));

      logger.debug('Patients retrieved', {
        filters,
        pagination,
        total,
        correlationId
      });

      return ResponseFactory.createPaginatedResponse(
        patientsWithAge,
        pagination.page,
        pagination.limit,
        total,
        correlationId
      );

    } catch (error) {
      logger.error('Failed to get patients', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve patients',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async updatePatient(id: number, data: Partial<PatientData>, correlationId?: string): Promise<any> {
    try {
      logger.info('Updating patient', {
        patientId: id,
        updates: Object.keys(data),
        correlationId
      });

      // Check if patient exists
      const existingPatient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id))
        .limit(1);

      if (existingPatient.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Patient not found',
          { id },
          correlationId
        );
      }

      // Validate update data
      const validationErrors = this.validatePatientData({ ...existingPatient[0], ...data });
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Update patient
      const updateData: any = { ...data, updatedAt: new Date() };
      if (data.gender) {
        updateData.gender = data.gender as any;
      }

      const [updatedPatient] = await db
        .update(patients)
        .set(updateData)
        .where(eq(patients.id, id))
        .returning();

      logger.info('Patient updated successfully', {
        patientId: id,
        name: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(updatedPatient, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to update patient', error as Error, {
        patientId: id,
        updates: data,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update patient',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async searchPatients(query: string, limit: number = 10, correlationId?: string): Promise<any> {
    try {
      if (!query || query.trim().length < 2) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Search query must be at least 2 characters long',
          undefined,
          correlationId
        );
      }

      const searchTerm = `%${query.trim()}%`;

      const patients = await db
        .select()
        .from(patients)
        .where(and(
          eq(patients.isActive, true),
          or(
            ilike(patients.firstName, searchTerm),
            ilike(patients.lastName, searchTerm),
            ilike(patients.medicalRecordNumber, searchTerm),
            ilike(patients.phone, searchTerm),
            ilike(patients.email, searchTerm)
          )
        ))
        .orderBy(desc(patients.registrationDate))
        .limit(limit);

      // Add calculated age to each patient
      const patientsWithAge = patients.map(patient => ({
        ...patient,
        age: this.calculateAge(patient.dateOfBirth)
      }));

      logger.debug('Patient search completed', {
        query,
        resultCount: patientsWithAge.length,
        limit,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(patientsWithAge, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to search patients', error as Error, {
        query,
        limit,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to search patients',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getPatientStats(correlationId?: string): Promise<any> {
    try {
      // Get total patients
      const [totalPatients] = await db
        .select({ count: count() })
        .from(patients)
        .where(eq(patients.isActive, true));

      // Get patients by gender
      const genderStats = await db
        .select({
          gender: patients.gender,
          count: count(patients.id)
        })
        .from(patients)
        .where(eq(patients.isActive, true))
        .groupBy(patients.gender);

      // Get age distribution
      const allPatients = await db
        .select({
          dateOfBirth: patients.dateOfBirth
        })
        .from(patients)
        .where(eq(patients.isActive, true));

      const ageGroups = {
        '0-18': 0,
        '19-35': 0,
        '36-50': 0,
        '51-65': 0,
        '65+': 0
      };

      allPatients.forEach(patient => {
        const age = this.calculateAge(patient.dateOfBirth);
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      });

      // Get registrations by month (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const registrationsByMonth = await db
        .select({
          month: patients.registrationDate,
          count: count(patients.id)
        })
        .from(patients)
        .where(and(
          eq(patients.isActive, true),
          // This would need proper date comparison
        ))
        .groupBy(patients.registrationDate);

      const stats = {
        totalPatients: totalPatients.count,
        genderDistribution: genderStats,
        ageDistribution: ageGroups,
        registrationsByMonth: registrationsByMonth,
        generatedAt: new Date().toISOString()
      };

      logger.info('Patient statistics retrieved', {
        totalPatients: stats.totalPatients,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(stats, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get patient statistics', error as Error, {
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve patient statistics',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async deactivatePatient(id: number, reason?: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Deactivating patient', {
        patientId: id,
        reason,
        correlationId
      });

      // Check if patient exists
      const existingPatient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id))
        .limit(1);

      if (existingPatient.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Patient not found',
          { id },
          correlationId
        );
      }

      // Deactivate patient
      const [deactivatedPatient] = await db
        .update(patients)
        .set({
          isActive: false,
          deactivationReason: reason,
          deactivationDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(patients.id, id))
        .returning();

      logger.info('Patient deactivated successfully', {
        patientId: id,
        name: `${deactivatedPatient.firstName} ${deactivatedPatient.lastName}`,
        reason,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(deactivatedPatient, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to deactivate patient', error as Error, {
        patientId: id,
        reason,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to deactivate patient',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const patientService = PatientService.getInstance();