import { useState, useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { transactionApi } from '../api/transactionApi';
import type { UploadResponse } from '../types';

interface CsvUploadProps {
  onUploadSuccess: (data: UploadResponse) => void;
}

export default function CsvUpload({ onUploadSuccess }: CsvUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setResult(null);

    try {
      const data = await transactionApi.upload(file);
      setResult({ success: true, message: data.message });
      onUploadSuccess(data);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Upload failed';
      setResult({ success: false, message: msg });
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const name = rejections[0]?.file?.name ?? 'file';
    setResult({
      success: false,
      message: `"${name}" was rejected. Please choose a file ending in .csv`,
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'application/octet-stream': ['.csv'],
      'text/plain': ['.csv'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const dropzoneClass = `dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''}`;

  return (
    <div className="fade-in-up">
      <div {...getRootProps()} className={dropzoneClass} id="csv-dropzone">
        <input {...getInputProps()} id="csv-file-input" />
        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Processing transactions...
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Parsing CSV, categorizing with AI, and detecting anomalies
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center
                            group-hover:bg-[var(--color-bg-card-hover)] transition-colors">
                {isDragActive ? (
                  <FileText className="w-8 h-8 text-[var(--color-accent)]" />
                ) : (
                  <Upload className="w-8 h-8 text-[var(--color-text-secondary)]" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {isDragActive ? 'Drop your CSV here' : 'Upload Bank Transactions'}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Drag & drop a CSV file, or click to browse.
                  <span className="block mt-1 text-[var(--color-text-muted)]">
                    Expected columns: date, description, amount
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {result && (
        <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 fade-in-up ${
          result.success
            ? 'bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]'
            : 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]'
        }`} id="upload-result">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-[var(--color-success)] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[var(--color-danger)] shrink-0" />
          )}
          <p className={`text-sm font-medium ${
            result.success ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
          }`}>
            {result.message}
          </p>
        </div>
      )}
    </div>
  );
}
