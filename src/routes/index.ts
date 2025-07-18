import { FastifyPluginAsync } from 'fastify';
import importCsvRoutes from './import-csv';
import plansRoutes from './plans';

const routes: FastifyPluginAsync = async (fastify) => {
  // Register import-csv routes
  await fastify.register(importCsvRoutes);

  // Register plans routes
  await fastify.register(plansRoutes);
};

export default routes;