import { DataPlan } from '../../types';
import { PlanRepository } from '../../repositories/plan-repository';

let planRepository: PlanRepository = new PlanRepository();

export const initializeRepository = (repo: PlanRepository) => {
  planRepository = repo;
};

export const getPlansService = async (provider?: string) => {
  return planRepository.findAll(provider);
};

export const createPlanService = async (plan: DataPlan) => {
  return planRepository.create(plan);
};

export const updatePlanService = async (id: number, plan: DataPlan) => {
  return planRepository.update(id, plan);
}; 