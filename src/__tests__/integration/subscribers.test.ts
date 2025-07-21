import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import {
  TestPlan,
  TestSubscriber,
  setupTestData,
  cleanupTestData,
  disconnectDatabase,
  prisma,
  seedDataPlans,
  getAdminToken,
  getRegularUserToken
} from '../../utils/test/database';

describe('Subscribers API Integration Tests', () => {
  let app: FastifyInstance;
  let testPlan: TestPlan;
  let testSubscriber: TestSubscriber;
  let authHeader: string;
  let userAuthHeader: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Initialize test data
    testPlan = {
      planId: 'test_plan_1',
      provider: 'TestProvider',
      name: 'Test Plan',
      dataFreeInGB: 5,
      billingCycleInDays: 30,
      price: 50.00,
      excessChargePerMB: 0.01
    };

    const result = await setupTestData(testPlan);
    testSubscriber = result.subscriber;

    // Setup auth headers
    const adminToken = await getAdminToken();
    const userToken = await getRegularUserToken();
    authHeader = `Bearer ${adminToken}`;
    userAuthHeader = `Bearer ${userToken}`;
  });

  afterAll(async () => {
    await cleanupTestData(testSubscriber, testPlan);
    await disconnectDatabase();
    await app.close();
  });

  describe('GET /api/subscribers', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers'
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should return 403 for regular user access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers',
        headers: {
          authorization: userAuthHeader
        }
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return all subscribers for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers',
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('phoneNumber');
      expect(result.data[0]).toHaveProperty('planId');
    });
  });

  describe('GET /api/subscribers/:id', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber }
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/subscribers/${subscriber?.id}`
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should return subscriber by ID for admin', async () => {
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber }
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/subscribers/${subscriber?.id}`,
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        phoneNumber: testSubscriber.phoneNumber,
        planId: testSubscriber.planId
      });
    });

    it('should return 404 for non-existent subscriber ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers/999999',
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('GET /api/subscribers/phone', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers/phone',
        query: { phoneNumber: testSubscriber.phoneNumber }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should return subscriber by phone number for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers/phone',
        query: { phoneNumber: testSubscriber.phoneNumber },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        phoneNumber: testSubscriber.phoneNumber,
        planId: testSubscriber.planId
      });
    });

    it('should return 404 for non-existent phone number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/subscribers/phone',
        query: { phoneNumber: '9999999999' },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('POST /api/subscribers', () => {
    const newSubscriber = {
      phoneNumber: '98765432',
      planId: 0 // Will be updated with actual plan ID
    };

    beforeAll(async () => {
      // Get the actual plan ID
      const plan = await prisma.dataPlan.findFirst({
        where: { planId: testPlan.planId }
      });
      newSubscriber.planId = plan!.id;
    });

    afterAll(async () => {
      // Cleanup the created subscriber
      await prisma.subscriber.deleteMany({
        where: { phoneNumber: newSubscriber.phoneNumber }
      });
    });

    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: newSubscriber
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should create a new subscriber for admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: newSubscriber,
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        phoneNumber: newSubscriber.phoneNumber,
        planId: newSubscriber.planId
      });
    });

    it('should return 409 for duplicate phone number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: newSubscriber,
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return 500 for invalid plan ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/subscribers',
        payload: {
          phoneNumber: '87654322',
          planId: 999999
        },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('PUT /api/subscribers/:id', () => {
    let subscriberId: number;
    let updatedPlanId: number;

    beforeAll(async () => {
      // Seed the database with a different plan
      await seedDataPlans([{
        id: 'test_plan_2',
        provider: 'TestProvider',
        name: 'Test Plan 2',
        dataFreeInGB: 10,
        billingCycleInDays: 30,
        price: 75.00,
        excessChargePerMB: 0.02
      }]);

      // Get the subscriber ID
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber }
      });
      subscriberId = subscriber!.id;

      // Get the numeric ID of the seeded plan
      const plan = await prisma.dataPlan.findUnique({
        where: { planId: 'test_plan_2' }
      });
      updatedPlanId = plan!.id;
    });

    afterAll(async () => {
      // Clean up in the correct order - first update subscriber back to original plan
      await prisma.subscriber.update({
        where: { id: subscriberId },
        data: { planId: testSubscriber.planId }
      });
      
      // Then delete the test plan
      await prisma.dataPlan.deleteMany({
        where: { planId: 'test_plan_2' }
      });
    });

    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/subscribers/${subscriberId}`,
        payload: {
          planId: updatedPlanId
        }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should update subscriber plan for admin', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/subscribers/${subscriberId}`,
        payload: {
          planId: updatedPlanId
        },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: subscriberId,
        planId: updatedPlanId
      });
    });

    it('should return 500 for non-existent subscriber ID', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/subscribers/999999',
        payload: {
          planId: updatedPlanId
        },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return 500 for invalid plan ID', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/subscribers/${subscriberId}`,
        payload: {
          planId: 999999
        },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });
}); 