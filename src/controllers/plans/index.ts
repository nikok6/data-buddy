import { FastifyRequest, FastifyReply } from 'fastify';
import { getPlansService, createPlanService, updatePlanService } from '../../services/plans';
import { ApiResponse, DataPlan } from '../../types';

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

export const createPlanController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const planData = request.body as DataPlan;
    const newPlan = await createPlanService(planData);
    
    const response: ApiResponse<typeof newPlan> = {
      success: true,
      data: newPlan,
    };

    return reply.status(201).send(response);
  } catch (error) {
    console.error('Error creating plan:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create plan'
    };
    return reply.status(500).send(response);
  }
};

export const updatePlanController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const planData = request.body as DataPlan;
    
    const updatedPlan = await updatePlanService(parseInt(id, 10), planData);
    
    const response: ApiResponse<typeof updatedPlan> = {
      success: true,
      data: updatedPlan,
    };

    return reply.send(response);
  } catch (error) {
    console.error('Error updating plan:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update plan'
    };
    return reply.status(500).send(response);
  }
}; 