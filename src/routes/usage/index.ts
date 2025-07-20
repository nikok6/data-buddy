import { FastifyInstance } from 'fastify';
import { getUsageController, createUsageController } from '../../controllers/usage';
import { authMiddleware, adminMiddleware } from '../../middleware';

export default async function usageRoutes(fastify: FastifyInstance) {
  // All usage endpoints require admin authentication
  fastify.get('/api/usage', {
    preHandler: [authMiddleware, adminMiddleware]
  }, getUsageController);
  
  fastify.post('/api/usage', {
    preHandler: [authMiddleware, adminMiddleware]
  }, createUsageController);
} 