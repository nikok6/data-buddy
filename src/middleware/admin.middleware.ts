import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, ApiResponse } from '../types';

export const adminMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  // This middleware assumes authMiddleware has already run and populated request.user
  if (!request.user) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Authentication required'
    };
    return reply.status(401).send(response);
  }

  // Check if user has admin role
  if (request.user.role !== UserRole.ADMIN) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Admin access required'
    };
    return reply.status(403).send(response);
  }
}; 