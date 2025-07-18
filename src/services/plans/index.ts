import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPlansService = async (provider?: string) => {
  const plans = await prisma.dataPlan.findMany({
    where: provider ? {
      provider: provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()
    } : undefined,
    orderBy: {
      planId: 'asc'
    }
  });

  return plans;
}; 