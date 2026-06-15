import axios from 'axios';
import type { Transaction, CategorySummary, Anomaly, UploadResponse } from '../types';

const api = axios.create({
  baseURL: '/api/transactions',
  headers: {
    'Accept': 'application/json',
  },
});

export const transactionApi = {
  /**
   * Upload a CSV file of transactions.
   */
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Get all transactions.
   */
  getAll: async (): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('');
    return response.data;
  },

  /**
   * Get spending summary by category.
   */
  getSummary: async (): Promise<CategorySummary[]> => {
    const response = await api.get<CategorySummary[]>('/summary');
    return response.data;
  },

  /**
   * Get flagged anomalies.
   */
  getAnomalies: async (): Promise<Anomaly[]> => {
    const response = await api.get<Anomaly[]>('/anomalies');
    return response.data;
  },

  /**
   * Delete all transactions.
   */
  deleteAll: async (): Promise<void> => {
    await api.delete('');
  },
};
