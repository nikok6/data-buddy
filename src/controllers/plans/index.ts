import { FastifyRequest, FastifyReply } from 'fastify';
import { getPlansService } from '../../services/plans';
import { ApiResponse } from '../../types';

export const getPlansController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { provider } = request.query as { provider?: string };
    
    const plans = await getPlansService(provider);
    
    const response: ApiResponse<typeof plans> = {
      success: true,
      data: plans,
    };

    return reply.send(response);
  } catch (error) {
    console.error('Error fetching plans:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch plans'
    };
    return reply.status(500).send(response);
  }
}; 