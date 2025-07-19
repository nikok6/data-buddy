import { FastifyRequest, FastifyReply } from 'fastify';
import { getBillingReportService, SubscriberNotFoundError } from '../../services/billing';
import { ApiResponse } from '../../types';

interface BillingReportParams {
  phoneNumber: string;
}

export const getBillingReportController = async (
  request: FastifyRequest<{ Params: BillingReportParams }>,
  reply: FastifyReply
) => {
  try {
    const { phoneNumber } = request.params;

    // Validate phone number format
    if (!phoneNumber?.match(/^\d+$/)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid phone number format'
      };
      return reply.status(400).send(response);
    }

    const billingReport = await getBillingReportService(phoneNumber);
    
    const response: ApiResponse<typeof billingReport> = {
      success: true,
      data: billingReport
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
      error: 'Failed to generate billing report'
    };
    return reply.status(500).send(response);
  }
}; 