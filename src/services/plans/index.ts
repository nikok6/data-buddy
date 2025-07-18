import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPlansService = async (provider?: string) => {
  const plans = await prisma.dataPlan.findMany({
    where: provider ? {
      provider: provider
    } : undefined,
    orderBy: {
      planId: 'asc'
    }
  });

  return plans;
}; 