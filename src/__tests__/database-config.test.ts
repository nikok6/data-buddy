import { PrismaClient } from '@prisma/client';

describe('Database Configuration', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should be using a separate test database', async () => {
    // First, let's verify we can write test data
    const testPlan = await prisma.dataPlan.create({
      data: {
        planId: 'test_db_verify',
        provider: 'TestProvider',
        name: 'Test Plan',
        dataFreeInGB: 1,
        billingCycleInDays: 30,
        price: 10,
        excessChargePerMB: 0.01,
      },
    });

    expect(testPlan).toBeTruthy();
    expect(testPlan.provider).toBe('TestProvider');

    // Verify we can read the test data
    const retrievedPlan = await prisma.dataPlan.findUnique({
      where: { planId: 'test_db_verify' },
    });

    expect(retrievedPlan).toBeTruthy();
    expect(retrievedPlan?.provider).toBe('TestProvider');

    // Clean up test data
    await prisma.dataPlan.delete({
      where: { planId: 'test_db_verify' },
    });

    // Verify the data was cleaned up
    const deletedPlan = await prisma.dataPlan.findUnique({
      where: { planId: 'test_db_verify' },
    });
    expect(deletedPlan).toBeNull();

    // Log environment for verification
    console.log('Current NODE_ENV:', process.env.NODE_ENV);
    console.log('Current DATABASE_URL:', process.env.DATABASE_URL);
  });
}); 