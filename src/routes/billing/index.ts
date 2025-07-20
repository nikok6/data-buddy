import { FastifyInstance } from 'fastify';
import { getBillingReportController } from '../../controllers/billing';
import { authMiddleware, adminMiddleware } from '../../middleware';

export default async function (fastify: FastifyInstance) {
  // Billing endpoint requires admin authentication
  fastify.get('/api/billing/:phoneNumber', {
    preHandler: [authMiddleware, adminMiddleware]
  }, getBillingReportController);
}