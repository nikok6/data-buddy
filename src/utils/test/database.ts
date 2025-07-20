import { PrismaClient } from '@prisma/client';

// Create a singleton instance for tests
const prisma = new PrismaClient();

/**
 * Cleans up all tables in the test database in the correct order
 * to avoid foreign key constraint violations
 */
export const cleanupDatabase = async () => {
  await prisma.$transaction([
    prisma.usage.deleteMany(),
    prisma.subscriber.deleteMany(),
    prisma.dataPlan.deleteMany(),
  ]);
};

/**
 * Seeds the database with the provided data plans
 */
export const seedDataPlans = async (dataPlans: any[]) => {
  await prisma.$transaction(
    dataPlans.map((plan) =>
      prisma.dataPlan.create({
        data: {
          planId: plan.id,
          provider: plan.provider,
          name: plan.name,
          dataFreeInGB: plan.dataFreeInGB,
          billingCycleInDays: plan.billingCycleInDays,
          price: plan.price,
          excessChargePerMB: plan.excessChargePerMB,
        },
      })
    )
  );
};

/**
 * Disconnects from the test database
 */
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};

export { prisma };

export interface TestPlan {
  planId: string;
  provider: string;
  name: string;
  dataFreeInGB: number;
  billingCycleInDays: number;
  price: number;
  excessChargePerMB: number;
}

export interface TestSubscriber {
  phoneNumber: string;
  planId: number;
}

export const setupTestData = async (plan: TestPlan): Promise<{ plan: any; subscriber: TestSubscriber }> => {
  // Create test plan
  const createdPlan = await prisma.dataPlan.create({
    data: plan
  });

  const subscriber: TestSubscriber = {
    phoneNumber: '1234567890',
    planId: createdPlan.id
  };

  // Create test subscriber
  await prisma.subscriber.create({
    data: {
      phoneNumber: subscriber.phoneNumber,
      planId: subscriber.planId
    }
  });

  return { plan: createdPlan, subscriber };
};

export const cleanupTestData = async (subscriber: TestSubscriber, plan: TestPlan) => {
  // Clean up test data
  await prisma.usage.deleteMany({
    where: {
      subscriber: {
        phoneNumber: subscriber.phoneNumber
      }
    }
  });
  await prisma.subscriber.deleteMany({
    where: {
      phoneNumber: subscriber.phoneNumber
    }
  });
  await prisma.dataPlan.deleteMany({
    where: {
      planId: plan.planId
    }
  });
};

export const cleanupUsageData = async (phoneNumber: string) => {
  await prisma.usage.deleteMany({
    where: {
      subscriber: {
        phoneNumber
      }
    }
  });
};

export const createUsageRecord = async (subscriberId: number, date: Date, usageInMB: number) => {
  return prisma.usage.create({
    data: {
      subscriberId,
      date,
      usageInMB
    }
  });
};

export const getSubscriberWithPlan = async (phoneNumber: string) => {
  return prisma.subscriber.findUnique({
    where: { phoneNumber },
    include: { plan: true }
  });
}; 

export const getSubscriberWithUsages = async (phoneNumber: string) => {
  return prisma.subscriber.findUnique({
    where: { phoneNumber },
    include: { usages: true }
  });
};

export const getAllPlans = async () => {
  return prisma.dataPlan.findMany();
};

export const getPlansForProvider = async (provider: string) => {
  const allPlans = await prisma.dataPlan.findMany();
  return allPlans.filter(plan => 
    plan.provider.toLowerCase() === provider.toLowerCase()
  );
};