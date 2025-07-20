import { FastifyRequest, FastifyReply } from 'fastify';
import {
  loginService,
  registerService,
  getUserByIdService,
  InvalidCredentialsError,
  UserExistsError,
  UserNotFoundError,
  InactiveUserError,
  InvalidOTPError,
  AuthenticationError
} from '../../services/auth';
import { ApiResponse, LoginRequest, RegisterRequest } from '../../types';

export const loginController = async (
  request: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply
) => {
  try {
    const { username, password } = request.body;

    // Validate required fields
    if (!username || !password) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Username and password are required'
      };
      return reply.status(400).send(response);
    }

    // Attempt login
    const result = await loginService(username, password);
    
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    };

    return reply.send(response);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(401).send(response);
    }

    if (error instanceof InactiveUserError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(403).send(response);
    }

    console.error('Login error:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
};

export const registerController = async (
  request: FastifyRequest<{ Body: RegisterRequest }>,
  reply: FastifyReply
) => {
  try {
    const { username, password, otp } = request.body;

    // Validate required fields
    if (!username || !password || !otp) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Username, password, and OTP are required'
      };
      return reply.status(400).send(response);
    }

    // Attempt registration
    const user = await registerService(username, password, otp);
    
    const response: ApiResponse<typeof user> = {
      success: true,
      data: user
    };

    return reply.status(201).send(response);
  } catch (error) {
    if (error instanceof InvalidOTPError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(400).send(response);
    }

    if (error instanceof UserExistsError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(409).send(response);
    }

    if (error instanceof AuthenticationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(400).send(response);
    }

    console.error('Registration error:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
};

export const getMeController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // The authMiddleware should have populated request.user
    if (!request.user) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Authentication required'
      };
      return reply.status(401).send(response);
    }

    // Get fresh user data from database
    const user = await getUserByIdService(request.user.id);
    
    const response: ApiResponse<typeof user> = {
      success: true,
      data: user
    };

    return reply.send(response);
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(404).send(response);
    }

    if (error instanceof InactiveUserError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(403).send(response);
    }

    console.error('Get me error:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
}; 