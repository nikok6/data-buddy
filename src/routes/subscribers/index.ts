import { FastifyInstance } from 'fastify';
import {
  getAllSubscribersController,
  getSubscriberByIdController,
  getSubscriberByPhoneController,
  createSubscriberController,
  updateSubscriberController
} from '../../controllers/subscribers';
import { authMiddleware, adminMiddleware } from '../../middleware';

export default async function subscriberRoutes(fastify: FastifyInstance) {
  // All subscriber endpoints require admin authentication
  fastify.get('/api/subscribers', {
    preHandler: [authMiddleware, adminMiddleware]
  }, getAllSubscribersController);
  
  fastify.get('/api/subscribers/:id', {
    preHandler: [authMiddleware, adminMiddleware]
  }, getSubscriberByIdController);
  
  fastify.get('/api/subscribers/phone', {
    preHandler: [authMiddleware, adminMiddleware]
  }, getSubscriberByPhoneController);
  
  fastify.post('/api/subscribers', {
    preHandler: [authMiddleware, adminMiddleware]
  }, createSubscriberController);
  
  fastify.put('/api/subscribers/:id', {
    preHandler: [authMiddleware, adminMiddleware]
  }, updateSubscriberController);
} 