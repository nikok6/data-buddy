import { FastifyPluginAsync } from 'fastify';
import { importCsvController } from '../../controllers/import-csv';
import fastifyMultipart from '@fastify/multipart';
import { authMiddleware, adminMiddleware } from '../../middleware';

const importCsvRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart plugin for file upload
  await fastify.register(fastifyMultipart);

  // Import CSV endpoint requires admin authentication
  fastify.post('/api/import-csv', {
    preHandler: [authMiddleware, adminMiddleware]
  }, importCsvController);
};

export default importCsvRoutes; 