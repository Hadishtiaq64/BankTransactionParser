export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  anomaly: boolean;
  anomalyExplanation: string | null;
}

export interface CategorySummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
}

export interface Anomaly {
  transactionId: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  explanation: string;
}

export interface UploadResponse {
  message: string;
  transactionCount: number;
  transactions: Transaction[];
}
