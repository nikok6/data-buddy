import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { DataPlan } from '@prisma/client';
import { availableDataPlans } from '../../config/seed';
import { 
  cleanupDatabase, 
  seedDataPlans, 
  disconnectDatabase, 
  getAllPlans, 
  getPlansForProvider,
  getAdminToken,
  getRegularUserToken
} from '../../utils/test/database';

describe('Plans API Integration Tests', () => {
  let app: FastifyInstance;
  let authHeader: string;
  let userAuthHeader: string;

  // Setup and teardown
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    await seedDataPlans(availableDataPlans);

    const adminToken = await getAdminToken();
    const userToken = await getRegularUserToken();
    authHeader = `Bearer ${adminToken}`;
    userAuthHeader = `Bearer ${userToken}`;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await disconnectDatabase();
    await app.close();
  });

  // Custom matcher for plan objects
  const expectPlanToMatch = (received: any, expected: any) => {
    expect(received.id).toBe(expected.id);
    expect(received.planId).toBe(expected.planId);
    expect(received.name).toBe(expected.name);
    expect(received.provider).toBe(expected.provider);
    expect(received.price).toBe(expected.price);
    expect(received.dataFreeInGB).toBe(expected.dataFreeInGB);
    expect(received.billingCycleInDays).toBe(expected.billingCycleInDays);
    expect(received.excessChargePerMB).toBe(expected.excessChargePerMB);
    // Verify dates exist but don't compare exact values
    expect(received.createdAt).toBeTruthy();
    expect(received.updatedAt).toBeTruthy();
  };

  describe('GET /api/plans', () => {
    describe('Authorization', () => {
      it('should return 401 when no authorization header is provided', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans'
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
          url: '/api/plans',
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
    });

    describe('Basic Functionality', () => {
      it('should return all available plans for admin', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans',
          headers: {
            authorization: authHeader
          }
        });
        const dbPlans = await getAllPlans();

        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(availableDataPlans.length);
        
        // Compare each plan individually
        result.data.forEach((receivedPlan: DataPlan) => {
          const expectedPlan = dbPlans.find(p => p.id === receivedPlan.id);
          expect(expectedPlan).toBeTruthy();
          expectPlanToMatch(receivedPlan, expectedPlan);
        });
      });
    });

    describe('Provider Filtering', () => {
      it('should filter plans by provider for admin', async () => {
        const provider = 'Starhub';
        const response = await app.inject({
          method: 'GET',
          url: `/api/plans?provider=${provider}`,
          headers: {
            authorization: authHeader
          }
        });
        const dbPlans = await getPlansForProvider(provider);

        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
        
        // Compare each plan individually
        result.data.forEach((receivedPlan: DataPlan) => {
          const expectedPlan = dbPlans.find(p => p.id === receivedPlan.id);
          expect(expectedPlan).toBeTruthy();
          expectPlanToMatch(receivedPlan, expectedPlan);
          expect(receivedPlan.provider).toBe(provider);
        });
      });

      it('should return empty array for non-existent provider for admin', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans?provider=InvalidProvider',
          headers: {
            authorization: authHeader
          }
        });

        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result).toEqual({
          success: true,
          data: []
        });
      });

      it('should be case insensitive for provider filter for admin', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans?provider=starHUB',
          headers: {
            authorization: authHeader
          }
        });
        const dbPlans = await getPlansForProvider('Starhub');

        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
        
        // Compare each plan individually
        result.data.forEach((receivedPlan: DataPlan) => {
          const expectedPlan = dbPlans.find(p => p.id === receivedPlan.id);
          expect(expectedPlan).toBeTruthy();
          expectPlanToMatch(receivedPlan, expectedPlan);
          expect(receivedPlan.provider.toLowerCase()).toBe('starhub'.toLowerCase());
        });
      });
    });
  });
});