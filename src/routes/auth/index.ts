import { FastifyInstance } from 'fastify';
import {
  loginController,
  registerController,
  getMeController
} from '../../controllers/auth';
import { authMiddleware } from '../../middleware/auth.middleware';

export default async function authRoutes(fastify: FastifyInstance) {
  // Public endpoints (no authentication required)
  fastify.post('/api/auth/login', loginController);
  fastify.post('/api/auth/register', registerController);

  // Protected endpoints (authentication required)
  fastify.get('/api/auth/me', {
    preHandler: authMiddleware
  }, getMeController);
} 