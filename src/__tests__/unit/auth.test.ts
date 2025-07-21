import { AuthRepository } from '../../repositories/auth-repository';
import {
  loginService,
  registerService,
  getUserByIdService,
  validateTokenService,
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  initializeRepository
} from '../../services/auth';
import {  
  AuthenticationError,
  InvalidCredentialsError,
  UserNotFoundError,
  UserExistsError,
  InvalidTokenError,
  InvalidOTPError,
  InactiveUserError } from '../../types/auth';
import { UserRole } from '../../types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock the repository and external dependencies
jest.mock('../../repositories/auth-repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Services', () => {
  let mockRepository: jest.Mocked<AuthRepository>;
  const mockJwtSecret = 'test-secret';
  const mockOtp = '1234';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockRepository = new AuthRepository() as jest.Mocked<AuthRepository>;
    initializeRepository(mockRepository);

    // Setup environment variables
    process.env.JWT_SECRET = mockJwtSecret;
    process.env.REGISTRATION_OTP = mockOtp;
  });

  describe('loginService', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login successfully with valid credentials', async () => {
      mockRepository.getUserByUsernameActive.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mocktoken');

      const result = await loginService('testuser', 'password123');

      expect(result).toEqual({
        token: 'mocktoken',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
        },
      });
      expect(mockRepository.getUserByUsernameActive).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
        },
        mockJwtSecret,
        { expiresIn: '30m' }
      );
    });

    it('should throw InvalidCredentialsError when username is empty', async () => {
      await expect(loginService('', 'password123')).rejects.toThrow(InvalidCredentialsError);
      expect(mockRepository.getUserByUsernameActive).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when password is empty', async () => {
      await expect(loginService('testuser', '')).rejects.toThrow(InvalidCredentialsError);
      expect(mockRepository.getUserByUsernameActive).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when user not found', async () => {
      mockRepository.getUserByUsernameActive.mockResolvedValue(null);

      await expect(loginService('testuser', 'password123')).rejects.toThrow(InvalidCredentialsError);
      expect(mockRepository.getUserByUsernameActive).toHaveBeenCalledWith('testuser');
    });

    it('should throw InactiveUserError when user is inactive', async () => {
      mockRepository.getUserByUsernameActive.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(loginService('testuser', 'password123')).rejects.toThrow(InactiveUserError);
      expect(mockRepository.getUserByUsernameActive).toHaveBeenCalledWith('testuser');
    });

    it('should throw InvalidCredentialsError when password is incorrect', async () => {
      mockRepository.getUserByUsernameActive.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(loginService('testuser', 'wrongpassword')).rejects.toThrow(InvalidCredentialsError);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
    });
  });

  describe('registerService', () => {
    const mockNewUser = {
      id: 1,
      username: 'newuser',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register successfully with valid data', async () => {
      mockRepository.getUserByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockRepository.createUser.mockResolvedValue(mockNewUser);

      const result = await registerService('newuser', 'password123', mockOtp);

      expect(result).toEqual({
        id: mockNewUser.id,
        username: mockNewUser.username,
        role: mockNewUser.role,
      });
      expect(mockRepository.getUserByUsername).toHaveBeenCalledWith('newuser');
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockRepository.createUser).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword',
        role: UserRole.ADMIN,
        isActive: true,
      });
    });

    it('should throw AuthenticationError when required fields are missing', async () => {
      await expect(registerService('', 'password123', mockOtp)).rejects.toThrow(AuthenticationError);
      await expect(registerService('newuser', '', mockOtp)).rejects.toThrow(AuthenticationError);
      await expect(registerService('newuser', 'password123', '')).rejects.toThrow(AuthenticationError);
    });

    it('should throw InvalidOTPError when OTP is incorrect', async () => {
      await expect(registerService('newuser', 'password123', 'wrong-otp')).rejects.toThrow(InvalidOTPError);
    });

    it('should throw UserExistsError when username already exists', async () => {
      mockRepository.getUserByUsername.mockResolvedValue(mockNewUser);

      await expect(registerService('newuser', 'password123', mockOtp)).rejects.toThrow(UserExistsError);
      expect(mockRepository.getUserByUsername).toHaveBeenCalledWith('newuser');
      expect(mockRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('getUserByIdService', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user when found and active', async () => {
      mockRepository.getUserById.mockResolvedValue(mockUser);

      const result = await getUserByIdService(1);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
      expect(mockRepository.getUserById).toHaveBeenCalledWith(1);
    });

    it('should throw UserNotFoundError when user not found', async () => {
      mockRepository.getUserById.mockResolvedValue(null);

      await expect(getUserByIdService(1)).rejects.toThrow(UserNotFoundError);
      expect(mockRepository.getUserById).toHaveBeenCalledWith(1);
    });

    it('should throw InactiveUserError when user is inactive', async () => {
      mockRepository.getUserById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(getUserByIdService(1)).rejects.toThrow(InactiveUserError);
      expect(mockRepository.getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe('validateTokenService', () => {
    const mockPayload = {
      userId: 1,
      username: 'testuser',
      role: UserRole.ADMIN,
    };

    const mockUser = {
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate token successfully', async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockRepository.getUserById.mockResolvedValue(mockUser);

      const result = await validateTokenService('valid-token');

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', mockJwtSecret);
      expect(mockRepository.getUserById).toHaveBeenCalledWith(mockPayload.userId);
    });

    it('should throw InvalidTokenError when token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      await expect(validateTokenService('invalid-token')).rejects.toThrow(InvalidTokenError);
      expect(jwt.verify).toHaveBeenCalledWith('invalid-token', mockJwtSecret);
    });

    it('should throw InvalidTokenError when token is expired', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('expired token', new Date());
      });

      await expect(validateTokenService('expired-token')).rejects.toThrow(InvalidTokenError);
      expect(jwt.verify).toHaveBeenCalledWith('expired-token', mockJwtSecret);
    });
  });

  describe('JWT Utility Functions', () => {
    const mockPayload = {
      userId: 1,
      username: 'testuser',
      role: UserRole.ADMIN,
    };

    describe('generateJWT', () => {
      it('should generate JWT token', () => {
        (jwt.sign as jest.Mock).mockReturnValue('mocktoken');

        const token = generateJWT(mockPayload.userId, mockPayload.username, mockPayload.role);

        expect(token).toBe('mocktoken');
        expect(jwt.sign).toHaveBeenCalledWith(mockPayload, mockJwtSecret, { expiresIn: '30m' });
      });

      it('should throw error when JWT_SECRET is not configured', () => {
        process.env.JWT_SECRET = '';

        expect(() => generateJWT(mockPayload.userId, mockPayload.username, mockPayload.role))
          .toThrow('JWT_SECRET environment variable is not configured');
      });
    });

    describe('verifyJWT', () => {
      it('should verify and decode JWT token', () => {
        (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

        const decoded = verifyJWT('valid-token');

        expect(decoded).toEqual(mockPayload);
        expect(jwt.verify).toHaveBeenCalledWith('valid-token', mockJwtSecret);
      });

      it('should throw InvalidTokenError for various JWT errors', () => {
        // Test JsonWebTokenError
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new jwt.JsonWebTokenError('invalid token');
        });
        expect(() => verifyJWT('invalid-token')).toThrow(InvalidTokenError);

        // Test TokenExpiredError
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new jwt.TokenExpiredError('expired token', new Date());
        });
        expect(() => verifyJWT('expired-token')).toThrow(InvalidTokenError);

        // Test NotBeforeError
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new jwt.NotBeforeError('not before', new Date());
        });
        expect(() => verifyJWT('not-before-token')).toThrow(InvalidTokenError);
      });

      it('should throw error when JWT_SECRET is not configured', () => {
        process.env.JWT_SECRET = '';

        expect(() => verifyJWT('valid-token'))
          .toThrow('JWT_SECRET environment variable is not configured');
      });
    });
  });

  describe('Password Utility Functions', () => {
    describe('hashPassword', () => {
      it('should hash password successfully', async () => {
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

        const result = await hashPassword('password123');

        expect(result).toBe('hashedpassword');
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      });
    });

    describe('comparePassword', () => {
      it('should return true for matching password', async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await comparePassword('password123', 'hashedpassword');

        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      });

      it('should return false for non-matching password', async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await comparePassword('wrongpassword', 'hashedpassword');

        expect(result).toBe(false);
        expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
      });
    });
  });
}); 