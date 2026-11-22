import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { uploadCSV } from '../services/api';

const FileUpload = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error', message, telemetry }
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus({
        type: 'error',
        message: 'Invalid file type. Please upload a .csv file (e.g., reviews.csv).',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    try {
      const response = await uploadCSV(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      setUploadStatus({
        type: 'success',
        message: response.message || 'CSV successfully uploaded and analyzed!',
        telemetry: response.telemetry,
        batchId: response.uploadBatchId,
      });

      if (typeof onUploadSuccess === 'function') {
        onUploadSuccess(response);
      }
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Failed to upload and process CSV file.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Upload Reviews CSV</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Automatic data cleaning, deduplication, SHA-256 caching, and Gemini AI batch analysis.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Browse CSV File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800">Processing & Analyzing Reviews...</p>
              <p className="text-xs text-gray-500">
                Parsing CSV ➔ Cleaning Data ➔ Checking Cache ➔ AI Batch Inference (5/batch)
              </p>
            </div>
            <div className="w-64 max-w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-800">
              Drag & drop your <span className="font-bold text-blue-600">reviews.csv</span> file here, or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Supports CSV with review_id, product, rating, and review_text (Max 5MB)
            </p>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div
          className={`mt-4 p-4 rounded-xl border text-xs flex items-start gap-3 ${
            uploadStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1.5">
            <p className="font-semibold text-sm">{uploadStatus.message}</p>
            {uploadStatus.telemetry && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-emerald-800">
                <div>
                  <span className="text-gray-500 block">Total Reviews:</span>
                  <span className="font-bold">{uploadStatus.telemetry.totalReviews}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Unique / Duplicates:</span>
                  <span className="font-bold">
                    {uploadStatus.telemetry.uniqueReviews} / {uploadStatus.telemetry.duplicateReviews}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Cache Hits:</span>
                  <span className="font-bold text-emerald-700">⚡ {uploadStatus.telemetry.cacheHits}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Total Pipeline Time:</span>
                  <span className="font-bold">
                    {(uploadStatus.telemetry.totalProcessingTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
