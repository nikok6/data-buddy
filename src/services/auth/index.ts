import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../../repositories/auth';
import { UserRole, JWTPayload, AuthenticatedUser, AuthenticationError, InvalidCredentialsError, UserNotFoundError, InactiveUserError, InvalidOTPError, InvalidTokenError, UserExistsError } from '../../types';

// Initialize with default repository
let authRepository: AuthRepository = new AuthRepository();

export const initializeRepository = (repo: AuthRepository) => {
  authRepository = repo;
};

// Utility Functions
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJWT = (userId: number, username: string, role: UserRole): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const payload: JWTPayload = {
    userId,
    username,
    role,
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: '30m', // 30 minutes
    algorithm: 'HS256'
  });
};

export const verifyJWT = (token: string): JWTPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new InvalidTokenError('Invalid token format');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new InvalidTokenError('Token has expired');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new InvalidTokenError('Token not active yet');
    }
    throw new InvalidTokenError('Token verification failed');
  }
};

// Service Functions
export const loginService = async (username: string, password: string): Promise<{
  token: string;
  user: AuthenticatedUser;
}> => {
  // Validate input
  if (!username || !password) {
    throw new InvalidCredentialsError();
  }

  // Get user from database
  const user = await authRepository.getUserByUsernameActive(username);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  // Check if user is active
  if (!user.isActive) {
    throw new InactiveUserError(username);
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new InvalidCredentialsError();
  }

  // Generate JWT token
  const token = generateJWT(user.id, user.username, user.role as UserRole);

  // Return token and user info (without password)
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
    },
  };
};

export const registerService = async (
  username: string,
  password: string,
  otp: string
): Promise<AuthenticatedUser> => {
  // Validate input
  if (!username || !password || !otp) {
    throw new AuthenticationError('Username, password, and OTP are required');
  }

  // Validate OTP
  const validOTP = process.env.REGISTRATION_OTP || '1234';
  if (otp !== validOTP) {
    throw new InvalidOTPError();
  }

  // Check if user already exists
  const existingUser = await authRepository.getUserByUsername(username);
  if (existingUser) {
    throw new UserExistsError(username);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const newUser = await authRepository.createUser({
    username,
    password: hashedPassword,
    role: UserRole.ADMIN, // For now, all users are admin
    isActive: true,
  });

  // Return user info (without password)
  return {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role as UserRole,
  };
};

export const getUserByIdService = async (userId: number): Promise<AuthenticatedUser> => {
  const user = await authRepository.getUserById(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }

  if (!user.isActive) {
    throw new InactiveUserError(user.username);
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role as UserRole,
  };
};

export const validateTokenService = async (token: string): Promise<AuthenticatedUser> => {
  // Verify JWT token
  const payload = verifyJWT(token);

  // Get user from database to ensure they still exist and are active
  const user = await getUserByIdService(payload.userId);

  return user;
}; 