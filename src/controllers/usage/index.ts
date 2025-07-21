import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getUsageByPhoneNumberService,
  getUsageByPhoneNumberAndDateRangeService,
  createUsageService,
  SubscriberNotFoundError,
  InvalidPhoneNumberError,
  InvalidUsageError
} from '../../services/usage';
import { ApiResponse } from '../../types';

export const getUsageController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { phoneNumber, startDate, endDate } = request.query as { phoneNumber?: string; startDate?: string; endDate?: string };

  if (!phoneNumber) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Phone number is required'
    };
    return reply.status(400).send(response);
  }

  try {
    // If both dates are provided, use date range search
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid date format'
        };
        return reply.status(400).send(response);
      }

      const usages = await getUsageByPhoneNumberAndDateRangeService(phoneNumber, start, end);
      const response: ApiResponse<typeof usages> = {
        success: true,
        data: usages
      };
      return reply.send(response);
    }

    // Otherwise, get all usage for the phone number
    const usages = await getUsageByPhoneNumberService(phoneNumber);
    const response: ApiResponse<typeof usages> = {
      success: true,
      data: usages
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
    if (error instanceof InvalidUsageError) {
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

export const createUsageController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { phoneNumber, date, usageInMB } = request.body as { phoneNumber: string; date: string; usageInMB: number };

  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid date format'
      };
      return reply.status(400).send(response);
    }

    const usage = await createUsageService(phoneNumber, parsedDate, usageInMB);
    const response: ApiResponse<typeof usage> = {
      success: true,
      data: usage
    };
    return reply.status(201).send(response);
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
    if (error instanceof InvalidUsageError) {
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