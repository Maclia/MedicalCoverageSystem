import request from 'supertest';
import { app } from '../src/index';
import { createLogger } from '../src/utils/logger';
import { checkDatabaseConnection } from '../src/config/database';

const logger = createLogger('claims-service-integration');

describe('Claims Service Integration Tests', () => {
  beforeAll(async () => {
    // Check database connection before running tests
    const connected = await checkDatabaseConnection();
    if (!connected) {
      logger.error('Database connection failed. Skipping integration tests.');
      process.exit(1);
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'claims-service');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');
    });
  });

  describe('Claim Operations', () => {
    let testClaim = {
      claimNumber: 'CLM-2026-INT-TEST-001',
      institutionId: 1,
      memberId: 1,
      benefitId: 1,
      memberName: 'Integration Test User',
      serviceType: 'Consultation',
      totalAmount: 1000,
      amount: 1000,
      description: 'Integration test claim',
      diagnosis: 'General check-up',
      diagnosisCode: 'Z00.0',
      diagnosisCodeType: 'ICD-10'
    };

    let createdClaimId;

    it('should create a new claim', async () => {
      const response = await request(app)
        .post('/')
        .send(testClaim)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('claimNumber', testClaim.claimNumber);
      expect(response.body.data).toHaveProperty('institutionId', testClaim.institutionId);
      expect(response.body.data).toHaveProperty('memberId', testClaim.memberId);
      expect(response.body.data).toHaveProperty('benefitId', testClaim.benefitId);
      expect(response.body.data).toHaveProperty('memberName', testClaim.memberName);
      expect(response.body.data).toHaveProperty('serviceType', testClaim.serviceType);
      expect(response.body.data).toHaveProperty('totalAmount', testClaim.totalAmount);
      expect(response.body.data).toHaveProperty('amount', testClaim.amount);
      expect(response.body.data).toHaveProperty('description', testClaim.description);
      expect(response.body.data).toHaveProperty('diagnosis', testClaim.diagnosis);
      expect(response.body.data).toHaveProperty('diagnosisCode', testClaim.diagnosisCode);
      expect(response.body.data).toHaveProperty('diagnosisCodeType', testClaim.diagnosisCodeType);
      expect(response.body.data).toHaveProperty('status', 'submitted');
      expect(response.body.data).toHaveProperty('createdAt');

      createdClaimId = response.body.data.id;
    });

    it('should get all claims', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should get claim by ID', async () => {
      const response = await request(app)
        .get(`/${createdClaimId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', createdClaimId);
      expect(response.body.data).toHaveProperty('claimNumber', testClaim.claimNumber);
    });

    it('should update claim status', async () => {
      const updateData = {
        status: 'approved',
        notes: 'Integration test approval'
      };

      const response = await request(app)
        .patch(`/${createdClaimId}/status`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', createdClaimId);
      expect(response.body.data).toHaveProperty('status', updateData.status);
      expect(response.body.data).toHaveProperty('reviewerNotes', updateData.notes);
    });

    it('should delete claim', async () => {
      const response = await request(app)
        .delete(`/${createdClaimId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Claim deleted successfully');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent claim', async () => {
      const response = await request(app)
        .get('/99999999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Claim not found');
    });

    it('should return 400 for invalid claim data', async () => {
      const invalidClaim = {
        // Missing required fields
        institutionId: 1,
        memberId: 1
      };

      const response = await request(app)
        .post('/')
        .send(invalidClaim)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid claim data');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});