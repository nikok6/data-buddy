import { SubscriberRepository } from '../../repositories/subscriber-repository';
import { SubscriberNotFoundError, InvalidPhoneNumberError, SubscriberExistsError } from '../../types';

// Initialize with default repository
let subscriberRepository: SubscriberRepository = new SubscriberRepository();

export const initializeRepository = (repo: SubscriberRepository) => {
  subscriberRepository = repo;
};

export const getAllSubscribersService = async () => {
  return subscriberRepository.findAll();
};

export const getSubscriberByIdService = async (id: number) => {
  const subscriber = await subscriberRepository.findById(id);
  if (!subscriber) {
    throw new SubscriberNotFoundError(id.toString());
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
      throw new SubscriberNotFoundError(id.toString());
    }
    throw error;
  }
}; 