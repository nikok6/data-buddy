import { FastifyInstance } from 'fastify';
import {
  getAllSubscribersController,
  getSubscriberByIdController,
  getSubscriberByPhoneController,
  createSubscriberController,
  updateSubscriberController
} from '../../controllers/subscribers';

export default async function subscriberRoutes(fastify: FastifyInstance) {
  fastify.get('/subscribers', getAllSubscribersController);
  fastify.get('/subscribers/:id', getSubscriberByIdController);
  fastify.get('/subscribers/phone', getSubscriberByPhoneController);
  fastify.post('/subscribers', createSubscriberController);
  fastify.put('/subscribers/:id', updateSubscriberController);
} 