import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import {
  setupTestData,
  cleanupTestData,
  disconnectDatabase,
  prisma,
  getAdminToken,
  getRegularUserToken
} from '../../utils/test/database';
import { UserRole } from '../../types';
import bcrypt from 'bcryptjs';

describe('Auth API Integration Tests', () => {
  let app: FastifyInstance;
  let testUser: { username: string; password: string; hashedPassword: string };
  let testUserToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();



    // Initialize test user data
    testUser = {
      username: 'admin',
      password: 'admin',
      hashedPassword: await bcrypt.hash('admin', 12)
    };

    // Create test user in database
    await prisma.user.create({
      data: {
        username: testUser.username,
        password: testUser.hashedPassword,
        role: UserRole.ADMIN,
        isActive: true
      }
    });

    // Get test user token
    testUserToken = await getAdminToken();
  });

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { username: testUser.username }
    });
    await disconnectDatabase();
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username,
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('user');
      expect(result.data.user).toMatchObject({
        username: testUser.username,
        role: UserRole.ADMIN
      });
    });

    it('should return 401 with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username,
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Invalid username or password'
      });
    });

    it('should return 401 with non-existent username', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'nonexistentuser',
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Invalid username or password'
      });
    });

    it('should return 400 with missing credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Username and password are required'
      });
    });
  });

  describe('POST /api/auth/register', () => {
    const newUser = {
      username: 'newuser',
      password: 'NewUser123!@#',
      otp: '1234' // Using default OTP from environment variable
    };

    afterEach(async () => {
      // Cleanup any created user
      await prisma.user.deleteMany({
        where: { username: newUser.username }
      });
    });

    it('should successfully register a new user with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: newUser
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        username: newUser.username,
        role: UserRole.ADMIN
      });
      expect(result.data).not.toHaveProperty('password');
    });

    it('should return 400 with invalid OTP', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          ...newUser,
          otp: 'wrong-otp'
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Invalid OTP provided'
      });
    });

    it('should return 400 with missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: newUser.username
          // Missing password and OTP
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return 409 when username already exists', async () => {
      // First create a user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: newUser
      });

      // Try to create the same user again
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: newUser
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.stringContaining('already exists')
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${testUserToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        username: testUser.username,
        role: UserRole.ADMIN
      });
      expect(result.data).not.toHaveProperty('password');
    });

    it('should return 401 with no token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me'
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'InvalidFormat Token'
        }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });
}); 