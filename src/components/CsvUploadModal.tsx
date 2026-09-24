import { FC, useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Layers,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';
import { MacroMetric, isGlobalIndicator } from '../types.ts';
import { parseMetricsCSV } from '../utils/csvParser.ts';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newMetrics?: MacroMetric[], rawCsv?: string) => Promise<void> | void;
}

export const CsvUploadModal: FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<{
    metrics: MacroMetric[];
    errors: string[];
    totalRows: number;
  } | null>(null);
  const [syncMode, setSyncMode] = useState<'replace' | 'upsert'>('replace');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessCsvText = (text: string, fileName?: string) => {
    setFileContent(text);
    const result = parseMetricsCSV(text);
    setParsedPreview(result);
    if (result.metrics.length > 0) {
      const globalCount = result.metrics.filter(isGlobalIndicator).length;
      const domesticCount = result.metrics.length - globalCount;
      setStatusMessage({
        type: 'info',
        text: `Parsed ${result.metrics.length} indicators (${domesticCount} Domestic, ${globalCount} Global) from ${fileName || 'CSV'}. Domestic cards will appear in Domestic Indicators and Global cards will appear in Global Indicators. Review before applying.`,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: result.errors[0] || 'Could not parse indicators from the CSV.',
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleProcessCsvText(text, file.name);
      };
      reader.readAsText(file);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Please drop a valid .csv file.',
      });
    }
  };

  const handleLoadOfficialCsv = async () => {
    setUploading(true);
    setStatusMessage({ type: 'info', text: 'Loading official 23 indicators from server...' });
    try {
      const res = await fetch('/api/metrics/template-csv');
      if (!res.ok) throw new Error('Could not fetch default CSV');
      const csvText = await res.text();
      setSelectedFile(new File([csvText], 'macro_indicators_official_23.csv', { type: 'text/csv' }));
      handleProcessCsvText(csvText, 'Official 23 Macro Indicators');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to load official CSV' });
    } finally {
      setUploading(false);
    }
  };

  const handleCommitUpload = async () => {
    if (!fileContent && !selectedFile) {
      setStatusMessage({ type: 'error', text: 'Please select a CSV file first.' });
      return;
    }

    setUploading(true);
    setStatusMessage(null);

    try {
      // 1. Ensure parsed indicators are ready
      const parsed = parsedPreview || parseMetricsCSV(fileContent);
      if (!parsed.metrics || parsed.metrics.length === 0) {
        throw new Error('No valid macro indicators found in the CSV.');
      }

      // 2. Persist locally to browser immediately
      try {
        localStorage.setItem('macronest_indicators_cache_v3', JSON.stringify(parsed.metrics));
        localStorage.setItem('macronest_raw_csv_v3', fileContent);
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('macronest_live_sync');
          ch.postMessage({ type: 'METRICS_UPDATED', metrics: parsed.metrics });
          ch.close();
        }
      } catch (_) {}

      // 3. Immediately trigger client UI update
      if (onUploadSuccess) {
        await onUploadSuccess(parsed.metrics, fileContent);
      }

      // 4. Send to backend server
      const token =
        (typeof window !== 'undefined' &&
          (sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token'))) ||
        '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/metrics/upload-csv?mode=${syncMode}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          csvContent: fileContent,
          mode: syncMode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (Status: ${res.status})`);
      }

      const data = await res.json();
      const updatedMetrics = data.metrics || parsed.metrics;

      // Persist and broadcast synchronized indicators
      try {
        localStorage.setItem('macronest_indicators_cache_v3', JSON.stringify(updatedMetrics));
        localStorage.setItem('macronest_raw_csv_v3', fileContent);
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('macronest_live_sync');
          ch.postMessage({ type: 'METRICS_UPDATED', metrics: updatedMetrics });
          ch.close();
        }
      } catch (_) {}

      if (onUploadSuccess) {
        await onUploadSuccess(updatedMetrics, fileContent);
      }

      setStatusMessage({
        type: 'success',
        text: `Success! Synchronized ${data.totalUploaded || updatedMetrics.length} indicators (${data.publishedCount ?? updatedMetrics.length} published). Client site updated.`,
      });

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error occurred while saving CSV metrics.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/metrics/template-csv';
  };

  const handleExportCurrent = () => {
    window.location.href = '/api/metrics/export-csv';
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setFileContent('');
    setParsedPreview(null);
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      id="modal-csv-upload"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                <span>Upload Macro Indicators CSV</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  24 Fields Supported
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Import and bulk-update national macroeconomic parameters, release windows, stance states, and anchors.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="my-4 overflow-y-auto flex-1 pr-1 space-y-5">
          {/* Status feedback bar */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                  : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
              {statusMessage.type === 'info' && <Database className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Quick Action Bar for Official CSV & Templates */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Want to load the official <strong>23 Central Macro Indicators</strong> sheet?
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadOfficialCsv}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Official 23 Indicators CSV</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportCurrent}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Current CSV</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            id="csv-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedFile ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedFile.name}</span>
                  ) : (
                    'Click to select or drag and drop your CSV file here'
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Accepts standard comma-separated .csv files formatted with official macroeconomic indicator columns.
                </p>
              </div>
            </div>
          </div>

          {/* Sync Mode Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Sync Mode
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose how the uploaded CSV affects existing records
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="replace"
                  checked={syncMode === 'replace'}
                  onChange={() => setSyncMode('replace')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Replace All (Recommended Master Sync)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer ml-3">
                <input
                  type="radio"
                  name="syncMode"
                  value="upsert"
                  checked={syncMode === 'upsert'}
                  onChange={() => setSyncMode('upsert')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Upsert / Update by Slug</span>
              </label>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsedPreview && parsedPreview.metrics.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>Preview ({parsedPreview.metrics.length} indicators ready to sync)</span>
                </span>
                <span className="text-slate-500">
                  {parsedPreview.metrics.filter((m) => m.isPublished).length} Published ·{' '}
                  {parsedPreview.metrics.filter((m) => !m.isPublished).length} Drafts
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Section</th>
                      <th className="p-2.5">Indicator Title</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Freq</th>
                      <th className="p-2.5">Value</th>
                      <th className="p-2.5">Delta</th>
                      <th className="p-2.5">Stance / State</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {parsedPreview.metrics.map((m, idx) => {
                      const isGlobal = isGlobalIndicator(m);
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/60">
                          <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2.5">
                            {isGlobal ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                🌐 Global
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                🇮🇳 Domestic
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            {m.title}
                            <div className="text-[10px] font-mono text-slate-400">{m.slug || m.id}</div>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{m.category}</td>
                          <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{m.frequency}</td>
                          <td className="p-2.5 font-extrabold text-slate-950 dark:text-white">
                            {m.value} {m.unit}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">{m.deltaDisplay || m.deltaValue || '—'}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300 truncate max-w-[140px]" title={m.stanceState}>
                            {m.stanceState || '—'}
                          </td>
                          <td className="p-2.5">
                            {m.isPublished ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Published
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Draft
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetSelection}
            disabled={uploading || (!selectedFile && !fileContent)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 cursor-pointer"
          >
            Clear Selection
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-apply-csv-metrics"
              type="button"
              onClick={handleCommitUpload}
              disabled={uploading || (!parsedPreview || parsedPreview.metrics.length === 0)}
              className="px-5 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <span>Updating Indicators...</span>
              ) : (
                <>
                  <span>Apply & Synchronize ({parsedPreview?.metrics.length || 0})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
