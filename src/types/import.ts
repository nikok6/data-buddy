export interface FastifyMultipartError {
    code: string;
    message: string;
  }

export interface ImportData {
    phoneNumber: string;
    planId: string;
    date: Date;
    usageInMB: number;
  }

export interface ImportResult {
    totalProcessed: number;
    imported: number;
    skipped: {
      duplicates: number;
      invalid: {
        invalidPhoneNumber: number;
        invalidPlanId: number;
        invalidDate: number;
        invalidUsage: number;
      };
    };
    newSubscribers: number;
  }