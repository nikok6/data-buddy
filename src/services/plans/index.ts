import { PrismaClient } from '@prisma/client';
import { DataPlan } from '../../types';

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

export const createPlanService = async (plan: DataPlan) => {
  const newPlan = await prisma.dataPlan.create({
    data: {
      planId: plan.id,
      provider: plan.provider,
      name: plan.name,
      dataFreeInGB: plan.dataFreeInGB,
      billingCycleInDays: plan.billingCycleInDays,
      price: plan.price,
      excessChargePerMB: plan.excessChargePerMB
    }
  });

  return newPlan;
};

export const updatePlanService = async (id: number, plan: DataPlan) => {
  const updatedPlan = await prisma.dataPlan.update({
    where: { id },
    data: {
      ...(plan.id && { planId: plan.id }),
      ...(plan.provider && { provider: plan.provider }),
      ...(plan.name && { name: plan.name }),
      ...(plan.dataFreeInGB !== undefined && { dataFreeInGB: plan.dataFreeInGB }),
      ...(plan.billingCycleInDays !== undefined && { billingCycleInDays: plan.billingCycleInDays }),
      ...(plan.price !== undefined && { price: plan.price }),
      ...(plan.excessChargePerMB !== undefined && { excessChargePerMB: plan.excessChargePerMB })
    }
  });

  return updatedPlan;
}; 