"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { transactionApi } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";

export default function CsvUpload({
  onUploaded,
}: {
  onUploaded: (data: UploadResponse) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null
  );

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      setUploading(true);
      setResult(null);
      try {
        const data = await transactionApi.upload(accepted[0]);
        setResult({ ok: true, msg: data.message });
        onUploaded(data);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ||
          (err as Error)?.message ||
          "Upload failed";
        setResult({ ok: false, msg });
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const name = rejections[0]?.file?.name ?? "file";
    setResult({ ok: false, msg: `"${name}" was rejected — please use a .csv file.` });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "application/octet-stream": [".csv"],
      "text/plain": [".csv"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-8 py-16 text-center transition-all duration-200 ${
          isDragActive
            ? "border-ink bg-ink/[0.03]"
            : "border-gray-3 bg-cream-card/50 hover:border-gray-1 hover:bg-cream-card"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-cream">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isDragActive ? (
            <FileText className="h-6 w-6" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>
        <p className="mt-5 text-base font-semibold text-ink">
          {uploading
            ? "Processing transactions…"
            : isDragActive
            ? "Drop your CSV here"
            : "Upload bank transactions"}
        </p>
        <p className="mt-1.5 text-sm text-gray-1">
          {uploading
            ? "Parsing, categorizing with AI, and detecting anomalies"
            : "Drag & drop a CSV, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-gray-2">
          Expected columns: date, description, amount
        </p>
      </div>

      {result && (
        <div
          className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
            result.ok
              ? "border-[var(--line)] bg-cream-card text-ink"
              : "border-[rgba(160,0,0,0.15)] bg-[rgba(160,0,0,0.04)] text-[#7a1f1f]"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-medium">{result.msg}</span>
        </div>
      )}
    </div>
  );
}
