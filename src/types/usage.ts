export interface Usage {
  subscriberId: string;
  date: Date;
  usageInMB: number;
}

export class InvalidUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUsageError';
  }
}