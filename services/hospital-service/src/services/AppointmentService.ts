import { eq, and, desc, asc, ilike, count, or, gte, lte, lt, gt } from 'drizzle-orm';
import { db } from '../config/database';
import {
  appointments,
  patients,
  medicalPersonnel,
  medicalInstitutions,
  appointmentStatusEnum
} from '../models/schema';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse,
  createBusinessRuleErrorResponse
} from '../utils/api-standardization';
import moment from 'moment';

const logger = createLogger();

export interface AppointmentData {
  patientId: number;
  personnelId: number;
  institutionId?: number;
  appointmentType: string;
  appointmentDateTime: Date;
  duration: number; // in minutes
  reason?: string;
  isEmergency?: boolean;
  notes?: string;
  referredBy?: number;
 预约方式?: string;
  department?: string;
}

export interface AppointmentSlot {
  id: number;
  startDateTime: Date;
  endDateTime: Date;
  personnelId: number;
  personnel: any;
  isAvailable: boolean;
  appointmentId?: number;
}

export class AppointmentService {
  private static instance: AppointmentService;

  public static getInstance(): AppointmentService {
    if (!AppointmentService.instance) {
      AppointmentService.instance = new AppointmentService();
    }
    return AppointmentService.instance;
  }

  private validateAppointmentData(data: AppointmentData): string[] {
    const errors: string[] = [];

    if (!data.patientId || data.patientId <= 0) {
      errors.push('Valid patient ID is required');
    }

    if (!data.personnelId || data.personnelId <= 0) {
      errors.push('Valid personnel ID is required');
    }

    if (!data.appointmentType || data.appointmentType.trim().length === 0) {
      errors.push('Appointment type is required');
    }

    if (!data.appointmentDateTime) {
      errors.push('Appointment date and time is required');
    }

    if (new Date(data.appointmentDateTime) <= new Date()) {
      errors.push('Appointment date and time must be in the future');
    }

    if (!data.duration || data.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (data.duration < config.business.minAppointmentDuration) {
      errors.push(`Duration cannot be less than ${config.business.minAppointmentDuration} minutes`);
    }

    if (data.duration > config.business.maxAppointmentDuration) {
      errors.push(`Duration cannot exceed ${config.business.maxAppointmentDuration} minutes`);
    }

    if (data.reason && data.reason.length > 500) {
      errors.push('Reason cannot exceed 500 characters');
    }

    // Check if appointment is too far in advance
    const maxAdvanceDays = config.business.maxAppointmentAdvance;
    const appointmentDate = moment(data.appointmentDateTime);
    const today = moment();
    const daysDiff = appointmentDate.diff(today, 'days');

    if (daysDiff > maxAdvanceDays && !data.isEmergency) {
      errors.push(`Regular appointments cannot be scheduled more than ${maxAdvanceDays} days in advance`);
    }

    return errors;
  }

  private async checkPatientExists(patientId: number): Promise<boolean> {
    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
      .limit(1);

    return patient.length > 0;
  }

  private async checkPersonnelExists(personnelId: number): Promise<boolean> {
    const personnel = await db
      .select()
      .from(medicalPersonnel)
      .where(and(eq(medicalPersonnel.id, personnelId), eq(medicalPersonnel.isActive, true)))
      .limit(1);

    return personnel.length > 0;
  }

  private async checkConflictingAppointment(
    personnelId: number,
    startDateTime: Date,
    duration: number,
    excludeAppointmentId?: number
  ): Promise<boolean> {
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const conflicting = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.personnelId, personnelId),
        eq(appointments.status, 'scheduled'),
        // Check for time overlap
        // This would need proper SQL time range comparison
      ))
      .limit(1);

    return conflicting.length > 0;
  }

  private async checkPersonnelAvailability(
    personnelId: number,
    startDateTime: Date,
    duration: number,
    excludeAppointmentId?: number
  ): Promise<boolean> {
    // Check working hours (assuming 8 AM - 6 PM, Monday to Friday)
    const appointmentTime = moment(startDateTime);
    const dayOfWeek = appointmentTime.day();
    const hour = appointmentTime.hour();

    // Check if it's a weekday (1-5 for Monday-Friday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return !!(dayOfWeek === 0 && (hour >= 9 && hour <= 17)); // Sunday 9-5
    }

    // Check if within working hours for weekdays
    if (hour < 8 || hour >= 18) {
      return false;
    }

    // Check for conflicting appointments
    return !(await this.checkConflictingAppointment(personnelId, startDateTime, duration, excludeAppointmentId));
  }

  async createAppointment(data: AppointmentData, correlationId?: string): Promise<any> {
    try {
      logger.info('Creating new appointment', {
        patientId: data.patientId,
        personnelId: data.personnelId,
        appointmentType: data.appointmentType,
        appointmentDateTime: data.appointmentDateTime,
        correlationId
      });

      // Validate appointment data
      const validationErrors = this.validateAppointmentData(data);
      if (validationErrors.length > 0) {
        return createValidationErrorResponse(
          validationErrors.map(error => ({ field: 'general', message: error })),
          correlationId
        );
      }

      // Check if patient exists and is active
      const patientExists = await this.checkPatientExists(data.patientId);
      if (!patientExists) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Patient not found or inactive',
          { patientId: data.patientId },
          correlationId
        );
      }

      // Check if personnel exists and is active
      const personnelExists = await this.checkPersonnelExists(data.personnelId);
      if (!personnelExists) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Medical personnel not found or inactive',
          { personnelId: data.personnelId },
          correlationId
        );
      }

      // Check personnel availability
      const isAvailable = await this.checkPersonnelAvailability(
        data.personnelId,
        data.appointmentDateTime,
        data.duration
      );

      if (!isAvailable) {
        return createBusinessRuleErrorResponse(
          'PERSONNEL_UNAVAILABLE',
          'Selected medical personnel is not available at the requested time',
          {
            personnelId: data.personnelId,
            appointmentDateTime: data.appointmentDateTime,
            duration: data.duration
          },
          correlationId
        );
      }

      // Create appointment
      const [newAppointment] = await db
        .insert(appointments)
        .values({
          patientId: data.patientId,
          personnelId: data.personnelId,
          institutionId: data.institutionId,
          appointmentType: data.appointmentType,
          appointmentDateTime: data.appointmentDateTime,
          duration: data.duration,
          endDateTime: new Date(data.appointmentDateTime.getTime() + data.duration * 60000),
          reason: data.reason,
          isEmergency: data.isEmergency || false,
          notes: data.notes,
          referredBy: data.referredBy,
          预约方式: data.预约方式,
          department: data.department,
          status: 'scheduled' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('Appointment created successfully', {
        appointmentId: newAppointment.id,
        patientId: data.patientId,
        personnelId: data.personnelId,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(newAppointment, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to create appointment', error as Error, {
        appointmentData: {
          patientId: data.patientId,
          personnelId: data.personnelId,
          appointmentDateTime: data.appointmentDateTime
        },
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to create appointment',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getAppointment(id: number, correlationId?: string): Promise<any> {
    try {
      const appointment = await db
        .select({
          appointment: appointments,
          patient: {
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
            medicalRecordNumber: patients.medicalRecordNumber,
            phone: patients.phone,
            email: patients.email
          },
          personnel: {
            id: medicalPersonnel.id,
            firstName: medicalPersonnel.firstName,
            lastName: medicalPersonnel.lastName,
            title: medicalPersonnel.title,
            specialty: medicalPersonnel.specialty,
            licenseNumber: medicalPersonnel.licenseNumber
          }
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(medicalPersonnel, eq(appointments.personnelId, medicalPersonnel.id))
        .where(eq(appointments.id, id))
        .limit(1);

      if (appointment.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Appointment not found',
          { id },
          correlationId
        );
      }

      logger.debug('Appointment retrieved', {
        appointmentId: id,
        status: appointment[0].appointment.status,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(appointment[0], undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get appointment', error as Error, {
        appointmentId: id,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve appointment',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getAppointments(
    filters: {
      patientId?: number;
      personnelId?: number;
      status?: string;
      appointmentType?: string;
      dateRange?: { start?: Date; end?: Date };
      isEmergency?: boolean;
      department?: string;
    },
    pagination: {
      page: number;
      limit: number;
    },
    correlationId?: string
  ): Promise<any> {
    try {
      let query = db
        .select({
          appointment: appointments,
          patient: {
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
            medicalRecordNumber: patients.medicalRecordNumber
          },
          personnel: {
            id: medicalPersonnel.id,
            firstName: medicalPersonnel.firstName,
            lastName: medicalPersonnel.lastName,
            title: medicalPersonnel.title,
            specialty: medicalPersonnel.specialty
          }
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(medicalPersonnel, eq(appointments.personnelId, medicalPersonnel.id));

      // Apply filters
      if (filters.patientId) {
        query = query.where(eq(appointments.patientId, filters.patientId));
      }

      if (filters.personnelId) {
        query = query.where(eq(appointments.personnelId, filters.personnelId));
      }

      if (filters.status) {
        query = query.where(eq(appointments.status, filters.status as any));
      }

      if (filters.appointmentType) {
        query = query.where(eq(appointments.appointmentType, filters.appointmentType));
      }

      if (filters.isEmergency !== undefined) {
        query = query.where(eq(appointments.isEmergency, filters.isEmergency));
      }

      if (filters.department) {
        query = query.where(eq(appointments.department, filters.department));
      }

      // Get total count for pagination
      const totalCountQuery = query;
      const [totalResult] = await totalCountQuery.select({ count: count() });
      const total = totalResult.count;

      // Apply pagination and ordering
      const results = await query
        .orderBy(desc(appointments.appointmentDateTime))
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);

      logger.debug('Appointments retrieved', {
        filters,
        pagination,
        total,
        correlationId
      });

      return ResponseFactory.createPaginatedResponse(
        results,
        pagination.page,
        pagination.limit,
        total,
        correlationId
      );

    } catch (error) {
      logger.error('Failed to get appointments', error as Error, {
        filters,
        pagination,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve appointments',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async updateAppointment(id: number, data: Partial<AppointmentData>, correlationId?: string): Promise<any> {
    try {
      logger.info('Updating appointment', {
        appointmentId: id,
        updates: Object.keys(data),
        correlationId
      });

      // Check if appointment exists
      const existingAppointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (existingAppointment.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Appointment not found',
          { id },
          correlationId
        );
      }

      // Don't allow updates for completed appointments
      if (['completed', 'cancelled', 'no_show'].includes(existingAppointment[0].status)) {
        return createBusinessRuleErrorResponse(
          'APPOINTMENT_FINALIZED',
          'Cannot update appointment that is already finalized',
          {
            currentStatus: existingAppointment[0].status,
            id
          },
          correlationId
        );
      }

      // Validate update data if changing date/time or duration
      if (data.appointmentDateTime || data.duration) {
        const updates = {
          appointmentDateTime: data.appointmentDateTime || existingAppointment[0].appointmentDateTime,
          duration: data.duration || existingAppointment[0].duration
        };

        const tempValidationErrors = this.validateAppointmentData({
          ...existingAppointment[0],
          ...updates
        });

        if (tempValidationErrors.length > 0) {
          return createValidationErrorResponse(
            tempValidationErrors.map(error => ({ field: 'general', message: error })),
            correlationId
          );
        }

        // Check personnel availability if date/time changed
        if (data.appointmentDateTime || data.duration) {
          const finalDateTime = data.appointmentDateTime || existingAppointment[0].appointmentDateTime;
          const finalDuration = data.duration || existingAppointment[0].duration;

          const isAvailable = await this.checkPersonnelAvailability(
            existingAppointment[0].personnelId,
            new Date(finalDateTime),
            finalDuration,
            id // Exclude current appointment from conflict check
          );

          if (!isAvailable) {
            return createBusinessRuleErrorResponse(
              'PERSONNEL_UNAVAILABLE',
              'Selected time slot is not available',
              {
                personnelId: existingAppointment[0].personnelId,
                appointmentDateTime: finalDateTime,
                duration: finalDuration
              },
              correlationId
            );
          }
        }
      }

      // Update appointment
      const updateData: any = { ...data, updatedAt: new Date() };
      if (data.appointmentDateTime) {
        updateData.endDateTime = new Date(data.appointmentDateTime.getTime() + (data.duration || existingAppointment[0].duration) * 60000);
      }

      const [updatedAppointment] = await db
        .update(appointments)
        .set(updateData)
        .where(eq(appointments.id, id))
        .returning();

      logger.info('Appointment updated successfully', {
        appointmentId: id,
        updates: Object.keys(updateData),
        correlationId
      });

      return ResponseFactory.createSuccessResponse(updatedAppointment, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to update appointment', error as Error, {
        appointmentId: id,
        updates: data,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to update appointment',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async cancelAppointment(id: number, reason?: string, correlationId?: string): Promise<any> {
    try {
      logger.info('Cancelling appointment', {
        appointmentId: id,
        reason,
        correlationId
      });

      // Check if appointment exists
      const existingAppointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (existingAppointment.length === 0) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Appointment not found',
          { id },
          correlationId
        );
      }

      // Don't allow cancellation of already completed appointments
      if (existingAppointment[0].status === 'completed') {
        return createBusinessRuleErrorResponse(
          'APPOINTMENT_COMPLETED',
          'Cannot cancel appointment that is already completed',
          { currentStatus: existingAppointment[0].status },
          correlationId
        );
      }

      // Cancel appointment
      const [cancelledAppointment] = await db
        .update(appointments)
        .set({
          status: 'cancelled' as any,
          cancellationReason: reason,
          cancelledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(appointments.id, id))
        .returning();

      logger.info('Appointment cancelled successfully', {
        appointmentId: id,
        reason,
        correlationId
      });

      return ResponseFactory.createSuccessResponse(cancelledAppointment, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to cancel appointment', error as Error, {
        appointmentId: id,
        reason,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to cancel appointment',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }

  async getAvailableTimeSlots(
    personnelId: number,
    startDate: Date,
    endDate: Date,
    duration: number,
    correlationId?: string
  ): Promise<any> {
    try {
      logger.info('Getting available time slots', {
        personnelId,
        startDate,
        endDate,
        duration,
        correlationId
      });

      // Check if personnel exists and is active
      const personnelExists = await this.checkPersonnelExists(personnelId);
      if (!personnelExists) {
        return ResponseFactory.createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Medical personnel not found or inactive',
          { personnelId },
          correlationId
        );
      }

      // Get existing appointments for the personnel in the date range
      const existingAppointments = await db
        .select({
          appointmentDateTime: appointments.appointmentDateTime,
          endDateTime: appointments.endDateTime
        })
        .from(appointments)
        .where(and(
          eq(appointments.personnelId, personnelId),
          eq(appointments.status, 'scheduled'),
          // Date range comparison
        ));

      // Generate time slots (30-minute intervals)
      const timeSlots: any[] = [];
      const start = moment(startDate);
      const end = moment(endDate);

      let currentTime = start;
      while (currentTime.isSameOrBefore(end, 'day')) {
        // Skip weekends
        if (currentTime.day() === 0 || currentTime.day() === 6) {
          currentTime.add(1, 'day').hour(8).minute(0).second(0);
          continue;
        }

        // Skip non-working hours
        if (currentTime.hour() < 8 || currentTime.hour() >= 18) {
          if (currentTime.hour() < 8) {
            currentTime.hour(8).minute(0).second(0);
          } else {
            currentTime.add(1, 'day').hour(8).minute(0).second(0);
          }
          continue;
        }

        const slotEndTime = currentTime.clone().add(duration, 'minutes');

        // Check if slot conflicts with existing appointments
        const isConflicting = existingAppointments.some(appointment => {
          const appointmentStart = moment(appointment.appointmentDateTime);
          const appointmentEnd = moment(appointment.endDateTime);

          return (
            (currentTime.isSameOrBefore(appointmentStart, 'minute') && slotEndTime.isAfter(appointmentStart, 'minute')) ||
            (currentTime.isBefore(appointmentEnd, 'minute') && slotEndTime.isSameOrAfter(appointmentEnd, 'minute')) ||
            (currentTime.isSameOrAfter(appointmentStart, 'minute') && currentTime.isBefore(appointmentEnd, 'minute'))
          );
        });

        if (!isConflicting && currentTime.hour() < 17 || (currentTime.hour() === 17 && currentTime.minute() <= 30)) {
          timeSlots.push({
            startDateTime: currentTime.toDate(),
            endDateTime: slotEndTime.toDate(),
            available: true
          });
        }

        // Move to next 30-minute slot
        currentTime.add(30, 'minutes');

        // If we've passed 6 PM, move to next day
        if (currentTime.hour() >= 18 || currentTime.hour() === 17 && currentTime.minute() > 30) {
          if (currentTime.day() === 5) {
            currentTime.add(2, 'days').hour(8).minute(0).second(0); // Skip weekend
          } else {
            currentTime.add(1, 'day').hour(8).minute(0).second(0);
          }
        }
      }

      logger.debug('Available time slots retrieved', {
        personnelId,
        totalSlots: timeSlots.length,
        dateRange: { startDate, endDate },
        duration,
        correlationId
      });

      return ResponseFactory.createSuccessResponse({
        personnelId,
        dateRange: { startDate, endDate },
        duration,
        timeSlots,
        totalSlots: timeSlots.length,
        generatedAt: new Date().toISOString()
      }, undefined, correlationId);

    } catch (error) {
      logger.error('Failed to get available time slots', error as Error, {
        personnelId,
        startDate,
        endDate,
        duration,
        correlationId
      });

      return ResponseFactory.createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to retrieve available time slots',
        { originalError: (error as Error).message },
        correlationId
      );
    }
  }
}

export const appointmentService = AppointmentService.getInstance();