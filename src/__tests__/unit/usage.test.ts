import { UsageRepository } from '../../repositories/usage-repository';
import { SubscriberRepository } from '../../repositories/subscriber-repository';
import {
  getUsageByPhoneNumberService,
  getUsageByPhoneNumberAndDateRangeService,
  createUsageService,
  initializeRepository,
} from '../../services/usage';
import { SubscriberNotFoundError, InvalidPhoneNumberError, InvalidUsageError } from '../../types';

// Mock repositories
jest.mock('../../repositories/usage-repository');
jest.mock('../../repositories/subscriber-repository');

describe('Usage Service', () => {
  let mockUsageRepository: jest.Mocked<UsageRepository>;
  let mockSubscriberRepository: jest.Mocked<SubscriberRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create new instances of mocked repositories
    mockUsageRepository = new UsageRepository() as jest.Mocked<UsageRepository>;
    mockSubscriberRepository = new SubscriberRepository() as jest.Mocked<SubscriberRepository>;
    
    // Initialize the service with mocked repositories
    initializeRepository(mockSubscriberRepository, mockUsageRepository);
  });

  describe('getUsageByPhoneNumberService', () => {
    it('should return usage data for valid phone number', async () => {
      const phoneNumber = '1234567890';
      const mockUsageData = [{ date: new Date(), usageInMB: 100 }];
      
      mockUsageRepository.findByPhoneNumber.mockResolvedValue(mockUsageData);

      const result = await getUsageByPhoneNumberService(phoneNumber);
      
      expect(result).toEqual(mockUsageData);
      expect(mockUsageRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
    });

    it('should throw InvalidPhoneNumberError for invalid phone number format', async () => {
      const invalidPhoneNumber = 'abc123';
      
      await expect(getUsageByPhoneNumberService(invalidPhoneNumber))
        .rejects
        .toThrow(InvalidPhoneNumberError);
    });

    it('should throw SubscriberNotFoundError when no usage data found', async () => {
      const phoneNumber = '1234567890';
      mockUsageRepository.findByPhoneNumber.mockResolvedValue(null);

      await expect(getUsageByPhoneNumberService(phoneNumber))
        .rejects
        .toThrow(SubscriberNotFoundError);
    });
  });

  describe('getUsageByPhoneNumberAndDateRangeService', () => {
    it('should return usage data for valid date range', async () => {
      const phoneNumber = '1234567890';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockUsageData = [
        { date: new Date('2024-01-15'), usageInMB: 100 }
      ];

      mockUsageRepository.findUsageInDateRange.mockResolvedValue(mockUsageData);

      const result = await getUsageByPhoneNumberAndDateRangeService(
        phoneNumber,
        startDate,
        endDate
      );

      expect(result).toEqual(mockUsageData);
      expect(mockUsageRepository.findUsageInDateRange).toHaveBeenCalledWith(
        phoneNumber,
        startDate,
        endDate
      );
    });

    it('should throw InvalidPhoneNumberError for invalid phone number', async () => {
      const invalidPhoneNumber = 'abc123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await expect(
        getUsageByPhoneNumberAndDateRangeService(
          invalidPhoneNumber,
          startDate,
          endDate
        )
      ).rejects.toThrow(InvalidPhoneNumberError);
    });

    it('should throw InvalidUsageError for invalid date range', async () => {
      const phoneNumber = '1234567890';
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      await expect(
        getUsageByPhoneNumberAndDateRangeService(
          phoneNumber,
          startDate,
          endDate
        )
      ).rejects.toThrow(InvalidUsageError);
    });

    it('should throw SubscriberNotFoundError when no usage data found', async () => {
      const phoneNumber = '1234567890';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockUsageRepository.findUsageInDateRange.mockResolvedValue(null);

      await expect(
        getUsageByPhoneNumberAndDateRangeService(
          phoneNumber,
          startDate,
          endDate
        )
      ).rejects.toThrow(SubscriberNotFoundError);
    });
  });

  describe('createUsageService', () => {
    it('should create usage record successfully', async () => {
      const phoneNumber = '1234567890';
      const date = new Date();
      const usageInMB = 100;
      const mockUsageData = { phoneNumber, date, usageInMB };
      
    const mockSubscriber = { id: 1, phoneNumber: '1234567890', planId: 1, createdAt: new Date(), updatedAt: new Date(), plan: { id: 1, planId: '1', provider: 'provider', name: 'name', dataFreeInGB: 100, billingCycleInDays: 30, price: 100, excessChargePerMB: 1, createdAt: new Date(), updatedAt: new Date() } };
      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.create.mockResolvedValue(mockUsageData);

      const result = await createUsageService(phoneNumber, date, usageInMB);

      expect(result).toEqual(mockUsageData);
      expect(mockSubscriberRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
      expect(mockUsageRepository.create).toHaveBeenCalledWith(phoneNumber, date, usageInMB);
    });

    it('should throw InvalidPhoneNumberError for invalid phone number', async () => {
      const invalidPhoneNumber = 'abc123';
      const date = new Date();
      const usageInMB = 100;

      await expect(
        createUsageService(invalidPhoneNumber, date, usageInMB)
      ).rejects.toThrow(InvalidPhoneNumberError);
    });

    it('should throw InvalidUsageError for negative usage value', async () => {
      const phoneNumber = '1234567890';
      const date = new Date();
      const negativeUsage = -100;

      await expect(
        createUsageService(phoneNumber, date, negativeUsage)
      ).rejects.toThrow(InvalidUsageError);
    });

    it('should throw SubscriberNotFoundError when subscriber does not exist', async () => {
      const phoneNumber = '1234567890';
      const date = new Date();
      const usageInMB = 100;

      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(null);

      await expect(
        createUsageService(phoneNumber, date, usageInMB)
      ).rejects.toThrow(SubscriberNotFoundError);
    });
  });
}); 