import { PrismaClient } from '@prisma/client';
import { availableDataPlans } from '../src/config/seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

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