import { FC, useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Globe,
  KeyRound,
  LogOut,
  FileSpreadsheet,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { MacroMetric, Frequency, Category, isGlobalIndicator } from '../types.ts';
import { MetricCard } from './MetricCard.tsx';
import { CsvUploadModal } from './CsvUploadModal.tsx';
import { InsightsAdminManager } from './InsightsAdminManager.tsx';
import { BookOpen } from 'lucide-react';

interface AdminDashboardProps {
  metrics: MacroMetric[];
  onAddNew: () => void;
  onEdit: (metric: MacroMetric) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (metric: MacroMetric) => void;
  onMoveMetric: (index: number, direction: 'up' | 'down') => void;
  onPopulateSampleSpec: () => void;
  onResetOfficialSpec?: () => void;
  onClearAll: () => void;
  onOpenCalendar: () => void;
  loading: boolean;
  onRefreshMetrics?: () => Promise<void> | void;
  onBatchUpdateMetrics?: (newMetrics: MacroMetric[], rawCsv?: string) => Promise<void> | void;
  onOpenPasswordChange?: () => void;
  onLogout?: () => void;
}

export const AdminDashboard: FC<AdminDashboardProps> = ({
  metrics,
  onAddNew,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveMetric,
  onPopulateSampleSpec,
  onResetOfficialSpec,
  onClearAll,
  onOpenCalendar,
  loading,
  onRefreshMetrics,
  onBatchUpdateMetrics,
  onOpenPasswordChange,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<'ALL' | 'DOMESTIC' | 'GLOBAL'>('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'indicators' | 'insights'>('indicators');

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setFeedback(null);
    try {
      if (onRefreshMetrics) {
        await onRefreshMetrics();
      }
      setFeedback('Indicators refreshed successfully from CSV.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/metrics/export-csv', '_blank');
  };

  const domesticCount = useMemo(() => metrics.filter((m) => !isGlobalIndicator(m)).length, [metrics]);
  const globalCount = useMemo(() => metrics.filter((m) => isGlobalIndicator(m)).length, [metrics]);
  const publishedCount = metrics.filter((m) => m.isPublished).length;
  const draftCount = metrics.length - publishedCount;

  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const isGlobal = isGlobalIndicator(m);
      const matchesScope =
        selectedScope === 'ALL' ||
        (selectedScope === 'GLOBAL' && isGlobal) ||
        (selectedScope === 'DOMESTIC' && !isGlobal);

      const matchesSearch =
        (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.sourceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.targetAnchor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.slug || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFreq =
        selectedFrequency === 'ALL' || m.frequency === selectedFrequency;
      const matchesCat =
        selectedCategory === 'ALL' || m.category === selectedCategory;

      return matchesScope && matchesSearch && matchesFreq && matchesCat;
    });
  }, [metrics, selectedScope, searchQuery, selectedFrequency, selectedCategory]);

  return (
    <div id="admin-cms-dashboard" className="space-y-6 animate-fade-in pb-16">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Macro Indicators Manager
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct CSV architecture • Updates reflect immediately on client site
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {adminTab === 'indicators' && (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Reload metrics directly from data/metrics.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Reloading...' : 'Reload CSV'}</span>
            </button>
          )}

          {onOpenPasswordChange && (
            <button
              type="button"
              onClick={onOpenPasswordChange}
              title="Change Admin Password"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Password</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Log out of Admin Dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Module Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setAdminTab('indicators')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'indicators'
              ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Macro Indicators (CSV)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
            {metrics.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('insights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'insights'
              ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <span>Insights &amp; Blog Engine</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            SEO Ready
          </span>
        </button>
      </div>

      {adminTab === 'insights' ? (
        <InsightsAdminManager />
      ) : (
        <>
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

      {/* CSV Status & Action Banner */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Direct CSV Data Engine Active
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                data/metrics.csv
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Updating or uploading your CSV immediately refreshes the indicators on the frontend. No external database or complex setup required.
            </p>
          </div>

          {/* Primary CSV Upload & Download Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Upload Metrics CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onAddNew}
              className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Indicator</span>
            </button>
          </div>
        </div>

        {/* Quick Specimen / Reset Controls */}
        <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] flex-wrap">
            <span>Total: <strong>{metrics.length}</strong></span>
            <span>•</span>
            <span>🇮🇳 Domestic: <strong>{domesticCount}</strong></span>
            <span>•</span>
            <span>🌐 Global: <strong>{globalCount}</strong></span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400">Live: <strong>{publishedCount}</strong></span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">Draft: <strong>{draftCount}</strong></span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onPopulateSampleSpec}
              title="Loads specimen cards from prompt (FII/DII, Forex, M3)"
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Load Specimen (3 Cards)</span>
            </button>

            {onResetOfficialSpec && (
              <button
                type="button"
                onClick={onResetOfficialSpec}
                title="Resets to official macro indicators specification"
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3 h-3 text-blue-500" />
                <span>Reset to Official CSV</span>
              </button>
            )}

            {metrics.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                title="Wipes all indicators"
                className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter & View Controls */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Scope Switcher and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedScope('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedScope === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({metrics.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('DOMESTIC')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedScope === 'DOMESTIC'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇮🇳 Domestic ({domesticCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('GLOBAL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedScope === 'GLOBAL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌐 Global ({globalCount})
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indicators, sources..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Dropdowns & View Mode */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Frequency filter */}
          <select
            value={selectedFrequency}
            onChange={(e) => setSelectedFrequency(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          >
            <option value="ALL">All Frequencies</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="FORTNIGHTLY">Fortnightly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="MPC">MPC</option>
            <option value="FOMC">FOMC</option>
            <option value="ECB MEETING">ECB Meeting</option>
            <option value="BIMONTHLY">Bimonthly</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          >
            <option value="ALL">All Categories</option>
            <option value="GLOBAL">GLOBAL (International)</option>
            <option value="REAL ECONOMY">Real Economy</option>
            <option value="INFLATION">Inflation</option>
            <option value="MONETARY">Monetary</option>
            <option value="EXTERNAL">External</option>
            <option value="FISCAL">Fiscal</option>
            <option value="MARKETS">Markets</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="INDUSTRY">Industry</option>
          </select>

          {/* Grid vs Table toggle */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics List / Cards View */}
      {filteredMetrics.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No indicators match your filter
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Try resetting your search query or upload a metrics CSV file.
          </p>
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Metrics CSV</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMetrics.map((metric, index) => (
            <div key={metric.id} className="relative group">
              <MetricCard metric={metric} />

              {/* Admin Floating Control Ribbon */}
              <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMoveMetric(index, 'up')}
                    disabled={index === 0}
                    title="Move up"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onMoveMetric(index, 'down')}
                    disabled={index === filteredMetrics.length - 1}
                    title="Move down"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[10px] text-slate-400 ml-1">
                    #{metric.order || index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onTogglePublish(metric)}
                    title={metric.isPublished ? 'Unpublish' : 'Publish'}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      metric.isPublished
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {metric.isPublished ? 'Live' : 'Draft'}
                  </button>

                  <button
                    onClick={() => onEdit(metric)}
                    title="Edit Indicator"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDelete(metric.id)}
                    title="Delete Indicator"
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Indicator</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Delta / Change</th>
                  <th className="py-3 px-4">Source & Release</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMetrics.map((metric, index) => (
                  <tr
                    key={metric.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">
                      #{metric.order || index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {metric.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {metric.slug || metric.id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {metric.category}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {metric.frequency}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {metric.value} <span className="font-normal text-slate-500 text-[11px]">{metric.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {metric.deltaDisplay || metric.deltaValue || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <div>{metric.sourceName}</div>
                      <div className="text-[10px] text-slate-400">{metric.releaseDate}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <button
                        onClick={() => onTogglePublish(metric)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          metric.isPublished
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {metric.isPublished ? 'Live' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(metric)}
                          title="Edit"
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(metric.id)}
                          title="Delete"
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onUploadSuccess={async (newMetrics, rawCsv) => {
          if (newMetrics && onBatchUpdateMetrics) {
            await onBatchUpdateMetrics(newMetrics, rawCsv);
          } else if (onRefreshMetrics) {
            await onRefreshMetrics();
          }
        }}
      />
    </div>
  );
};
