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

export type InvoiceNotesTitle = "Important Notes" | "Terms and Conditions";

export type PIMode = "duty_paid" | "igcr";

export interface InvoiceNotes {
  enabled: boolean;
  title: InvoiceNotesTitle;
  description: string;
}

export interface PICreationInput {
  customerName: string;
  address: string;
  mobile: string;
  gstin: string;
  state: string;
  isDelhiNcr: boolean;
  piMode?: PIMode;
  additionalCharges: AdditionalCharge[];
  products: Omit<Product, "key">[];
  date?: string;
  dispatchDate?: string;
  piSharedBy?: string;
}

export interface PIPreviewTotals {
  subtotal: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  gst: number;
  grand: number;
}

export interface PIPreviewData {
  piNumber?: string;
  customerName: string;
  address: string;
  mobile: string;
  gstin?: string;
  state: string;
  isDelhiNcr: boolean;
  piMode?: PIMode;
  additionalCharges: AdditionalCharge[];
  products: Array<{
    productName: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
  }>;
  date?: string;
  dispatchDate?: string;
  piSharedBy?: string;
  invoiceNotes?: InvoiceNotes;
  totals: PIPreviewTotals;
}

export interface StoredPI {
  piNumber: string;
  savedAt: string;
  customerName: string;
  date: string;
  grandTotal: number;
  invoiceData: PIPreviewData;
  pdfBlob?: Blob;
}
