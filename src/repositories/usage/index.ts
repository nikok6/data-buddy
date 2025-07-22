import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UsageRepository {
  async findByPhoneNumber(phoneNumber: string) {
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber },
      select: { id: true }
    });

    if (!subscriber) {
      return null;
    }

    return prisma.usage.findMany({
      where: {
        subscriberId: subscriber.id
      },
      orderBy: {
        date: 'asc'
      },
      select: {
        date: true,
        usageInMB: true
      }
    });
  }

  async findById(id: number) {
    return prisma.usage.findUnique({
      where: { id },
      select: {
        date: true,
        usageInMB: true
      }
    });
  }

  async create(phoneNumber: string, date: Date, usageInMB: number) {
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber },
      select: { id: true }
    });

    if (!subscriber) {
      return null;
    }

    // Normalize the date to start of day to maintain consistency
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    return prisma.usage.create({
      data: {
        subscriberId: subscriber.id,
        date: normalizedDate,
        usageInMB
      },
      select: {
        date: true,
        usageInMB: true
      }
    });
  }

  async update(id: number, usageInMB: number) {
    return prisma.usage.update({
      where: { id },
      data: {
        usageInMB
      },
      select: {
        date: true,
        usageInMB: true
      }
    });
  }

  async findUsageInDateRange(phoneNumber: string, startDate: Date, endDate: Date) {
    const subscriber = await prisma.subscriber.findUnique({
      where: { phoneNumber },
      select: { id: true }
    });

    if (!subscriber) {
      return null;
    }

    return prisma.usage.findMany({
      where: {
        subscriberId: subscriber.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      },
      select: {
        date: true,
        usageInMB: true
      }
    });
  }
}