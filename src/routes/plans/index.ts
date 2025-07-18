import { FastifyPluginAsync } from 'fastify';
import { getPlansController } from '../../controllers/plans';

const plansRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/plans', getPlansController);
};

export default plansRoutes; 