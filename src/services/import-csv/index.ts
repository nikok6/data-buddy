import { MultipartFile } from '@fastify/multipart';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { ImportRepository } from '../../repositories/import-repository';
import { ImportData, ImportResult } from '../../types';

let importRepository: ImportRepository = new ImportRepository();

export const initializeRepository = (repo: ImportRepository) => {
  importRepository = repo;
};

export const importCsvService = async (file: MultipartFile): Promise<ImportResult> => {
  const result: ImportResult = {
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
  };

  const buffer = await file.toBuffer();
  if (buffer.length === 0) {
    throw new Error('Empty CSV file');
  }

  const parser = parse({
    columns: (headers) => {
      const requiredColumns = ['phone_number', 'plan_id', 'date', 'usage_in_mb'];
      const parsedHeaders = headers.map(h => h.trim().toLowerCase());
      const missingColumns = requiredColumns.filter(col => !parsedHeaders.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }
      return parsedHeaders;
    },
    skip_empty_lines: true,
  });

  // Process the file stream
  const stream = Readable.from(buffer);
  const rows: ImportData[] = [];
  
  await new Promise((resolve, reject) => {
    stream
      .pipe(parser)
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  if (rows.length === 0) {
    return result;
  }

  const processRow = async (row: ImportData) => {
    result.totalProcessed++;

    // Validate phone number
    if (!row.phoneNumber?.toString().match(/^\d+$/)) {
      result.skipped.invalid.invalidPhoneNumber++;
      return;
    }

    // Validate usage
    const usageInMB = row.usageInMB;
    if (isNaN(usageInMB) || usageInMB < 0) {
      result.skipped.invalid.invalidUsage++;
      return;
    }

    // Validate date
    const timestamp = row.date;
    if (isNaN(timestamp.getTime())) {
      result.skipped.invalid.invalidDate++;
      return;
    }
    const date = new Date(timestamp);

    try {
      const importResult = await importRepository.importUsageData({
        phoneNumber: row.phoneNumber,
        planId: row.planId,
        date,
        usageInMB
      });

      switch (importResult.status) {
        case 'success':
          result.imported++;
          if (importResult.isNewSubscriber) {
            result.newSubscribers++;
          }
          break;
        case 'duplicate':
          result.skipped.duplicates++;
          break;
        case 'invalid_plan':
          result.skipped.invalid.invalidPlanId++;
          break;
      }
    } catch (error) {
      console.error('Error processing row:', error);
      throw error;
    }
  };

  // Process rows sequentially
  for (const row of rows) {
    await processRow(row);
  }

  return result;
}; 