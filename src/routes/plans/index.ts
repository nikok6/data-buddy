import { FastifyPluginAsync } from 'fastify';
import { ApiResponse } from '../../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plansRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/plans', async (request, _reply) => {
    const { provider } = request.query as { provider?: string };
    
    const plans = await prisma.dataPlan.findMany({
      where: provider ? {
        provider: provider
      } : undefined,
      orderBy: {
        planId: 'asc'
      }
    });

    const res: ApiResponse<typeof plans> = {
      success: true,
      data: plans,
    };

    return res;
  });
};

export default plansRoutes; 