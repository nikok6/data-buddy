import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { Readable } from 'stream';
import FormData from 'form-data';
import { availableDataPlans } from '../../config/seed';
import { 
  cleanupDatabase, 
  seedDataPlans, 
  disconnectDatabase, 
  getSubscriberWithPlan, 
  getSubscriberWithUsages,
  getAdminToken,
  getRegularUserToken
} from '../../utils/test/database';

describe('Import CSV Integration Tests', () => {
  let app: FastifyInstance;
  let authHeader: string;
  let userAuthHeader: string;

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

  describe('Authorization', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const form = new FormData();
      const buffer = Buffer.from('phone_number,plan_id,date,usage_in_mb\n');
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: form,
        headers: form.getHeaders()
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should return 403 for regular user access', async () => {
      const form = new FormData();
      const buffer = Buffer.from('phone_number,plan_id,date,usage_in_mb\n');
      const stream = Readable.from(buffer);
      form.append('file', stream, {
        filename: 'test.csv',
        contentType: 'text/csv',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: form,
        headers: {
          ...form.getHeaders(),
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

  describe('Basic CSV Import Functionality', () => {
    it('should successfully import valid CSV data for admin', async () => {
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
        headers: {
          ...form.getHeaders(),
          authorization: authHeader
        }
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

    it('should create new subscriber if not exists for admin', async () => {
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
        headers: {
          ...form.getHeaders(),
          authorization: authHeader
        }
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
    it('should handle duplicate entries for admin', async () => {
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
        headers: {
          ...form.getHeaders(),
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(1);
      expect(result.data.newSubscribers).toBe(1);
      expect(result.data.skipped.duplicates).toBe(1);
    });

    it('should handle invalid data entries for admin', async () => {
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
        headers: {
          ...form.getHeaders(),
          authorization: authHeader
        }
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

    it('should handle missing file for admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/import-csv',
        payload: {},
        headers: {
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({
        success: false,
        error: 'No file uploaded'
      });
    });

    it('should handle non-CSV file for admin', async () => {
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
        headers: {
          ...form.getHeaders(),
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({
        success: false,
        error: 'Invalid file type. Please upload a CSV file'
      });
    });
  });

  describe('CSV File Format Validation', () => {
    it('should handle empty CSV file and files with only headers for admin', async () => {
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
        headers: {
          ...emptyForm.getHeaders(),
          authorization: authHeader
        }
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
        headers: {
          ...headerForm.getHeaders(),
          authorization: authHeader
        }
      });

      expect(headerResponse.statusCode).toBe(200);
      expect(JSON.parse(headerResponse.payload).data.imported).toBe(0);
    });

    it('should handle missing required columns in CSV for admin', async () => {
      const csvContent = 
        'phone_number,date,usage_in_mb\n' + // Missing plan_id
        `${validPhoneNumber},${validDate},${validUsage}`;

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
        headers: {
          ...form.getHeaders(),
          authorization: authHeader
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({
        success: false,
        error: 'Missing required columns: plan_id'
      });
    });
  });
});