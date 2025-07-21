import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import {
  TestPlan,
  TestSubscriber,
  setupTestData,
  cleanupTestData,
  cleanupUsageData,
  createUsageRecord,
  disconnectDatabase,
  prisma,
  getAdminToken,
  getRegularUserToken
} from '../../utils/test/database';

describe('Usage API Integration Tests', () => {
  let app: FastifyInstance;
  let testPlan: TestPlan;
  let testSubscriber: TestSubscriber;
  let subscriberId: number;
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

    // Get the subscriber ID for usage creation
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber: testSubscriber.phoneNumber }
    });
    subscriberId = subscriber!.id;

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

  beforeEach(async () => {
    await cleanupUsageData(testSubscriber.phoneNumber);
  });

  describe('GET /api/usage', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/usage',
        query: { phoneNumber: testSubscriber.phoneNumber }
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
        url: '/api/usage',
        query: { phoneNumber: testSubscriber.phoneNumber },
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

    it('should return empty usage data for subscriber with no usage', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/usage',
        query: { phoneNumber: testSubscriber.phoneNumber },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return usage data for subscriber with usage records', async () => {
      // Create a usage record
      const subscriberId = (await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber }
      }))!.id;

      const usageData = {
        subscriberId,
        date: new Date(),
        usageInMB: 100
      };

      await createUsageRecord(subscriberId, usageData.date, usageData.usageInMB);

      const response = await app.inject({
        method: 'GET',
        url: '/api/usage',
        query: { phoneNumber: testSubscriber.phoneNumber },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{
        date: usageData.date.toISOString(),
        usageInMB: usageData.usageInMB
      }]);
    });

    it('should return 404 for non-existent subscriber', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/usage',
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

    it('should return 400 for invalid phone number format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/usage',
        query: { phoneNumber: 'invalid-phone' },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('POST /api/usage', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const usageData = {
        phoneNumber: testSubscriber.phoneNumber,
        date: new Date().toISOString(),
        usageInMB: 150
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: usageData
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should return 403 for regular user access', async () => {
      const usageData = {
        phoneNumber: testSubscriber.phoneNumber,
        date: new Date().toISOString(),
        usageInMB: 150
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: usageData,
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

    it('should create a new usage record for admin', async () => {
      const usageData = {
        phoneNumber: testSubscriber.phoneNumber,
        date: new Date().toISOString(),
        usageInMB: 150
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: usageData,
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        date: expect.any(String),
        usageInMB: usageData.usageInMB
      });
    });

    it('should return 404 for non-existent subscriber', async () => {
      const usageData = {
        phoneNumber: '9999999999',
        usageInMB: 150,
        date: new Date().toISOString()
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: usageData,
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

    it('should return 400 for invalid usage data', async () => {
      const invalidUsageData = {
        phoneNumber: testSubscriber.phoneNumber,
        usageInMB: -100, // Invalid negative usage
        date: new Date().toISOString()
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: invalidUsageData,
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return 400 for invalid date format', async () => {
      const invalidUsageData = {
        phoneNumber: testSubscriber.phoneNumber,
        usageInMB: 150,
        date: 'invalid-date'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: invalidUsageData,
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should handle multiple usage records for the same subscriber', async () => {
      const usageData1 = {
        phoneNumber: testSubscriber.phoneNumber,
        date: new Date().toISOString(),
        usageInMB: 100
      };

      const usageData2 = {
        phoneNumber: testSubscriber.phoneNumber,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
        usageInMB: 200
      };

      // Create first usage record
      await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: usageData1,
        headers: {
          authorization: authHeader
        }
      });

      // Create second usage record
      await app.inject({
        method: 'POST',
        url: '/api/usage',
        payload: usageData2,
        headers: {
          authorization: authHeader
        }
      });

      // Verify both records were created
      const response = await app.inject({
        method: 'GET',
        url: '/api/usage',
        query: { phoneNumber: testSubscriber.phoneNumber },
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.map((u: { usageInMB: number }) => u.usageInMB)).toEqual(
        expect.arrayContaining([usageData1.usageInMB, usageData2.usageInMB])
      );
    });
  });
}); 