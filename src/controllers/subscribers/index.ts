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
import { ApiResponse } from '../../types';

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
    const response: ApiResponse<typeof subscribers> = {
      success: true,
      data: subscribers
    };
    return reply.send(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
};

export const getSubscriberByIdController = async (
  request: FastifyRequest<{ Params: GetSubscriberParams }>,
  reply: FastifyReply
) => {
  const id = parseInt(request.params.id);
  if (isNaN(id)) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid ID format'
    };
    return reply.status(400).send(response);
  }

  try {
    const subscriber = await getSubscriberByIdService(id);
    const response: ApiResponse<typeof subscriber> = {
      success: true,
      data: subscriber
    };
    return reply.send(response);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(404).send(response);
    }
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
};

export const getSubscriberByPhoneController = async (
  request: FastifyRequest<{ Querystring: GetSubscriberByPhoneQuery }>,
  reply: FastifyReply
) => {
  const { phoneNumber } = request.query;
  if (!phoneNumber) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Phone number is required'
    };
    return reply.status(400).send(response);
  }

  try {
    const subscriber = await getSubscriberByPhoneService(phoneNumber);
    const response: ApiResponse<typeof subscriber> = {
      success: true,
      data: subscriber
    };
    return reply.send(response);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(404).send(response);
    }
    if (error instanceof InvalidPhoneNumberError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(400).send(response);
    }
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
};

export const createSubscriberController = async (
  request: FastifyRequest<{ Body: CreateSubscriberBody }>,
  reply: FastifyReply
) => {
  const { phoneNumber, planId } = request.body;

  try {
    const subscriber = await createSubscriberService(phoneNumber, planId);
    const response: ApiResponse<typeof subscriber> = {
      success: true,
      data: subscriber
    };
    return reply.status(201).send(response);
  } catch (error) {
    if (error instanceof InvalidPhoneNumberError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(400).send(response);
    }
    if (error instanceof SubscriberExistsError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(409).send(response);
    }
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
};

export const updateSubscriberController = async (
  request: FastifyRequest<{ Params: GetSubscriberParams; Body: UpdateSubscriberBody }>,
  reply: FastifyReply
) => {
  const id = parseInt(request.params.id);
  if (isNaN(id)) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid ID format'
    };
    return reply.status(400).send(response);
  }

  try {
    const updatedSubscriber = await updateSubscriberService(id, request.body);
    const response: ApiResponse<typeof updatedSubscriber> = {
      success: true,
      data: updatedSubscriber
    };
    return reply.send(response);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(404).send(response);
    }
    if (error instanceof InvalidPhoneNumberError) {
      const response: ApiResponse<never> = {
        success: false,
        error: error.message
      };
      return reply.status(400).send(response);
    }
    const response: ApiResponse<never> = {
      success: false,
      error: 'Internal server error'
    };
    return reply.status(500).send(response);
  }
}; 