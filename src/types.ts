export type UserRole = "Admin" | "Employee";

export interface User {
  name: string;
  email: string;
  role: UserRole;
}

export interface Product {
  key: string; // for Antd table key mapping
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface PILogEntry {
  piNumber: string;
  date: string;
  customerName: string;
  mobile: string;
  gstin: string;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  generatedBy: string;
}

export interface DashboardStats {
  todayCount: number;
  monthCount: number;
  lastPiNumber: string;
}

export interface AdditionalCharge {
  desc: string;
  amount: number;
}

export interface PICreationInput {
  customerName: string;
  address: string;
  mobile: string;
  gstin: string;
  state: string;
  isDelhiNcr: boolean;
  additionalCharges: AdditionalCharge[];
  products: Omit<Product, "key">[];
  date?: string;
  dispatchDate?: string;
  piSharedBy?: string;
}
