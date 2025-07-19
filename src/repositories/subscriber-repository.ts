import { PrismaClient } from '@prisma/client';
import { Subscriber } from '../types';

const prisma = new PrismaClient();

export class SubscriberRepository {
  async findAll() {
    return prisma.subscriber.findMany({
      orderBy: {
        phoneNumber: 'asc'
      },
      include: {
        plan: true
      }
    });
  }

  async findById(id: number) {
    return prisma.subscriber.findUnique({
      where: { id },
      include: {
        plan: true
      }
    });
  }

  async findByPhoneNumber(phoneNumber: string) {
    return prisma.subscriber.findUnique({
      where: { phoneNumber },
      include: {
        plan: true
      }
    });
  }

  async create(subscriber: Omit<Subscriber, 'id'>) {
    return prisma.subscriber.create({
      data: {
        phoneNumber: subscriber.phoneNumber,
        planId: subscriber.planId
      },
      include: {
        plan: true
      }
    });
  }

  async update(id: number, subscriber: Partial<Omit<Subscriber, 'id'>>) {
    return prisma.subscriber.update({
      where: { id },
      data: {
        ...(subscriber.phoneNumber && { phoneNumber: subscriber.phoneNumber }),
        ...(subscriber.planId && { planId: subscriber.planId })
      },
      include: {
        plan: true
      }
    });
  }

  async exists(phoneNumber: string): Promise<boolean> {
    const count = await prisma.subscriber.count({
      where: { phoneNumber }
    });
    return count > 0;
  }
} 