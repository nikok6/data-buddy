import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getAllSubscribersService,
  getSubscriberByIdService,
  getSubscriberByPhoneService,
  createSubscriberService,
  updateSubscriberService
} from '../../services/subscribers';
import { ApiResponse, UpdateSubscriberBody, SubscriberNotFoundError, InvalidPhoneNumberError, SubscriberExistsError } from '../../types';

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
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { id } = request.params as { id: string };
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid ID format'
    };
    return reply.status(400).send(response);
  }

  try {
    const subscriber = await getSubscriberByIdService(parsedId);
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
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { phoneNumber } = request.query as { phoneNumber?: string };
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
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { phoneNumber, planId } = request.body as { phoneNumber: string; planId: number };

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
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { id } = request.params as { id: string };
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid ID format'
    };
    return reply.status(400).send(response);
  }

  try {
    const updateData = request.body as UpdateSubscriberBody;
    const updatedSubscriber = await updateSubscriberService(parsedId, updateData);
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