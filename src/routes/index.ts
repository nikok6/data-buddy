import { FastifyInstance } from 'fastify';
import plansRoutes from './plans';
import billingRoutes from './billing';
import importCsvRoutes from './import-csv';
import subscriberRoutes from './subscribers';
import usageRoutes from './usage';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(plansRoutes);
  fastify.register(billingRoutes);
  fastify.register(importCsvRoutes);
  fastify.register(subscriberRoutes);
  fastify.register(usageRoutes);
}