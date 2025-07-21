import { BillingReport, BillingCycle, SubscriberNotFoundError } from '../../types';
import { UsageRepository } from '../../repositories/usage-repository';
import { SubscriberRepository } from '../../repositories/subscriber-repository';

let usageRepository = new UsageRepository();
let subscriberRepository = new SubscriberRepository();

export const initializeRepository = (usageRepo: UsageRepository, subscriberRepo: SubscriberRepository) => {
  usageRepository = usageRepo;
  subscriberRepository = subscriberRepo;
};

const GB_TO_MB = 1000;

export const getBillingReportService = async (phoneNumber: string): Promise<BillingReport> => {
  // Find subscriber with their current plan
  const subscriber = await subscriberRepository.findByPhoneNumber(phoneNumber);

  if (!subscriber) {
    throw new SubscriberNotFoundError(phoneNumber);
  }

  // Calculate the date range for the last 30 days
  const endDate = new Date(); // today: 19/07/2025
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29); // 30 days ago: 20/06/2025
  startDate.setHours(0, 0, 0, 0);

  // Find all usage records within the date range
  const usageRecords = await usageRepository.findUsageInDateRange(phoneNumber, startDate, endDate);

  if (!usageRecords) {
    throw new SubscriberNotFoundError(phoneNumber);
  }

  // Calculate billing cycles within the date range
  const billingCycles: BillingCycle[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const cycleStartDate = new Date(currentDate);
    const cycleEndDate = new Date(currentDate);
    cycleEndDate.setDate(cycleEndDate.getDate() + subscriber.plan.billingCycleInDays - 1);
    cycleStartDate.setHours(0, 0, 0, 0);
    cycleEndDate.setHours(23, 59, 59, 999);

    // Only include full billing cycles
    if (cycleEndDate <= endDate) {
      const cycleUsage = usageRecords.filter(usage => 
        usage.date >= cycleStartDate && usage.date <= cycleEndDate
      );

      const totalUsageInMB = cycleUsage.reduce((sum, usage) => sum + usage.usageInMB, 0);
      const includedDataInMB = subscriber.plan.dataFreeInGB * GB_TO_MB;
      const excessDataInMB = Math.max(0, totalUsageInMB - includedDataInMB);
      const excessCost = excessDataInMB * subscriber.plan.excessChargePerMB;
      const totalCost = subscriber.plan.price + excessCost;

      // Add 1 day to the start date to make it inclusive
      cycleStartDate.setDate(cycleStartDate.getDate() + 1);
      
      billingCycles.push({
        startDate: cycleStartDate,
        endDate: cycleEndDate,
        basePrice: subscriber.plan.price,
        totalUsageInMB,
        includedDataInMB,
        excessDataInMB,
        excessCost,
        totalCost
      });
    }

    // Move to next cycle
    currentDate.setDate(currentDate.getDate() + subscriber.plan.billingCycleInDays);
  }

  const totalCost = billingCycles.reduce((sum, cycle) => sum + cycle.totalCost, 0);

  return {
    phoneNumber,
    totalCost,
    billingCycles
  };
}; 