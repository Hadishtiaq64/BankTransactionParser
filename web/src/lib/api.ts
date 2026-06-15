import axios from "axios";
import type {
  Anomaly,
  CategorySummary,
  Transaction,
  UploadResponse,
} from "./types";

const api = axios.create({
  baseURL: "/api/transactions",
  headers: { Accept: "application/json" },
});

export const transactionApi = {
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<UploadResponse>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getAll: async (): Promise<Transaction[]> => {
    const res = await api.get<Transaction[]>("");
    return res.data;
  },

  getSummary: async (): Promise<CategorySummary[]> => {
    const res = await api.get<CategorySummary[]>("/summary");
    return res.data;
  },

  getAnomalies: async (): Promise<Anomaly[]> => {
    const res = await api.get<Anomaly[]>("/anomalies");
    return res.data;
  },

  deleteAll: async (): Promise<void> => {
    await api.delete("");
  },
};
