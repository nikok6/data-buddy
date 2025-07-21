export interface Subscriber {
  id: number;
  phoneNumber: string;
  planId: number;
}

export interface UpdateSubscriberBody {
  phoneNumber?: string;
  planId?: number;
}

export class SubscriberNotFoundError extends Error {
  constructor(phoneNumber: string) {
    super(`Subscriber not found for phone number: ${phoneNumber}`);
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