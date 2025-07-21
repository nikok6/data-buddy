import { DataPlan, UserRole } from "../types";
import bcrypt from 'bcryptjs';

export const availableDataPlans: DataPlan[] = [
  {
    id: 'plan_1',
    provider: 'Starhub',
    name: '5GB free every week',
    dataFreeInGB: 5,
    billingCycleInDays: 7,
    price: 7,
    excessChargePerMB: 0.01,
  },
  {
    id: 'plan_2',
    provider: 'Starhub',
    name: '50GB free every month',
    dataFreeInGB: 50,
    billingCycleInDays: 30,
    price: 50,
    excessChargePerMB: 0.01,
  },
  {
    id: 'plan_3',
    provider: 'Singtel',
    name: '1GB free every day',
    dataFreeInGB: 1,
    billingCycleInDays: 1,
    price: 1,
    excessChargePerMB: 0.015,
  },
  {
    id: 'plan_4',
    provider: 'Singtel',
    name: '25GB free every month',
    dataFreeInGB: 25,
    billingCycleInDays: 30,
    price: 28,
    excessChargePerMB: 0.012,
  },
  {
    id: 'plan_5',
    provider: 'M1',
    name: '7GB free every week',
    dataFreeInGB: 7,
    billingCycleInDays: 7,
    price: 10,
    excessChargePerMB: 0.012,
  },
  {
    id: 'plan_6',
    provider: 'Circle Life',
    name: 'Pay as you go',
    dataFreeInGB: 0,
    billingCycleInDays: 30,
    price: 0,
    excessChargePerMB: 0.0015,
  },
];

// Hash the admin password synchronously with 12 rounds
const adminPasswordHash = bcrypt.hashSync('admin', 12);

export const defaultAdmin = {
  username: 'admin',
  password: adminPasswordHash,
  role: UserRole.ADMIN,
  isActive: true
};