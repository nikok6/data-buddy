import { FastifyPluginAsync } from 'fastify';
import { getPlansController, createPlanController, updatePlanController } from '../../controllers/plans';
import { authMiddleware, adminMiddleware } from '../../middleware';

const plansRoutes: FastifyPluginAsync = async (fastify) => {
  // All plans endpoints require admin authentication
  fastify.get('/api/plans', {
    preHandler: [authMiddleware, adminMiddleware]
  }, getPlansController);
  
  fastify.post('/api/plans', {
    preHandler: [authMiddleware, adminMiddleware]
  }, createPlanController);
  
  fastify.put('/api/plans/:id', {
    preHandler: [authMiddleware, adminMiddleware]
  }, updatePlanController);
};

export default plansRoutes; 