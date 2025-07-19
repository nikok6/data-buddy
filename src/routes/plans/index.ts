import { FastifyPluginAsync } from 'fastify';
import { getPlansController, createPlanController, updatePlanController } from '../../controllers/plans';

const plansRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/plans', getPlansController);
  fastify.post('/api/plans', createPlanController);
  fastify.put('/api/plans/:id', updatePlanController);
};

export default plansRoutes; 