import { SubscriberRepository } from '../../repositories/subscriber-repository';

const subscriberRepository = new SubscriberRepository();

export class SubscriberNotFoundError extends Error {
  constructor(identifier: string | number) {
    super(`Subscriber not found: ${identifier}`);
    this.name = 'SubscriberNotFoundError';
  }
}

export class InvalidPhoneNumberError extends Error {
  constructor(phoneNumber: string) {
    super(`Invalid phone number format: ${phoneNumber}`);
    this.name = 'InvalidPhoneNumberError';
  }
}

export class SubscriberExistsError extends Error {
  constructor(phoneNumber: string) {
    super(`Subscriber already exists with phone number: ${phoneNumber}`);
    this.name = 'SubscriberExistsError';
  }
}

export const getAllSubscribersService = async () => {
  return subscriberRepository.findAll();
};

export const getSubscriberByIdService = async (id: number) => {
  const subscriber = await subscriberRepository.findById(id);
  if (!subscriber) {
    throw new SubscriberNotFoundError(id);
  }
  return subscriber;
};

export const getSubscriberByPhoneService = async (phoneNumber: string) => {
  // Validate phone number format
  if (!phoneNumber?.match(/^\d+$/)) {
    throw new InvalidPhoneNumberError(phoneNumber);
  }

  const subscriber = await subscriberRepository.findByPhoneNumber(phoneNumber);
  if (!subscriber) {
    throw new SubscriberNotFoundError(phoneNumber);
  }
  return subscriber;
};

export const createSubscriberService = async (phoneNumber: string, planId: number) => {
  // Validate phone number format
  if (!phoneNumber?.match(/^\d+$/)) {
    throw new InvalidPhoneNumberError(phoneNumber);
  }

  // Check if subscriber already exists
  const exists = await subscriberRepository.exists(phoneNumber);
  if (exists) {
    throw new SubscriberExistsError(phoneNumber);
  }

  return subscriberRepository.create({
    phoneNumber,
    planId
  });
};

export const updateSubscriberService = async (id: number, updates: { phoneNumber?: string; planId?: number }) => {
  // Validate phone number format if provided
  if (updates.phoneNumber && !updates.phoneNumber.match(/^\d+$/)) {
    throw new InvalidPhoneNumberError(updates.phoneNumber);
  }

  try {
    return await subscriberRepository.update(id, updates);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new SubscriberNotFoundError(id);
    }
    throw error;
  }
}; 