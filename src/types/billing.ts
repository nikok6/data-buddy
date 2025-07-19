export interface BillingReport {
  phoneNumber: string;
  totalCost: number;
  billingCycles: BillingCycle[];
}

export interface BillingCycle {
  startDate: Date;
  endDate: Date;
  basePrice: number;
  totalUsageInMB: number;
  includedDataInMB: number;
  excessDataInMB: number;
  excessCost: number;
  totalCost: number;
} 