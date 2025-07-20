import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../services/auth';
import { UserRole } from '../../types';
import { loginService } from '../../services/auth';

// Create a singleton instance for tests
const prisma = new PrismaClient();

/**
 * Gets an admin token for integration tests
 */
export const getAdminToken = async (): Promise<string> => {
  // Create admin user if it doesn't exist
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD_HASH!,
      role: UserRole.ADMIN,
      isActive: true
    }
  });

  // Login to get token
  const { token } = await loginService('admin', 'admin');
  console.log('Admin token:', token);
  return token;
};

/**
 * Gets a regular user token for integration tests
 */
export const getRegularUserToken = async (): Promise<string> => {
  // Create regular user if it doesn't exist
  const regularUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      password: process.env.ADMIN_PASSWORD_HASH!, // Using same hash mechanism for simplicity
      role: UserRole.USER,
      isActive: true
    }
  });

  // Login to get token
  const { token } = await loginService('testuser', 'admin');
  return token;
};

/**
 * Cleans up all tables in the test database in the correct order
 * to avoid foreign key constraint violations
 */
export const cleanupDatabase = async () => {
  await prisma.$transaction([
    prisma.usage.deleteMany(),
    prisma.subscriber.deleteMany(),
    prisma.dataPlan.deleteMany(),
    prisma.user.deleteMany(),
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

/**
 * Creates a test admin user
 */
export const createTestAdmin = async () => {
  const hashedPassword = await hashPassword('admin');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
      username: 'admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true
      }
    });
  }
};

/**
 * Cleans up test users
 */
export const cleanupTestUsers = async () => {
  await prisma.user.deleteMany();
};

export const setupTestData = async (plan: TestPlan): Promise<{ plan: any; subscriber: TestSubscriber }> => {
  // Create test admin user
  await createTestAdmin();

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
  await cleanupTestUsers();
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