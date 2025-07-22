import { UsageRepository } from '../../repositories/usage';
import { SubscriberRepository } from '../../repositories/subscriber';
import { SubscriberNotFoundError, InvalidPhoneNumberError, InvalidUsageError } from '../../types';

// Initialize with default repository
let subscriberRepository: SubscriberRepository = new SubscriberRepository();
let usageRepository: UsageRepository = new UsageRepository();

export const initializeRepository = (subscriberRepo: SubscriberRepository, usageRepo: UsageRepository) => {
  subscriberRepository = subscriberRepo;
  usageRepository = usageRepo;
};

export const getUsageByPhoneNumberService = async (phoneNumber: string) => {
  // Validate phone number format
  if (!phoneNumber?.match(/^\d+$/)) {
    throw new InvalidPhoneNumberError(phoneNumber);
  }

  const usages = await usageRepository.findByPhoneNumber(phoneNumber);
  if (usages === null) {
    throw new SubscriberNotFoundError(phoneNumber);
  }

  return usages;
};

export const getUsageByPhoneNumberAndDateRangeService = async (
  phoneNumber: string,
  startDate: Date,
  endDate: Date
) => {
  // Validate phone number format
  if (!phoneNumber?.match(/^\d+$/)) {
    throw new InvalidPhoneNumberError(phoneNumber);
  }

  // Validate date range
  if (startDate > endDate) {
    throw new InvalidUsageError('Start date must be before or equal to end date');
  }

  const usages = await usageRepository.findUsageInDateRange(phoneNumber, startDate, endDate);
  if (usages === null) {
    throw new SubscriberNotFoundError(phoneNumber);
  }

  return usages;
};

export const createUsageService = async (
  phoneNumber: string,
  date: Date,
  usageInMB: number
) => {
  // Validate phone number format
  if (!phoneNumber?.match(/^\d+$/)) {
    throw new InvalidPhoneNumberError(phoneNumber);
  }

  // Validate usage value
  if (typeof usageInMB !== 'number' || usageInMB < 0) {
    throw new InvalidUsageError('Usage must be a non-negative number');
  }

  // Check if subscriber exists
  const subscriber = await subscriberRepository.findByPhoneNumber(phoneNumber);
  if (!subscriber) {
    throw new SubscriberNotFoundError(phoneNumber);
  }

  // Create usage record
  const usage = await usageRepository.create(phoneNumber, date, usageInMB);
  if (!usage) {
    throw new Error('Failed to create usage record');
  }

  return usage;
}; 