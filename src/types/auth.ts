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

// Extend Fastify Request to include user context
import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  export interface FastifyRequest {
    user?: AuthenticatedUser;
  }
} 