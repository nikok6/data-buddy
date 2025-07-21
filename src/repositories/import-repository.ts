import { PrismaClient } from '@prisma/client';
import { ImportData } from '../types';

const prisma = new PrismaClient();

export class ImportRepository {
  async importUsageData(data: ImportData) {
    return prisma.$transaction(async (tx) => {
      // Find the data plan
      const dataPlan = await tx.dataPlan.findUnique({
        where: { planId: data.planId }
      });

      if (!dataPlan) {
        return { status: 'invalid_plan' as const };
      }

      // Find or create subscriber
      let subscriber = await tx.subscriber.findUnique({
        where: { phoneNumber: data.phoneNumber },
        include: { plan: true }
      });
      
      // Create subscriber if not exists
      let isNewSubscriber = false;
      if (!subscriber) {
        subscriber = await tx.subscriber.create({
          data: {
            phoneNumber: data.phoneNumber,
            planId: dataPlan.id,
          },
          include: { plan: true }
        });
        isNewSubscriber = true;
      } else if (subscriber.planId !== dataPlan.id) {
        subscriber = await tx.subscriber.update({
          where: { id: subscriber.id },
          data: { planId: dataPlan.id },
          include: { plan: true }
        });
      }

      // Normalize the date to start of day
      const normalizedDate = new Date(data.date);
      normalizedDate.setHours(0, 0, 0, 0);

      // Check for existing usage record
      const existingUsage = await tx.usage.findFirst({
        where: {
          subscriberId: subscriber.id,
          date: normalizedDate
        }
      });

      if (existingUsage) {
        return { status: 'duplicate' as const };
      }

      // Create usage record
      await tx.usage.create({
        data: {
          subscriberId: subscriber.id,
          date: normalizedDate,
          usageInMB: data.usageInMB
        }
      });

      return {
        status: 'success' as const,
        isNewSubscriber
      };
    });
  }
} 