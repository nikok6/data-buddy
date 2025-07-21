export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface RegisterRequest {
  username: string;
  password: string;
  otp: string;
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid username or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserNotFoundError extends Error {
  constructor(identifier: string | number) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

export class UserExistsError extends Error {
  constructor(username: string) {
    super(`User already exists with username: ${username}`);
    this.name = 'UserExistsError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class InvalidOTPError extends Error {
  constructor() {
    super('Invalid OTP provided');
    this.name = 'InvalidOTPError';
  }
}

export class InactiveUserError extends Error {
  constructor(username: string) {
    super(`User account is inactive: ${username}`);
    this.name = 'InactiveUserError';
  }
}

declare module 'fastify' {
  export interface FastifyRequest {
    user?: AuthenticatedUser;
  }
} 