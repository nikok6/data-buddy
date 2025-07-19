import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { PrismaClient, DataPlan } from '@prisma/client';
import { availableDataPlans } from '../config/seed';

const prisma = new PrismaClient();

describe('Plans API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Clean up and seed the database before each test
    await prisma.$transaction([
      prisma.usage.deleteMany(),
      prisma.subscriber.deleteMany(),
      prisma.dataPlan.deleteMany(),
    ]);
    
    // Seed the data plans
    await prisma.$transaction(
      availableDataPlans.map((plan) =>
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /api/plans should return all available plans', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/plans',
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(availableDataPlans.length);
    expect(result.data.map((plan: DataPlan) => plan.planId).sort())
      .toEqual(availableDataPlans.map(plan => plan.id).sort());
  });

  it('GET /api/plans should filter by provider', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/plans?provider=Starhub',
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data.every((plan: DataPlan) => plan.provider === 'Starhub')).toBe(true);
  });
  
  it('GET /api/plans should return empty array for invalid provider', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/plans?provider=InvalidProvider',
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it('GET /api/plans should be case insensitive for provider filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/plans?provider=starHUB',
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data.every((plan: DataPlan) => plan.provider.toLowerCase() === 'starhub'.toLowerCase())).toBe(true);
  });
});

// create test on service layer