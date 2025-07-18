import { FastifyPluginAsync } from 'fastify';
import { importCsvController } from '../../controllers/import-csv';
import fastifyMultipart from '@fastify/multipart';

const importCsvRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart plugin for file upload
  await fastify.register(fastifyMultipart);

  fastify.post('/api/import-csv', importCsvController);
};

export default importCsvRoutes; 