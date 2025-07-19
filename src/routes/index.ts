import { FastifyInstance } from 'fastify';
import plansRoutes from './plans';
import importCsvRoutes from './import-csv';
import billingRoutes from './billing';

export default async function (fastify: FastifyInstance) {
  fastify.register(plansRoutes);
  fastify.register(importCsvRoutes);
  fastify.register(billingRoutes);
}