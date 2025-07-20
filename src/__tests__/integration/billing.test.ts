import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import {
  TestPlan,
  TestSubscriber,
  setupTestData,
  cleanupTestData,
  cleanupUsageData,
  createUsageRecord,
  getSubscriberWithPlan,
  disconnectDatabase
} from '../../utils/test/database';

describe('Billing API Integration Tests', () => {
  let app: FastifyInstance;
  let testPlan: TestPlan;
  let testSubscriber: TestSubscriber;

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
  });

  afterAll(async () => {
    await cleanupTestData(testSubscriber, testPlan);
    await disconnectDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupUsageData(testSubscriber.phoneNumber);
  });

  describe('GET /api/billing/:phoneNumber', () => {
    it('should return 400 for invalid phone number format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/invalid-phone'
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Invalid phone number format'
      });
    });

    it('should return 404 for non-existent subscriber', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/9999999999'
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Subscriber not found for phone number: 9999999999'
      });
    });

    it('should return billing report with no usage data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/${testSubscriber.phoneNumber}`
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toMatchObject({
        success: true,
        data: {
          phoneNumber: testSubscriber.phoneNumber,
          totalCost: testPlan.price,
          billingCycles: [{
            basePrice: testPlan.price,
            totalUsageInMB: 0,
            includedDataInMB: testPlan.dataFreeInGB * 1024,
            excessDataInMB: 0,
            excessCost: 0,
            totalCost: testPlan.price
          }]
        }
      });
    });

    it('should return billing report with usage under the free limit', async () => {
      const subscriber = await getSubscriberWithPlan(testSubscriber.phoneNumber);
      const usageInMB = testPlan.dataFreeInGB * 1024 - 100; // Just under the limit

      await createUsageRecord(subscriber!.id, new Date(), usageInMB);

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/${testSubscriber.phoneNumber}`
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        phoneNumber: testSubscriber.phoneNumber,
        totalCost: testPlan.price,
        billingCycles: [{
          basePrice: testPlan.price,
          totalUsageInMB: usageInMB,
          includedDataInMB: testPlan.dataFreeInGB * 1024,
          excessDataInMB: 0,
          excessCost: 0,
          totalCost: testPlan.price
        }]
      });
    });

    it('should return billing report with excess usage', async () => {
      const subscriber = await getSubscriberWithPlan(testSubscriber.phoneNumber);
      const excessMB = 100;
      const usageInMB = testPlan.dataFreeInGB * 1024 + excessMB;

      await createUsageRecord(subscriber!.id, new Date(), usageInMB);

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/${testSubscriber.phoneNumber}`
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      const expectedExcessCost = excessMB * testPlan.excessChargePerMB;
      const expectedTotalCost = testPlan.price + expectedExcessCost;

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        phoneNumber: testSubscriber.phoneNumber,
        totalCost: expectedTotalCost,
        billingCycles: [{
          basePrice: testPlan.price,
          totalUsageInMB: usageInMB,
          includedDataInMB: testPlan.dataFreeInGB * 1024,
          excessDataInMB: excessMB,
          excessCost: expectedExcessCost,
          totalCost: expectedTotalCost
        }]
      });
    });

    it('should handle multiple usage records in the same billing cycle', async () => {
      const subscriber = await getSubscriberWithPlan(testSubscriber.phoneNumber);
      const today = new Date();
      
      // Create multiple usage records for different days
      const usageRecords = [
        { date: new Date(today.setDate(today.getDate() - 2)), usageInMB: 500 },
        { date: new Date(today.setDate(today.getDate() + 1)), usageInMB: 300 },
        { date: new Date(today.setDate(today.getDate() + 1)), usageInMB: 200 }
      ];

      for (const record of usageRecords) {
        await createUsageRecord(subscriber!.id, record.date, record.usageInMB);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/${testSubscriber.phoneNumber}`
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      const totalUsage = usageRecords.reduce((sum, record) => sum + record.usageInMB, 0);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        phoneNumber: testSubscriber.phoneNumber,
        totalCost: testPlan.price,
        billingCycles: [{
          basePrice: testPlan.price,
          totalUsageInMB: totalUsage,
          includedDataInMB: testPlan.dataFreeInGB * 1024,
          excessDataInMB: 0,
          excessCost: 0,
          totalCost: testPlan.price
        }]
      });
    });
  });
}); 