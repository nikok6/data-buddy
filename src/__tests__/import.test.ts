import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { PrismaClient } from '@prisma/client';
import { Readable } from 'stream';
import FormData from 'form-data';
import { availableDataPlans } from '../config/seed';

const prisma = new PrismaClient();

describe('CSV Import API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Clean up the database before each test
    // Delete in correct order due to foreign key constraints
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

  const createTestCsvBuffer = (content: string): Buffer => {
    return Buffer.from(content);
  };

  const createFormData = (csvContent: string): FormData => {
    const form = new FormData();
    const buffer = createTestCsvBuffer(csvContent);
    const stream = Readable.from(buffer);
    form.append('file', stream, {
      filename: 'test.csv',
      contentType: 'text/csv',
    });
    return form;
  };

  it('should successfully import valid CSV data', async () => {
    const csvContent = 
      'phone_number,plan_id,date,usage_in_mb\n' +
      '80000000,plan_3,1735862400000,882\n' +
      '80000000,plan_3,1735776000000,912';

    const form = createFormData(csvContent);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.payload);
    expect(result.success).toBe(true);
    expect(result.data.imported).toBe(2);
    expect(result.data.skipped.duplicates).toBe(0);

    // Verify database state
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber: '80000000' },
      include: { usages: true },
    });

    expect(subscriber).toBeTruthy();
    expect(subscriber?.usages.length).toBe(2);
  });

  it('should handle duplicate entries', async () => {
    const csvContent = 
      'phone_number,plan_id,date,usage_in_mb\n' +
      '80000000,plan_3,1735862400000,882\n' +
      '80000000,plan_3,1735862400000,882'; // Same date

    const form = createFormData(csvContent);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.payload);
    expect(result.success).toBe(true);
    expect(result.data.imported).toBe(1);
    expect(result.data.skipped.duplicates).toBe(1);
  });

  it('should handle invalid data', async () => {
    const csvContent = 
      'phone_number,plan_id,date,usage_in_mb\n' +
      'invalid,plan_3,1735862400000,882\n' + // Invalid phone
      '80000000,invalid_plan,1735862400000,882\n' + // Invalid plan
      '80000000,plan_3,invalid_date,882\n' + // Invalid date
      '80000000,plan_3,1735862400000,invalid'; // Invalid usage

    const form = createFormData(csvContent);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.payload);
    expect(result.success).toBe(true);
    expect(result.data.imported).toBe(0);
    expect(result.data.skipped.invalid.invalidPhoneNumber).toBe(1);
    expect(result.data.skipped.invalid.invalidPlanId).toBe(1);
    expect(result.data.skipped.invalid.invalidDate).toBe(1);
    expect(result.data.skipped.invalid.invalidUsage).toBe(1);
  });

  it('should handle missing file', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const result = JSON.parse(response.payload);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No file uploaded');
  });

  it('should handle non-CSV file', async () => {
    const form = new FormData();
    const buffer = Buffer.from('not a csv');
    const stream = Readable.from(buffer);
    form.append('file', stream, {
      filename: 'test.txt',
      contentType: 'text/plain',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(400);
    const result = JSON.parse(response.payload);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid file type. Please upload a CSV file');
  });

  it('should create new subscriber if not exists', async () => {
    const csvContent = 
      'phone_number,plan_id,date,usage_in_mb\n' +
      '81111111,plan_2,1735862400000,404';

    const form = createFormData(csvContent);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.payload);
    expect(result.success).toBe(true);
    expect(result.data.imported).toBe(1);

    // Verify subscriber was created
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber: '81111111' },
    });

    expect(subscriber).toBeTruthy();
    expect(subscriber?.phoneNumber).toBe('81111111');
  });

  it('should update existing subscriber plan if changed', async () => {
    // First create a subscriber with plan_2
    const initialCsvContent = 
      'phone_number,plan_id,date,usage_in_mb\n' +
      '82222222,plan_2,1735862400000,404';

    await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: createFormData(initialCsvContent),
      headers: createFormData(initialCsvContent).getHeaders(),
    });

    // Then update with plan_3
    const updateCsvContent = 
      'phone_number,plan_id,date,usage_in_mb\n' +
      '82222222,plan_3,1735776000000,912';

    const form = createFormData(updateCsvContent);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/import-csv',
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(200);

    // Verify subscriber plan was updated
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber: '82222222' },
      include: { plan: true },
    });

    expect(subscriber).toBeTruthy();
    expect(subscriber?.plan.planId).toBe('plan_3');
  });
}); 