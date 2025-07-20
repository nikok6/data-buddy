import { PrismaClient } from '@prisma/client';
import { availableDataPlans, defaultAdmin } from '../src/config/seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Seed admin user
  console.log('Seeding admin user...');
  await prisma.user.upsert({
    where: { username: defaultAdmin.username },
    update: {
      password: defaultAdmin.password,
      role: defaultAdmin.role,
      isActive: defaultAdmin.isActive
    },
    create: {
      username: defaultAdmin.username,
      password: defaultAdmin.password,
      role: defaultAdmin.role,
      isActive: defaultAdmin.isActive
    }
  });

  // Seed data plans
  console.log('Seeding data plans...');
  for (const plan of availableDataPlans) {
    await prisma.dataPlan.upsert({
      where: { planId: plan.id },
      update: {
        provider: plan.provider,
        name: plan.name,
        dataFreeInGB: plan.dataFreeInGB,
        billingCycleInDays: plan.billingCycleInDays,
        price: plan.price,
        excessChargePerMB: plan.excessChargePerMB,
      },
      create: {
        planId: plan.id,
        provider: plan.provider,
        name: plan.name,
        dataFreeInGB: plan.dataFreeInGB,
        billingCycleInDays: plan.billingCycleInDays,
        price: plan.price,
        excessChargePerMB: plan.excessChargePerMB,
      },
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 