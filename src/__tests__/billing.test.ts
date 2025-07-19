import { PrismaClient } from '@prisma/client';
import { getBillingReportService } from '../services/billing';
import { BillingReport } from '../types';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';

const prisma = new PrismaClient();

describe('Billing Report', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Service Layer', () => {
    // Test data
    const testPlan = {
      planId: 'test_plan_1',
      provider: 'TestProvider',
      name: 'Test Plan',
      dataFreeInGB: 5,
      billingCycleInDays: 30,
      price: 50.00,
      excessChargePerMB: 0.01
    };

    const testSubscriber = {
      phoneNumber: '1234567890',
      planId: 0 // Will be set after plan creation
    };

    beforeAll(async () => {
      // Create test plan
      const plan = await prisma.dataPlan.create({
        data: testPlan
      });
      testSubscriber.planId = plan.id;

      // Create test subscriber
      await prisma.subscriber.create({
        data: {
          phoneNumber: testSubscriber.phoneNumber,
          planId: testSubscriber.planId
        }
      });
    });

    afterAll(async () => {
      // Clean up test data
      await prisma.usage.deleteMany({
        where: {
          subscriber: {
            phoneNumber: testSubscriber.phoneNumber
          }
        }
      });
      await prisma.subscriber.deleteMany({
        where: {
          phoneNumber: testSubscriber.phoneNumber
        }
      });
      await prisma.dataPlan.deleteMany({
        where: {
          planId: testPlan.planId
        }
      });
      await prisma.$disconnect();
    });

    beforeEach(async () => {
      // Clean up usage data before each test
      await prisma.usage.deleteMany({
        where: {
          subscriber: {
            phoneNumber: testSubscriber.phoneNumber
          }
        }
      });
    });

    it('should throw SubscriberNotFoundError for non-existent phone number', async () => {
      await expect(getBillingReportService('9999999999'))
        .rejects
        .toThrow('Subscriber not found for phone number: 9999999999');
    });

    it('should return normal cost when no usage data exists', async () => {
      const report = await getBillingReportService(testSubscriber.phoneNumber);
      
      expect(report.totalCost).toBe(testPlan.price);
      expect(report.billingCycles[0].totalUsageInMB).toBe(0);
      expect(report.billingCycles[0].totalCost).toBe(testPlan.price);
    });

    it('should calculate billing for a single complete cycle with no excess', async () => {
      const today = new Date();
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber },
        include: { plan: true }
      });

      // Create usage data for one billing cycle (under the free limit)
      const usageInMB = subscriber!.plan.dataFreeInGB * 1024 - 100; // Just under the limit
      await prisma.usage.create({
        data: {
          subscriberId: subscriber!.id,
          date: today,
          usageInMB
        }
      });

      const report = await getBillingReportService(testSubscriber.phoneNumber);
      
      expect(report.totalCost).toBe(testPlan.price);
      expect(report.billingCycles).toHaveLength(1);
      expect(report.billingCycles[0]).toMatchObject({
        basePrice: testPlan.price,
        totalUsageInMB: usageInMB,
        includedDataInMB: testPlan.dataFreeInGB * 1024,
        excessDataInMB: 0,
        excessCost: 0,
        totalCost: testPlan.price
      });
    });

    it('should calculate billing for a single complete cycle with excess usage', async () => {
      const today = new Date();
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber },
        include: { plan: true }
      });

      // Create usage data exceeding the free limit
      const excessMB = 100;
      const usageInMB = subscriber!.plan.dataFreeInGB * 1024 + excessMB;
      await prisma.usage.create({
        data: {
          subscriberId: subscriber!.id,
          date: today,
          usageInMB
        }
      });

      const report = await getBillingReportService(testSubscriber.phoneNumber);
      const expectedExcessCost = excessMB * testPlan.excessChargePerMB;
      const expectedTotalCost = testPlan.price + expectedExcessCost;
      
      expect(report.totalCost).toBe(expectedTotalCost);
      expect(report.billingCycles).toHaveLength(1);
      expect(report.billingCycles[0]).toMatchObject({
        basePrice: testPlan.price,
        totalUsageInMB: usageInMB,
        includedDataInMB: testPlan.dataFreeInGB * 1024,
        excessDataInMB: excessMB,
        excessCost: expectedExcessCost,
        totalCost: expectedTotalCost
      });
    });

    it('should aggregate multiple usage records within the same billing cycle', async () => {
      const today = new Date();
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber },
        include: { plan: true }
      });

      // Create multiple usage records for 3 different days
      const usageRecords = [500, 300, 200]; // Total: 1000 MB
      for (const usage of usageRecords) {
        const date = new Date(today);
        date.setDate(date.getDate() - 3 + usageRecords.indexOf(usage));
        await prisma.usage.create({
          data: {
            subscriberId: subscriber!.id,
            date,
            usageInMB: usage
          }
        });
      }

      const report = await getBillingReportService(testSubscriber.phoneNumber);
      const totalUsage = usageRecords.reduce((sum, usage) => sum + usage, 0);
      
      expect(report.billingCycles).toHaveLength(1);
      expect(report.billingCycles[0].totalUsageInMB).toBe(totalUsage);
      expect(report.billingCycles[0].totalCost).toBe(testPlan.price); // No excess
    });

    it('should only include complete billing cycles', async () => {
      const today = new Date();
      const subscriber = await prisma.subscriber.findUnique({
        where: { phoneNumber: testSubscriber.phoneNumber },
        include: { plan: true }
      });

      // Create usage for current incomplete cycle
      await prisma.usage.create({
        data: {
          subscriberId: subscriber!.id,
          date: today,
          usageInMB: 1000
        }
      });

      // Create usage for a past complete cycle
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - testPlan.billingCycleInDays - 1);
      await prisma.usage.create({
        data: {
          subscriberId: subscriber!.id,
          date: pastDate,
          usageInMB: 1000
        }
      });

      const report = await getBillingReportService(testSubscriber.phoneNumber);
      
      // Should only include the complete past cycle
      expect(report.billingCycles).toHaveLength(1);
      expect(report.billingCycles[0].startDate.getTime()).toBeLessThan(today.getTime());
    });
  });

  describe('API Endpoint', () => {
    // Test data
    const testPlan = {
        planId: 'test_plan_1',
        provider: 'TestProvider',
        name: 'Test Plan',
        dataFreeInGB: 5,
        billingCycleInDays: 30,
        price: 50.00,
        excessChargePerMB: 0.01
      };
  
      const testSubscriber = {
        phoneNumber: '1234567890',
        planId: 0 // Will be set after plan creation
      };
  
      beforeAll(async () => {
        // Create test plan
        const plan = await prisma.dataPlan.create({
          data: testPlan
        });
        testSubscriber.planId = plan.id;
  
        // Create test subscriber
        await prisma.subscriber.create({
          data: {
            phoneNumber: testSubscriber.phoneNumber,
            planId: testSubscriber.planId
          }
        });
      });
  
      afterAll(async () => {
        // Clean up test data
        await prisma.usage.deleteMany({
          where: {
            subscriber: {
              phoneNumber: testSubscriber.phoneNumber
            }
          }
        });
        await prisma.subscriber.deleteMany({
          where: {
            phoneNumber: testSubscriber.phoneNumber
          }
        });
        await prisma.dataPlan.deleteMany({
          where: {
            planId: testPlan.planId
          }
        });
        await prisma.$disconnect();
      });
  
      beforeEach(async () => {
        // Clean up usage data before each test
        await prisma.usage.deleteMany({
          where: {
            subscriber: {
              phoneNumber: testSubscriber.phoneNumber
            }
          }
        });
      });

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

    it('should return billing report for existing subscriber', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/1234567890'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('phoneNumber', '1234567890');
      expect(result.data).toHaveProperty('totalCost');
      expect(result.data).toHaveProperty('billingCycles');
    });
  });
}); 