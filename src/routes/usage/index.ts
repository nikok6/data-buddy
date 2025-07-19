import { FastifyInstance } from 'fastify';
import { getUsageController, createUsageController } from '../../controllers/usage';

export default async function usageRoutes(fastify: FastifyInstance) {
  fastify.get('/usage', getUsageController);
  fastify.post('/usage', createUsageController);
} 