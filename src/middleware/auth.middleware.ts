import { FastifyRequest, FastifyReply } from 'fastify';
import { validateTokenService, InvalidTokenError, UserNotFoundError, InactiveUserError } from '../services/auth';
import { ApiResponse } from '../types';

export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Authorization header is required'
      };
      return reply.status(401).send(response);
    }

    // Check if token follows Bearer format
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid authorization header format. Use: Bearer <token>'
      };
      return reply.status(401).send(response);
    }

    const token = tokenMatch[1];

    // Validate token and get user
    const user = await validateTokenService(token);
    
    // Add user to request context
    request.user = user;
    
  } catch (error) {
    let errorMessage = 'Authentication failed';
    
    if (error instanceof InvalidTokenError) {
      errorMessage = error.message;
    } else if (error instanceof UserNotFoundError) {
      errorMessage = 'User account not found';
    } else if (error instanceof InactiveUserError) {
      errorMessage = 'User account is inactive';
    }

    const response: ApiResponse<never> = {
      success: false,
      error: errorMessage
    };
    
    return reply.status(401).send(response);
  }
}; 