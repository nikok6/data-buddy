import { SubscriberRepository } from '../../repositories/subscriber';
import {
  getAllSubscribersService,
  getSubscriberByIdService,
  getSubscriberByPhoneService,
  createSubscriberService,
  updateSubscriberService,
  initializeRepository
} from '../../services/subscribers';
import { SubscriberNotFoundError, InvalidPhoneNumberError, SubscriberExistsError } from '../../types';

// Mock the repository
jest.mock('../../repositories/subscriber');

describe('Subscriber Services', () => {
  let mockRepository: jest.Mocked<SubscriberRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockRepository = new SubscriberRepository() as jest.Mocked<SubscriberRepository>;
    initializeRepository(mockRepository);
  });

  describe('getAllSubscribersService', () => {
    it('should return all subscribers', async () => {
      const mockSubscribers = [
        { id: 1, phoneNumber: '87654321', planId: 1, createdAt: new Date(), updatedAt: new Date(), plan: { id: 1, planId: '1', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } },
        { id: 2, phoneNumber: '98765432', planId: 2, createdAt: new Date(), updatedAt: new Date(), plan: { id: 2, planId: '2', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } },
      ];
      mockRepository.findAll.mockResolvedValue(mockSubscribers);

      const result = await getAllSubscribersService();
      expect(result).toEqual(mockSubscribers);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubscriberByIdService', () => {
    it('should return subscriber when found', async () => {
      const mockSubscriber = { id: 1, phoneNumber: '87654321', planId: 1, createdAt: new Date(), updatedAt: new Date(), plan: { id: 1, planId: '1', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } };
      mockRepository.findById.mockResolvedValue(mockSubscriber);

      const result = await getSubscriberByIdService(1);
      expect(result).toEqual(mockSubscriber);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw SubscriberNotFoundError when subscriber not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(getSubscriberByIdService(1)).rejects.toThrow(SubscriberNotFoundError);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('getSubscriberByPhoneService', () => {
    it('should return subscriber when found', async () => {
      const mockSubscriber = { id: 1, phoneNumber: '87654321', planId: 1, createdAt: new Date(), updatedAt: new Date(), plan: { id: 1, planId: '1', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } };
      mockRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);

      const result = await getSubscriberByPhoneService('87654321');
      expect(result).toEqual(mockSubscriber);
      expect(mockRepository.findByPhoneNumber).toHaveBeenCalledWith('87654321');
    });

    it('should throw InvalidPhoneNumberError when phone number format is invalid', async () => {
      await expect(getSubscriberByPhoneService('abc123')).rejects.toThrow(InvalidPhoneNumberError);
      expect(mockRepository.findByPhoneNumber).not.toHaveBeenCalled();
    });

    it('should throw SubscriberNotFoundError when subscriber not found', async () => {
      mockRepository.findByPhoneNumber.mockResolvedValue(null);

      await expect(getSubscriberByPhoneService('87654321')).rejects.toThrow(SubscriberNotFoundError);
      expect(mockRepository.findByPhoneNumber).toHaveBeenCalledWith('87654321');
    });
  });

  describe('createSubscriberService', () => {
    it('should create subscriber successfully', async () => {
      const mockSubscriber = { id: 1, phoneNumber: '87654321', planId: 1, createdAt: new Date(), updatedAt: new Date(), plan: { id: 1, planId: '1', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } };
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockSubscriber);

      const result = await createSubscriberService('87654321', 1);
      expect(result).toEqual(mockSubscriber);
      expect(mockRepository.exists).toHaveBeenCalledWith('87654321');
      expect(mockRepository.create).toHaveBeenCalledWith({
        phoneNumber: '87654321',
        planId: 1,
      });
    });

    it('should throw InvalidPhoneNumberError when phone number format is invalid', async () => {
      await expect(createSubscriberService('abc123', 1)).rejects.toThrow(InvalidPhoneNumberError);
      expect(mockRepository.exists).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw SubscriberExistsError when subscriber already exists', async () => {
      mockRepository.exists.mockResolvedValue(true);

      await expect(createSubscriberService('87654321', 1)).rejects.toThrow(SubscriberExistsError);
      expect(mockRepository.exists).toHaveBeenCalledWith('87654321');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSubscriberService', () => {
    it('should update subscriber successfully', async () => {
      const mockSubscriber = { id: 1, phoneNumber: '87654321', planId: 2, createdAt: new Date(), updatedAt: new Date(), plan: { id: 2, planId: '2', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } };
      mockRepository.update.mockResolvedValue(mockSubscriber);

      const result = await updateSubscriberService(1, { planId: 2 });
      expect(result).toEqual(mockSubscriber);
      expect(mockRepository.update).toHaveBeenCalledWith(1, { planId: 2 });
    });

    it('should throw InvalidPhoneNumberError when phone number format is invalid', async () => {
      await expect(updateSubscriberService(1, { phoneNumber: 'abc123' })).rejects.toThrow(InvalidPhoneNumberError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw SubscriberNotFoundError when subscriber not found', async () => {
      mockRepository.update.mockRejectedValue(new Error('Record to update not found'));

      await expect(updateSubscriberService(1, { planId: 2 })).rejects.toThrow(SubscriberNotFoundError);
      expect(mockRepository.update).toHaveBeenCalledWith(1, { planId: 2 });
    });
  });
}); 