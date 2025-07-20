import { PrismaClient } from '@prisma/client';
import { User, UserRole } from '../types';

const prisma = new PrismaClient();

export class AuthRepository {
  async createUser(userData: {
    username: string;
    password: string;
    role?: UserRole;
    isActive?: boolean;
  }) {
    return prisma.user.create({
      data: {
        username: userData.username,
        password: userData.password,
        role: userData.role || UserRole.ADMIN,
        isActive: userData.isActive ?? true,
      },
    });
  }

  async getUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async getUserById(id: number) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async updateUser(id: number, userData: Partial<{
    username: string;
    password: string;
    role: UserRole;
    isActive: boolean;
  }>) {
    return prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  async getUserByUsernameActive(username: string) {
    return prisma.user.findFirst({
      where: {
        username,
        isActive: true,
      },
    });
  }

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
} 