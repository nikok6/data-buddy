import { MultipartFile } from '@fastify/multipart';
import { parse } from 'csv-parse';
import { PrismaClient, Prisma } from '@prisma/client';
import { Readable } from 'stream';

const prisma = new PrismaClient();

interface CsvRow {
  phone_number: string;
  plan_id: string;
  date: string;
  usage_in_mb: string;
}

interface ImportResult {
  totalProcessed: number;
  imported: number;
  skipped: {
    duplicates: number;
    invalid: {
      invalidPhoneNumber: number;
      invalidPlanId: number;
      invalidDate: number;
      invalidUsage: number;
    };
  };
  newSubscribers: number;
}

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

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
  });

  const processRow = async (row: CsvRow) => {
    result.totalProcessed++;

    // Validate phone number
    if (!row.phone_number?.match(/^\d+$/)) {
      result.skipped.invalid.invalidPhoneNumber++;
      return;
    }

    // Validate usage
    const usageInMB = parseInt(row.usage_in_mb);
    if (isNaN(usageInMB) || usageInMB < 0) {
      result.skipped.invalid.invalidUsage++;
      return;
    }

    // Validate date
    const timestamp = parseInt(row.date);
    if (isNaN(timestamp)) {
      result.skipped.invalid.invalidDate++;
      return;
    }
    const date = new Date(timestamp);

    try {
      await prisma.$transaction(async (tx) => {
        // Find the data plan first
        const dataPlan = await tx.dataPlan.findUnique({
          where: { planId: row.plan_id },
        });

        if (!dataPlan) {
          result.skipped.invalid.invalidPlanId++;
          return;
        }

        // Find or create subscriber
        let subscriber = await tx.subscriber.findUnique({
          where: { phoneNumber: row.phone_number },
        });

        if (!subscriber) {
          subscriber = await tx.subscriber.create({
            data: {
              phoneNumber: row.phone_number,
              planId: dataPlan.id,
            },
          });
          result.newSubscribers++;
        } else if (subscriber.planId !== dataPlan.id) {
          subscriber = await tx.subscriber.update({
            where: { id: subscriber.id },
            data: { planId: dataPlan.id },
          });
        }

        // Check for existing usage record
        const existingUsage = await tx.usage.findFirst({
          where: {
            subscriberId: subscriber.id,
            date,
          },
        });

        if (existingUsage) {
          result.skipped.duplicates++;
          return;
        }

        // Create usage record
        await tx.usage.create({
          data: {
            subscriberId: subscriber.id,
            date,
            usageInMB,
          },
        });
        result.imported++;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          result.skipped.duplicates++;
        } else {
          console.error('Error processing row:', error);
          throw error;
        }
      } else {
        console.error('Error processing row:', error);
        throw error;
      }
    }
  };

  // Process the file stream
  const buffer = await file.toBuffer();
  const stream = Readable.from(buffer);

  const rows: CsvRow[] = [];
  await new Promise((resolve, reject) => {
    stream
      .pipe(parser)
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  // Process rows sequentially
  for (const row of rows) {
    await processRow(row);
  }

  return result;
}; 