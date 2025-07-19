import { FastifyInstance } from 'fastify';
import { getBillingReportController } from '../../controllers/billing';

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/billing/:phoneNumber', getBillingReportController);
}