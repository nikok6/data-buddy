import { UsageRepository } from '../../repositories/usage-repository';
import { SubscriberRepository } from '../../repositories/subscriber-repository';
import { getBillingReportService, SubscriberNotFoundError, initializeRepository } from '../../services/billing';
import { BillingReport } from '../../types';

// Mock repositories
jest.mock('../../repositories/usage-repository');
jest.mock('../../repositories/subscriber-repository');

describe('Billing Service', () => {
  let mockUsageRepository: jest.Mocked<UsageRepository>;
  let mockSubscriberRepository: jest.Mocked<SubscriberRepository>;
  let RealDate: DateConstructor;

  const mockSubscriber = { 
    id: 10, 
    phoneNumber: '12345678', 
    planId: 1, 
    createdAt: new Date(), 
    updatedAt: new Date(), 
    plan: { 
      id: 1, 
      planId: '1', 
      provider: 'provider', 
      name: 'name', 
      dataFreeInGB: 20, 
      billingCycleInDays: 30, 
      price: 29.99, 
      excessChargePerMB: 0.1, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    } 
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsageRepository = new UsageRepository() as jest.Mocked<UsageRepository>;
    mockSubscriberRepository = new SubscriberRepository() as jest.Mocked<SubscriberRepository>;
    initializeRepository(mockUsageRepository, mockSubscriberRepository);

    // Store the real Date constructor
    RealDate = global.Date;
    const fixedDate = new Date('2024-01-31');
    
    // Mock the Date constructor
    global.Date = class extends RealDate {
      constructor(value?: number | string | Date) {
        super();
        return value ? new RealDate(value) : fixedDate;
      }

      static now() {
        return new RealDate('2024-01-31').getDate();
      }
    } as DateConstructor;
  });

  afterEach(() => {
    // Restore the real Date constructor
    global.Date = RealDate;
    jest.restoreAllMocks();
  });

  describe('getBillingReportService', () => {
    it('should throw SubscriberNotFoundError when subscriber does not exist', async () => {
      const phoneNumber = '12345678';
      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(null);

      await expect(getBillingReportService(phoneNumber))
        .rejects
        .toThrow(new SubscriberNotFoundError(phoneNumber));
    });

    it('should throw SubscriberNotFoundError when usage records not found', async () => {
      const phoneNumber = '12345678';
      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.findUsageInDateRange.mockResolvedValue(null);

      await expect(getBillingReportService(phoneNumber))
        .rejects
        .toThrow(new SubscriberNotFoundError(phoneNumber));
    });

    it('should calculate billing report with no excess usage', async () => {
      const phoneNumber = '12345678';
      const usageRecords = [
        { date: new Date('2024-01-15'), usageInMB: 5000 }, // 5GB
        { date: new Date('2024-01-20'), usageInMB: 10000 } // 10GB
      ];

      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.findUsageInDateRange.mockResolvedValue(usageRecords);

      const result = await getBillingReportService(phoneNumber);

      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.totalCost).toBeCloseTo(29.99); // Just base price, no excess
      expect(result.billingCycles).toHaveLength(1);
      expect(result.billingCycles[0]).toMatchObject({
        basePrice: 29.99,
        totalUsageInMB: 15000, // 15GB
        includedDataInMB: 20480, // 20GB in MB
        excessDataInMB: 0,
        excessCost: 0,
        totalCost: 29.99
      });
    });

    it('should calculate billing report with excess usage', async () => {
      const phoneNumber = '12345678';
      const usageRecords = [
        { date: new Date('2024-01-15'), usageInMB: 15000 }, // 15GB
        { date: new Date('2024-01-20'), usageInMB: 10000 }  // 10GB
      ];

      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.findUsageInDateRange.mockResolvedValue(usageRecords);

      const result = await getBillingReportService(phoneNumber);

      const excessMB = 25000 - (20 * 1024); // Total usage - included data in MB
      const expectedExcessCost = excessMB * 0.1;
      const expectedTotalCost = 29.99 + expectedExcessCost;

      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.totalCost).toBeCloseTo(expectedTotalCost);
      expect(result.billingCycles).toHaveLength(1);
      expect(result.billingCycles[0]).toMatchObject({
        basePrice: 29.99,
        totalUsageInMB: 25000,
        includedDataInMB: 20480,
        excessDataInMB: excessMB,
        excessCost: expectedExcessCost,
        totalCost: expectedTotalCost
      });
    });

    it('should handle multiple billing cycles', async () => {
      const phoneNumber = '12345678';
      const usageRecords = [
        { date: new Date('2024-01-01'), usageInMB: 10000 },
        // First cycle
        { date: new Date('2024-01-02'), usageInMB: 5000 },
        { date: new Date('2024-01-15'), usageInMB: 1000 },
        { date: new Date('2024-01-31'), usageInMB: 8000 }
      ];

      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.findUsageInDateRange.mockResolvedValue(usageRecords);

      const result = await getBillingReportService(phoneNumber);

      expect(result.billingCycles).toHaveLength(1); // Only complete cycles
      expect(result.billingCycles[0]).toMatchObject({
        basePrice: 29.99,
        totalUsageInMB: 14000, // First cycle usage
        includedDataInMB: 20480,
        excessDataInMB: 0,
        excessCost: 0,
        totalCost: 29.99
      });
    });

    it('should handle empty usage records', async () => {
      const phoneNumber = '12345678';
      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.findUsageInDateRange.mockResolvedValue([]);

      const result = await getBillingReportService(phoneNumber);

      expect(result.phoneNumber).toBe(phoneNumber);
      expect(result.totalCost).toBeCloseTo(29.99); // Just base price
      expect(result.billingCycles).toHaveLength(1);
      expect(result.billingCycles[0]).toMatchObject({
        basePrice: 29.99,
        totalUsageInMB: 0,
        includedDataInMB: 20480,
        excessDataInMB: 0,
        excessCost: 0,
        totalCost: 29.99
      });
    });

    it('should correctly calculate dates for billing cycles', async () => {
      const phoneNumber = '12345678';
      mockSubscriberRepository.findByPhoneNumber.mockResolvedValue(mockSubscriber);
      mockUsageRepository.findUsageInDateRange.mockResolvedValue([]);

      const result = await getBillingReportService(phoneNumber);

      const expectedStartDate = new Date('2024-01-03');
      const expectedEndDate = new Date('2024-01-31');

      expect(result.billingCycles[0].startDate.getDate()).toBe(expectedStartDate.getDate());
      expect(result.billingCycles[0].endDate.getDate()).toBe(expectedEndDate.getDate());
    });
  });
}); 