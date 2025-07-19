import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getUsageByPhoneNumberService,
  getUsageByPhoneNumberAndDateRangeService,
  createUsageService,
  SubscriberNotFoundError,
  InvalidPhoneNumberError,
  InvalidUsageError
} from '../../services/usage';

interface GetUsageQuery {
  phoneNumber: string;
  startDate?: string;
  endDate?: string;
}

interface CreateUsageBody {
  phoneNumber: string;
  date: string;
  usageInMB: number;
}

export const getUsageController = async (
  request: FastifyRequest<{ Querystring: GetUsageQuery }>,
  reply: FastifyReply
) => {
  const { phoneNumber, startDate, endDate } = request.query;

  if (!phoneNumber) {
    return reply.status(400).send({ error: 'Phone number is required' });
  }

  try {
    // If both dates are provided, use date range search
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return reply.status(400).send({ error: 'Invalid date format' });
      }

      const usages = await getUsageByPhoneNumberAndDateRangeService(phoneNumber, start, end);
      return reply.send(usages);
    }

    // Otherwise, get all usage for the phone number
    const usages = await getUsageByPhoneNumberService(phoneNumber);
    return reply.send(usages);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof InvalidPhoneNumberError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof InvalidUsageError) {
      return reply.status(400).send({ error: error.message });
    }
    console.error('Error getting usage:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const createUsageController = async (
  request: FastifyRequest<{ Body: CreateUsageBody }>,
  reply: FastifyReply
) => {
  const { phoneNumber, date, usageInMB } = request.body;

  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid date format' });
    }

    const usage = await createUsageService(phoneNumber, parsedDate, usageInMB);
    return reply.status(201).send(usage);
  } catch (error) {
    if (error instanceof SubscriberNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof InvalidPhoneNumberError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof InvalidUsageError) {
      return reply.status(400).send({ error: error.message });
    }
    console.error('Error creating usage:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}; 