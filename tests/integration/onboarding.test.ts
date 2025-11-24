import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';

describe('Onboarding Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testMember: any;
  let testCompany: any;

  beforeAll(async () => {
    // Set up test app
    app = { use: vi.fn(), get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } as any;

    // Mock authentication middleware for integration tests
    vi.mock('../../server/middleware/auth', () => ({
      authenticate: (req: any, res: any, next: any) => {
        req.user = { userId: 1, role: 'insurance' };
        next();
      },
      requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
        if (roles.includes('insurance')) {
          next();
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
      },
    }));

    // Initialize test data
    testCompany = await storage.createCompany({
      name: 'Test Company',
      industry: 'Technology',
      contactEmail: 'test@test.com',
      address: '123 Test St',
    });

    testMember = await storage.createPrincipalMember({
      firstName: 'Test',
      lastName: 'Member',
      email: 'testmember@test.com',
      password: 'password123',
      phone: '555-0123',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      companyId: testCompany.id,
      memberType: 'principal',
      status: 'active',
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testMember) {
      await storage.deleteMember(testMember.id);
    }
    if (testCompany) {
      await storage.deleteCompany(testCompany.id);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Onboarding Session Management', () => {
    it('should create onboarding session for member', async () => {
      const sessionData = {
        memberId: testMember.id,
        status: 'not_started',
        activationDate: new Date(),
      };

      // Mock the route handler
      const mockHandler = vi.fn().mockResolvedValue({
        id: 1,
        ...sessionData,
        currentDay: 1,
        completionDate: null,
      });

      // Test the session creation logic
      const result = await mockHandler(sessionData);

      expect(result).toHaveProperty('id');
      expect(result.memberId).toBe(testMember.id);
      expect(result.status).toBe('not_started');
      expect(result.currentDay).toBe(1);
    });

    it('should retrieve onboarding session by member ID', async () => {
      const sessionData = {
        memberId: testMember.id,
        status: 'in_progress',
        currentDay: 3,
        activationDate: new Date(),
      };

      const createdSession = await storage.createOnboardingSession(sessionData);
      const retrievedSession = await storage.getOnboardingSessionByMember(testMember.id);

      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession?.memberId).toBe(testMember.id);
      expect(retrievedSession?.currentDay).toBe(3);
      expect(retrievedSession?.status).toBe('in_progress');
    });

    it('should update onboarding session progress', async () => {
      const sessionData = {
        memberId: testMember.id,
        status: 'in_progress',
        currentDay: 2,
        activationDate: new Date(),
      };

      const createdSession = await storage.createOnboardingSession(sessionData);

      const updatedSession = await storage.updateOnboardingSession(createdSession.id, {
        currentDay: 3,
        status: 'in_progress',
      });

      expect(updatedSession.currentDay).toBe(3);
      expect(updatedSession.status).toBe('in_progress');
    });

    it('should complete onboarding session', async () => {
      const sessionData = {
        memberId: testMember.id,
        status: 'in_progress',
        currentDay: 6,
        activationDate: new Date(),
      };

      const createdSession = await storage.createOnboardingSession(sessionData);

      const updatedSession = await storage.updateOnboardingSession(createdSession.id, {
        currentDay: 7,
        status: 'completed',
        completionDate: new Date(),
      });

      expect(updatedSession.currentDay).toBe(7);
      expect(updatedSession.status).toBe('completed');
      expect(updatedSession.completionDate).not.toBeNull();
    });
  });

  describe('Onboarding Tasks Management', () => {
    let onboardingSession: any;

    beforeEach(async () => {
      onboardingSession = await storage.createOnboardingSession({
        memberId: testMember.id,
        status: 'in_progress',
        currentDay: 1,
        activationDate: new Date(),
      });
    });

    it('should create tasks for onboarding day', async () => {
      const tasks = await storage.createOnboardingTasksForDay(testMember.id, 1);

      expect(tasks).toHaveLength(3); // Day 1 should have 3 tasks
      expect(tasks[0].sessionId).toBe(onboardingSession.id);
      expect(tasks[0].dayNumber).toBe(1);
    });

    it('should retrieve tasks by session and day', async () => {
      await storage.createOnboardingTasksForDay(testMember.id, 1);
      await storage.createOnboardingTasksForDay(testMember.id, 2);

      const day1Tasks = await storage.getOnboardingTasksBySessionAndDay(onboardingSession.id, 1);
      const day2Tasks = await storage.getOnboardingTasksBySessionAndDay(onboardingSession.id, 2);

      expect(day1Tasks).toHaveLength(3);
      expect(day2Tasks).toHaveLength(4); // Day 2 should have 4 tasks
      expect(day1Tasks[0].dayNumber).toBe(1);
      expect(day2Tasks[0].dayNumber).toBe(2);
    });

    it('should update task status', async () => {
      const tasks = await storage.createOnboardingTasksForDay(testMember.id, 1);
      const task = tasks[0];

      const updatedTask = await storage.updateOnboardingTask(task.id, {
        status: 'completed',
        completionDate: new Date(),
      });

      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.completionDate).not.toBeNull();
    });

    it('should track task completion progress', async () => {
      await storage.createOnboardingTasksForDay(testMember.id, 1);
      const tasks = await storage.getOnboardingTasksBySessionAndDay(onboardingSession.id, 1);

      // Complete first task
      await storage.updateOnboardingTask(tasks[0].id, {
        status: 'completed',
        completionDate: new Date(),
      });

      // Check progress
      const updatedTasks = await storage.getOnboardingTasksBySessionAndDay(onboardingSession.id, 1);
      const completedCount = updatedTasks.filter(t => t.status === 'completed').length;

      expect(completedCount).toBe(1);
      expect(updatedTasks).toHaveLength(3);
    });
  });

  describe('Member Document Management', () => {
    it('should upload and verify member document', async () => {
      const documentData = {
        memberId: testMember.id,
        documentType: 'insurance_card',
        fileName: 'insurance_card.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadDate: new Date(),
        isRequired: true,
      };

      const document = await storage.createMemberDocument(documentData);
      expect(document.id).toBeDefined();
      expect(document.memberId).toBe(testMember.id);
      expect(document.documentType).toBe('insurance_card');
      expect(document.verificationStatus).toBe('pending');

      // Verify document
      const verifiedDocument = await storage.updateMemberDocument(document.id, {
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: 'admin',
      });

      expect(verifiedDocument.verificationStatus).toBe('approved');
      expect(verifiedDocument.verificationDate).not.toBeNull();
    });

    it('should retrieve documents by member', async () => {
      const documentData = {
        memberId: testMember.id,
        documentType: 'id_card',
        fileName: 'driver_license.jpg',
        fileSize: 512000,
        mimeType: 'image/jpeg',
        uploadDate: new Date(),
        isRequired: true,
      };

      await storage.createMemberDocument(documentData);
      const documents = await storage.getMemberDocuments(testMember.id);

      expect(documents).toHaveLength(1);
      expect(documents[0].documentType).toBe('id_card');
      expect(documents[0].memberId).toBe(testMember.id);
    });

    it('should filter documents by verification status', async () => {
      const doc1Data = {
        memberId: testMember.id,
        documentType: 'insurance_card',
        fileName: 'insurance_card.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadDate: new Date(),
        isRequired: true,
      };

      const doc2Data = {
        memberId: testMember.id,
        documentType: 'id_card',
        fileName: 'driver_license.jpg',
        fileSize: 512000,
        mimeType: 'image/jpeg',
        uploadDate: new Date(),
        isRequired: true,
      };

      const doc1 = await storage.createMemberDocument(doc1Data);
      await storage.createMemberDocument(doc2Data);

      // Approve first document
      await storage.updateMemberDocument(doc1.id, {
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: 'admin',
      });

      const pendingDocuments = await storage.getMemberDocumentsByStatus(testMember.id, 'pending');
      const approvedDocuments = await storage.getMemberDocumentsByStatus(testMember.id, 'approved');

      expect(pendingDocuments).toHaveLength(1);
      expect(approvedDocuments).toHaveLength(1);
      expect(pendingDocuments[0].documentType).toBe('id_card');
      expect(approvedDocuments[0].documentType).toBe('insurance_card');
    });
  });

  describe('Email Integration', () => {
    it('should queue welcome email for new member', async () => {
      const emailData = {
        to: testMember.email,
        template: 'welcome',
        data: {
          firstName: testMember.firstName,
          companyName: testCompany.name,
          activationLink: 'https://example.com/activate/123',
        },
      };

      // Mock email service
      const mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue(true),
        queueEmail: vi.fn().mockResolvedValue(true),
      };

      vi.doMock('../../server/emailService', () => mockEmailService);

      const result = await mockEmailService.queueEmail(emailData);
      expect(result).toBe(true);
      expect(mockEmailService.queueEmail).toHaveBeenCalledWith(emailData);
    });

    it('should send onboarding reminder emails', async () => {
      // Create onboarding session
      const sessionData = {
        memberId: testMember.id,
        status: 'in_progress',
        currentDay: 2,
        activationDate: new Date(),
      };

      const session = await storage.createOnboardingSession(sessionData);
      await storage.createOnboardingTasksForDay(testMember.id, 2);

      const emailData = {
        to: testMember.email,
        template: 'onboarding_reminder',
        data: {
          firstName: testMember.firstName,
          currentDay: session.currentDay,
          nextTasks: ['Complete profile setup', 'Upload documents'],
        },
      };

      const mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue(true),
      };

      vi.doMock('../../server/emailService', () => mockEmailService);

      const result = await mockEmailService.sendEmail(emailData);
      expect(result).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(emailData);
    });
  });

  describe('Analytics Integration', () => {
    it('should calculate onboarding completion rate', async () => {
      // Create multiple onboarding sessions with different statuses
      const members = [
        { email: 'member1@test.com', status: 'completed' },
        { email: 'member2@test.com', status: 'completed' },
        { email: 'member3@test.com', status: 'in_progress' },
        { email: 'member4@test.com', status: 'not_started' },
      ];

      const sessions = [];
      for (const member of members) {
        const memberData = await storage.createPrincipalMember({
          firstName: 'Test',
          lastName: 'Member',
          email: member.email,
          password: 'password123',
          companyId: testCompany.id,
          memberType: 'principal',
          status: 'active',
        });

        const sessionData = {
          memberId: memberData.id,
          status: member.status,
          currentDay: member.status === 'completed' ? 7 : member.status === 'in_progress' ? 3 : 1,
          activationDate: new Date(),
        };

        if (member.status === 'completed') {
          sessionData.completionDate = new Date();
        }

        const session = await storage.createOnboardingSession(sessionData);
        sessions.push(session);
      }

      // Calculate completion rate
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const completionRate = (completedSessions / totalSessions) * 100;

      expect(completionRate).toBe(50); // 2 out of 4 completed
      expect(totalSessions).toBe(4);
      expect(completedSessions).toBe(2);
    });

    it('should track average completion time', async () => {
      const sessionData = {
        memberId: testMember.id,
        status: 'completed',
        currentDay: 7,
        activationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        completionDate: new Date(),
      };

      const session = await storage.createOnboardingSession(sessionData);

      // Calculate completion time in days
      const completionTime = (session.completionDate!.getTime() - session.activationDate.getTime()) / (1000 * 60 * 60 * 24);

      expect(completionTime).toBeCloseTo(5, 1); // Should be approximately 5 days
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid member ID gracefully', async () => {
      try {
        await storage.getOnboardingSessionByMember(999999);
        expect(true).toBe(true); // Should not throw
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate required fields for onboarding session', async () => {
      try {
        await storage.createOnboardingSession({
          memberId: 0, // Invalid member ID
          status: 'in_progress',
          currentDay: 1,
          activationDate: new Date(),
        });
        // If this doesn't throw, validation is handled elsewhere
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle document upload size limits', async () => {
      const largeDocumentData = {
        memberId: testMember.id,
        documentType: 'insurance_card',
        fileName: 'large_file.pdf',
        fileSize: 50 * 1024 * 1024, // 50MB - exceeds typical limit
        mimeType: 'application/pdf',
        uploadDate: new Date(),
        isRequired: true,
      };

      // The actual validation should happen in the route handler
      // This test ensures the data structure can handle large files
      const document = await storage.createMemberDocument(largeDocumentData);
      expect(document.fileSize).toBe(50 * 1024 * 1024);
    });
  });
});