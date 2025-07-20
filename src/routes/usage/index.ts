import { FastifyInstance } from 'fastify';
import { getUsageController, createUsageController } from '../../controllers/usage';

export default async function usageRoutes(fastify: FastifyInstance) {
  fastify.get('/api/usage', getUsageController);
  fastify.post('/api/usage', createUsageController);
} 