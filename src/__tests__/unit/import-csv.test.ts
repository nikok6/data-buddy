import { MultipartFile } from '@fastify/multipart';
import { Readable } from 'stream';
import { ImportRepository } from '../../repositories/import-repository';
import { importCsvService, initializeRepository } from '../../services/import-csv';

// Mock repositories
jest.mock('../../repositories/import-repository');

describe('Import CSV Service', () => {
  let mockImportRepository: jest.Mocked<ImportRepository>;

  // Helper function to create a mock CSV file
  const createMockFile = (content: string): MultipartFile => {
    const buffer = Buffer.from(content);
    return {
      toBuffer: () => Promise.resolve(buffer),
      file: Readable.from(buffer),
      filename: 'test.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      fields: {}
    } as MultipartFile;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockImportRepository = new ImportRepository() as jest.Mocked<ImportRepository>;
    initializeRepository(mockImportRepository);
  });

  describe('CSV Validation', () => {
    it('should throw error for empty CSV file', async () => {
      const emptyFile = createMockFile('');

      await expect(importCsvService(emptyFile))
        .rejects
        .toThrow('Empty CSV file');
    });

    it('should throw error for missing required columns', async () => {
      const csvContent = 'phone_number,date,usage_in_mb\n1234567890,1672531200000,100';
      const file = createMockFile(csvContent);

      await expect(importCsvService(file))
        .rejects
        .toThrow('Missing required columns: plan_id');
    });

    it('should handle empty file with headers only', async () => {
      const csvContent = 'phone_number,plan_id,date,usage_in_mb\n';
      const file = createMockFile(csvContent);

      const result = await importCsvService(file);

      expect(result).toEqual({
        totalProcessed: 0,
        imported: 0,
        skipped: {
          duplicates: 0,
          invalid: {
            invalidPhoneNumber: 0,
            invalidPlanId: 0,
            invalidDate: 0,
            invalidUsage: 0,
          },
        },
        newSubscribers: 0,
      });
    });
  });

  describe('Data Import', () => {
    it('should successfully import valid data', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '87654321,plan_1,1672531200000,100';
      const file = createMockFile(csvContent);

      mockImportRepository.importUsageData.mockResolvedValue({
        status: 'success',
        isNewSubscriber: true
      });

      const result = await importCsvService(file);

      expect(result).toEqual({
        totalProcessed: 1,
        imported: 1,
        skipped: {
          duplicates: 0,
          invalid: {
            invalidPhoneNumber: 0,
            invalidPlanId: 0,
            invalidDate: 0,
            invalidUsage: 0,
          },
        },
        newSubscribers: 1,
      });

      expect(mockImportRepository.importUsageData).toHaveBeenCalledWith({
        phoneNumber: '87654321',
        planId: 'plan_1',
        date: new Date(1672531200000),
        usageInMB: 100
      });
    });

    it('should handle duplicate records', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '87654321,plan_1,1672531200000,100';
      const file = createMockFile(csvContent);

      mockImportRepository.importUsageData.mockResolvedValue({
        status: 'duplicate'
      });

      const result = await importCsvService(file);

      expect(result.skipped.duplicates).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('should handle invalid plan IDs', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '87654321,invalid_plan,1672531200000,100';
      const file = createMockFile(csvContent);

      mockImportRepository.importUsageData.mockResolvedValue({
        status: 'invalid_plan'
      });

      const result = await importCsvService(file);

      expect(result.skipped.invalid.invalidPlanId).toBe(1);
      expect(result.imported).toBe(0);
    });
  });

  describe('Data Validation', () => {
    it('should handle invalid phone numbers', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        'abc123,plan_1,1672531200000,100';
      const file = createMockFile(csvContent);

      const result = await importCsvService(file);

      expect(result.skipped.invalid.invalidPhoneNumber).toBe(1);
      expect(result.imported).toBe(0);
      expect(mockImportRepository.importUsageData).not.toHaveBeenCalled();
    });

    it('should handle invalid usage values', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '87654321,plan_1,1672531200000,-100\n' +
        '87654321,plan_1,1672531200000,invalid';
      const file = createMockFile(csvContent);

      const result = await importCsvService(file);

      expect(result.skipped.invalid.invalidUsage).toBe(2);
      expect(result.imported).toBe(0);
      expect(mockImportRepository.importUsageData).not.toHaveBeenCalled();
    });

    it('should handle invalid dates', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '87654321,plan_1,invalid_date,100';
      const file = createMockFile(csvContent);

      const result = await importCsvService(file);

      expect(result.skipped.invalid.invalidDate).toBe(1);
      expect(result.imported).toBe(0);
      expect(mockImportRepository.importUsageData).not.toHaveBeenCalled();
    });

    it('should process multiple rows with mixed validity', async () => {
      const csvContent = 
        'phone_number,plan_id,date,usage_in_mb\n' +
        '87654321,plan_1,1672531200000,100\n' +    // valid
        'abc123,plan_1,1672531200000,100\n' +        // invalid phone
        '87654323,plan_1,invalid_date,100\n' +     // invalid date
        '87654324,plan_1,1672531200000,-50\n' +    // invalid usage
        '87654325,plan_1,1672531200000,200';       // valid

      const file = createMockFile(csvContent);

      mockImportRepository.importUsageData
        .mockResolvedValueOnce({ status: 'success', isNewSubscriber: true })
        .mockResolvedValueOnce({ status: 'success', isNewSubscriber: false });

      const result = await importCsvService(file);

      expect(result).toEqual({
        totalProcessed: 5,
        imported: 2,
        skipped: {
          duplicates: 0,
          invalid: {
            invalidPhoneNumber: 1,
            invalidPlanId: 0,
            invalidDate: 1,
            invalidUsage: 1,
          },
        },
        newSubscribers: 1,
      });

      expect(mockImportRepository.importUsageData).toHaveBeenCalledTimes(2);
    });
  });
}); 