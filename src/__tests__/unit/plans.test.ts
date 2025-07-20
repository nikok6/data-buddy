import { PlanRepository } from '../../repositories/plan-repository';
import { getPlansService, createPlanService, updatePlanService, initializeRepository } from '../../services/plans';
import { DataPlan } from '../../types';

// Mock repository
jest.mock('../../repositories/plan-repository');

describe('Plan Service', () => {
  let mockPlanRepository: jest.Mocked<PlanRepository>;

  // Sample plan data for testing
  const samplePlan = {
    id: 2000,
    planId: 'plan_1',
    provider: 'GOMO',
    name: 'Cheap plan',
    dataFreeInGB: 10,
    billingCycleInDays: 30,
    price: 29.99,
    excessChargePerMB: 0.1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const newPlan: DataPlan = {
    id: 'plan_4',
    provider: 'M1',
    name: 'Expensive plan',
    dataFreeInGB: 1,
    billingCycleInDays: 30,
    price: 29.99,
    excessChargePerMB: 0.1
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create new instance of mocked repository
    mockPlanRepository = new PlanRepository() as jest.Mocked<PlanRepository>;
    
    // Initialize the service with mocked repository
    initializeRepository(mockPlanRepository);
  });

  describe('getPlansService', () => {
    it('should return all plans when no provider is specified', async () => {
      const mockPlans = [
        { ...samplePlan },
        { ...samplePlan, id: 2001, planId: 'plan_2', provider: 'GOMO'}
      ];

      mockPlanRepository.findAll.mockResolvedValue(mockPlans);

      const result = await getPlansService();

      expect(result).toEqual(mockPlans);
      expect(mockPlanRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should return plans filtered by provider', async () => {
      const provider = 'GOMO';
      const mockPlans = [samplePlan];

      mockPlanRepository.findAll.mockResolvedValue(mockPlans);

      const result = await getPlansService(provider);

      expect(result).toEqual(mockPlans);
      expect(mockPlanRepository.findAll).toHaveBeenCalledWith(provider);
    });

    it('should return empty array when no plans found', async () => {
      mockPlanRepository.findAll.mockResolvedValue([]);

      const result = await getPlansService();

      expect(result).toEqual([]);
      expect(mockPlanRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('createPlanService', () => {
    it('should create a new plan successfully', async () => {
      const createdPlan = { ...samplePlan, id: 2002 };
      mockPlanRepository.create.mockResolvedValue(createdPlan);

      const result = await createPlanService(newPlan);

      expect(result).toEqual(createdPlan);
      expect(mockPlanRepository.create).toHaveBeenCalledWith(newPlan);
    });

    it('should pass through any errors from repository', async () => {
      const error = new Error('Failed to create plan');
      mockPlanRepository.create.mockRejectedValue(error);

      await expect(createPlanService(newPlan)).rejects.toThrow('Failed to create plan');
      expect(mockPlanRepository.create).toHaveBeenCalledWith(newPlan);
    });
  });

  describe('updatePlanService', () => {
    it('should update an existing plan successfully', async () => {
      const planId = 1;
      const updatedPlan = { ...samplePlan, price: 99.99 };
      mockPlanRepository.update.mockResolvedValue(updatedPlan);

      const result = await updatePlanService(planId, newPlan);

      expect(result).toEqual(updatedPlan);
      expect(mockPlanRepository.update).toHaveBeenCalledWith(planId, newPlan);
    });

    it('should pass through any errors from repository', async () => {
      const planId = 999;
      const error = new Error('Plan not found');
      mockPlanRepository.update.mockRejectedValue(error);

      await expect(updatePlanService(planId, newPlan)).rejects.toThrow('Plan not found');
      expect(mockPlanRepository.update).toHaveBeenCalledWith(planId, newPlan);
    });
  });
}); 