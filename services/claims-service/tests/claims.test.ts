import request from 'supertest';
import { app } from '../src/index';
import { ClaimsService } from '../src/services/ClaimsService';
import { schema } from '../src/models/schema';
import { db } from '../src/config/database';

describe('Claims Service', () => {
  beforeAll(async () => {
    // Clear test database
    await db.delete().from(schema.claims);
  });

  afterAll(async () => {
    // Clean up
    await db.delete().from(schema.claims);
  });

  describe('Health Check', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'claims-service');
      expect(response.body).toHaveProperty('database.connected');
    });
  });

  describe('Claims CRUD Operations', () => {
    let testClaimId: number;

    it('should create a new claim', async () => {
      const claimData = {
        claimNumber: 'CLM-2026-001',
        institutionId: 1,
        memberId: 1,
        benefitId: 1,
        memberName: 'John Doe',
        serviceType: 'Consultation',
        totalAmount: 1000,
        amount: 1000,
        description: 'Medical consultation',
        diagnosis: 'General check-up',
        diagnosisCode: 'Z00.0',
        diagnosisCodeType: 'ICD-10' as const
      };

      const response = await request(app)
        .post('/api/claims')
        .send(claimData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('claimNumber', 'CLM-2026-001');
      testClaimId = response.body.data.id;
    });

    it('should get all claims', async () => {
      const response = await request(app)
        .get('/api/claims')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get claim by ID', async () => {
      const response = await request(app)
        .get(`/api/claims/${testClaimId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testClaimId);
    });

    it('should update claim status', async () => {
      const response = await request(app)
        .patch(`/api/claims/${testClaimId}/status`)
        .send({ status: 'approved', notes: 'Approved by admin' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'approved');
    });

    it('should delete claim', async () => {
      const response = await request(app)
        .delete(`/api/claims/${testClaimId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Claim deleted successfully');
    });
  });
});
