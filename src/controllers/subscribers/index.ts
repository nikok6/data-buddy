import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getAllSubscribersService,
  getSubscriberByIdService,
  getSubscriberByPhoneService,
  createSubscriberService,
  updateSubscriberService,
  SubscriberNotFoundError,
  InvalidPhoneNumberError,
  SubscriberExistsError
} from '../../services/subscribers';

interface CreateSubscriberBody {
  phoneNumber: string;
  planId: number;
}

interface UpdateSubscriberBody {
  phoneNumber?: string;
  planId?: number;
}

interface GetSubscriberParams {
  id: string;
}

interface GetSubscriberByPhoneQuery {
  phoneNumber: string;
}

export const getAllSubscribersController = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const subscribers = await getAllSubscribersService();
    return reply.send(subscribers);
  } catch (error) {
    console.error('Error getting all subscribers:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const getSubscriberByIdController = async (
  request: FastifyRequest<{ Params: GetSubscriberParams }>,
  reply: FastifyReply
) => {
  const id = parseInt(request.params.id);
  if (isNaN(id)) {
    return reply.status(400).send({ error: 'Invalid ID format' });
  }

  try {
    const subscriber = await getSubscriberByIdService(id);
    return reply.send(subscriber);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    console.error('Error getting subscriber by ID:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const getSubscriberByPhoneController = async (
  request: FastifyRequest<{ Querystring: GetSubscriberByPhoneQuery }>,
  reply: FastifyReply
) => {
  const { phoneNumber } = request.query;
  if (!phoneNumber) {
    return reply.status(400).send({ error: 'Phone number is required' });
  }

  try {
    const subscriber = await getSubscriberByPhoneService(phoneNumber);
    return reply.send(subscriber);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof InvalidPhoneNumberError) {
      return reply.status(400).send({ error: error.message });
    }
    console.error('Error getting subscriber by phone:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const createSubscriberController = async (
  request: FastifyRequest<{ Body: CreateSubscriberBody }>,
  reply: FastifyReply
) => {
  const { phoneNumber, planId } = request.body;

  try {
    const subscriber = await createSubscriberService(phoneNumber, planId);
    return reply.status(201).send(subscriber);
  } catch (error) {
    if (error instanceof InvalidPhoneNumberError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof SubscriberExistsError) {
      return reply.status(409).send({ error: error.message });
    }
    console.error('Error creating subscriber:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const updateSubscriberController = async (
  request: FastifyRequest<{ Params: GetSubscriberParams; Body: UpdateSubscriberBody }>,
  reply: FastifyReply
) => {
  const id = parseInt(request.params.id);
  if (isNaN(id)) {
    return reply.status(400).send({ error: 'Invalid ID format' });
  }

  try {
    const updatedSubscriber = await updateSubscriberService(id, request.body);
    return reply.send(updatedSubscriber);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof InvalidPhoneNumberError) {
      return reply.status(400).send({ error: error.message });
    }
    console.error('Error updating subscriber:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}; 