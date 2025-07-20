import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { DataPlan } from '@prisma/client';
import { availableDataPlans } from '../../config/seed';
import { cleanupDatabase, seedDataPlans, disconnectDatabase, getAllPlans, getPlansForProvider } from '../../utils/test/database';

describe('Plans API Integration Tests', () => {
  let app: FastifyInstance;

  // Setup and teardown
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    await seedDataPlans(availableDataPlans);
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
    describe('Basic Functionality', () => {
      it('should return all available plans', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans'
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
      it('should filter plans by provider', async () => {
        const provider = 'Starhub';
        const response = await app.inject({
          method: 'GET',
          url: `/api/plans?provider=${provider}`
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

      it('should return empty array for non-existent provider', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans?provider=InvalidProvider'
        });

        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result).toEqual({
          success: true,
          data: []
        });
      });

      it('should be case insensitive for provider filter', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/plans?provider=starHUB'
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