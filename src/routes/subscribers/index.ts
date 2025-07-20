import { FastifyInstance } from 'fastify';
import {
  getAllSubscribersController,
  getSubscriberByIdController,
  getSubscriberByPhoneController,
  createSubscriberController,
  updateSubscriberController
} from '../../controllers/subscribers';

export default async function subscriberRoutes(fastify: FastifyInstance) {
  fastify.get('/api/subscribers', getAllSubscribersController);
  fastify.get('/api/subscribers/:id', getSubscriberByIdController);
  fastify.get('/api/subscribers/phone', getSubscriberByPhoneController);
  fastify.post('/api/subscribers', createSubscriberController);
  fastify.put('/api/subscribers/:id', updateSubscriberController);
} 