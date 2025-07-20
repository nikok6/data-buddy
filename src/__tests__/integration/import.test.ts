import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { Readable } from 'stream';
import FormData from 'form-data';
import { availableDataPlans } from '../../config/seed';
import { cleanupDatabase, seedDataPlans, disconnectDatabase, getSubscriberWithPlan, getSubscriberWithUsages } from '../../utils/test/database';

describe('Import CSV Integration Tests', () => {
  let app: FastifyInstance;

  // Test data
  const validPhoneNumber = '80000000';
  const validPlanId = 'plan_3';
  const validDate = '1735862400000';
  const validUsage = '882';

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

  describe('Basic CSV Import Functionality', () => {
    it('should successfully import valid CSV data', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        `${validPhoneNumber},${validPlanId},${validDate},${validUsage}\n` +
        `${validPhoneNumber},${validPlanId},1735776000000,912`;

      const form = new FormData();
      const buffer = Buffer.from(csvContent);
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

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
      expect(result.data.newSubscribers).toBe(1);

      // Verify database state
      const subscriber = await getSubscriberWithUsages(validPhoneNumber);

      expect(subscriber).toBeTruthy();
      expect(subscriber?.usages.length).toBe(2);
    });

    it('should create new subscriber if not exists', async () => {
      const newPhoneNumber = '81111111';
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        `${newPhoneNumber},plan_2,${validDate},404`;

      const form = new FormData();
      const buffer = Buffer.from(csvContent);
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

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

      const subscriber = await getSubscriberWithPlan(newPhoneNumber);

      expect(subscriber).toBeTruthy();
      expect(subscriber?.phoneNumber).toBe(newPhoneNumber);
      expect(subscriber?.plan.planId).toBe('plan_2');
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should handle duplicate entries', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        `${validPhoneNumber},${validPlanId},${validDate},${validUsage}\n` +
        `${validPhoneNumber},${validPlanId},${validDate},${validUsage}`; // Duplicate

      const form = new FormData();
      const buffer = Buffer.from(csvContent);
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

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
      expect(result.data.newSubscribers).toBe(1);
      expect(result.data.skipped.duplicates).toBe(1);
    });

    it('should handle invalid data entries', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        `invalid,${validPlanId},${validDate},${validUsage}\n` + // Invalid phone
        `${validPhoneNumber},invalid_plan,${validDate},${validUsage}\n` + // Invalid plan
        `${validPhoneNumber},${validPlanId},invalid_date,${validUsage}\n` + // Invalid date
        `${validPhoneNumber},${validPlanId},${validDate},invalid`; // Invalid usage

      const form = new FormData();
      const buffer = Buffer.from(csvContent);
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

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
      expect(result.data.newSubscribers).toBe(0);
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
      expect(JSON.parse(response.payload)).toEqual({
        success: false,
        error: 'No file uploaded'
      });
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
      expect(JSON.parse(response.payload)).toEqual({
        success: false,
        error: 'Invalid file type. Please upload a CSV file'
      });
    });
  });

  describe('CSV File Format Validation', () => {
    it('should handle empty CSV file and files with only headers', async () => {
      // Test completely empty file
      const emptyForm = new FormData();
      const emptyBuffer = Buffer.from('');
      const emptyStream = Readable.from(emptyBuffer);
      emptyForm.append('file', emptyStream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      const emptyResponse = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: emptyForm,
        headers: emptyForm.getHeaders(),
      });

      expect(emptyResponse.statusCode).toBe(400);
      expect(JSON.parse(emptyResponse.payload)).toEqual({
        success: false,
        error: 'Empty CSV file'
      });

      // Test file with only headers
      const headerForm = new FormData();
      const headerBuffer = Buffer.from('phone_number,plan_id,date,usage_in_mb\n');
      const headerStream = Readable.from(headerBuffer);
      headerForm.append('file', headerStream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      const headerResponse = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: headerForm,
        headers: headerForm.getHeaders(),
      });

      expect(headerResponse.statusCode).toBe(200);
      expect(JSON.parse(headerResponse.payload).data.imported).toBe(0);
    });

    it('should handle missing required columns in CSV', async () => {
      const missingColumns = [
        'plan_id,date,usage_in_mb\n80000000,plan_1,500', // Missing phone_number
        'phone_number,date,usage_in_mb\n80000000,1735862400000,500', // Missing plan_id
        'phone_number,plan_id,usage_in_mb\n80000000,plan_1,500', // Missing date
        'phone_number,plan_id,date\n80000000,plan_1,1735862400000' // Missing usage_in_mb
      ];

      for (const csvContent of missingColumns) {
        const form = new FormData();
        const buffer = Buffer.from(csvContent);
        const stream = Readable.from(buffer);
        form.append('file', stream, {
          filename: 'test.csv',
          contentType: 'text/csv',
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
        expect(result.error).toMatch(/Missing required column/);
      }
    });

    it('should handle extra/unknown columns in CSV', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb,extra_column1,extra_column2\n' +
        `${validPhoneNumber},plan_1,${validDate},500,extra1,extra2`;

      const form = new FormData();
      const buffer = Buffer.from(csvContent);
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.data.imported).toBe(1);
      expect(result.data.newSubscribers).toBe(1);
    });
  });

  describe('Subscriber Plan Management', () => {
    it('should update existing subscriber plan if changed', async () => {
      // First create a subscriber with plan_2
      const initialCsvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '82222222,plan_2,1735862400000,404';

      const initialForm = new FormData();
      const initialBuffer = Buffer.from(initialCsvContent);
      const initialStream = Readable.from(initialBuffer);
      initialForm.append('file', initialStream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: initialForm,
        headers: initialForm.getHeaders(),
      });

      // Then update with plan_3
      const updateCsvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '82222222,plan_3,1735776000000,912';

      const updateForm = new FormData();
      const updateBuffer = Buffer.from(updateCsvContent);
      const updateStream = Readable.from(updateBuffer);
      updateForm.append('file', updateStream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: updateForm,
        headers: updateForm.getHeaders(),
      });

      expect(response.statusCode).toBe(200);

      const subscriber = await getSubscriberWithPlan('82222222');

      expect(subscriber).toBeTruthy();
      expect(subscriber?.plan.planId).toBe('plan_3');
    });
  });
});