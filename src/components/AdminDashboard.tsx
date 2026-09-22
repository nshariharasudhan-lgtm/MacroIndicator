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
  BookOpen,
  Globe,
  KeyRound,
  LogOut,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { MacroMetric, Frequency, Category, BlogPost } from '../types.ts';
import { MetricCard } from './MetricCard.tsx';
import { AdminBlogCMS } from './AdminBlogCMS.tsx';
import { SupabaseSetupModal } from './SupabaseSetupModal.tsx';
import { CsvUploadModal } from './CsvUploadModal.tsx';

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
  // Blog CMS props
  posts?: BlogPost[];
  onSavePost?: (post: Partial<BlogPost> & { id?: string }) => Promise<void>;
  onDeletePost?: (id: string) => Promise<void>;
  onTogglePublishPost?: (post: BlogPost) => Promise<void>;
  onResetPosts?: () => Promise<void>;
  // Auth & Database Props
  onOpenPasswordChange?: () => void;
  onLogout?: () => void;
  supabaseStatus?: {
    supabaseConfigured: boolean;
    supabaseUrl: string | null;
    mode: string;
    message: string;
  } | null;
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
  posts = [],
  onSavePost,
  onDeletePost,
  onTogglePublishPost,
  onResetPosts,
  onOpenPasswordChange,
  onLogout,
  supabaseStatus,
}) => {
  const [adminSection, setAdminSection] = useState<'indicators' | 'blog'>('indicators');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncToSupabase = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/sync-all-to-supabase', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync to Supabase');
      }
      setSyncFeedback(data.message || `Synced ${data.syncedMetricsCount || 0} parameters & ${data.syncedArticlesCount || 0} articles to Supabase.`);
      if (onRefreshMetrics) onRefreshMetrics();
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setSyncFeedback(`Error: ${err.message}`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } finally {
      setSyncing(false);
    }
  };

  const handlePurgeAndSyncSupabase = async () => {
    if (!window.confirm('This will purge any stale/conflicting/legacy indicators from Supabase macro_parameters and resync the current indicators. Proceed?')) {
      return;
    }
    setPurging(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/purge-stale-supabase-metrics', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purge stale Supabase metrics');
      }
      setSyncFeedback(data.message || `Purged ${data.purgedCount || 0} obsolete indicators from Supabase.`);
      if (onRefreshMetrics) onRefreshMetrics();
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      setSyncFeedback(`Error: ${err.message}`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } finally {
      setPurging(false);
    }
  };

  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.targetAnchor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.value.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFreq =
        selectedFrequency === 'ALL' || m.frequency === selectedFrequency;
      const matchesCat =
        selectedCategory === 'ALL' || m.category === selectedCategory;

      return matchesSearch && matchesFreq && matchesCat;
    });
  }, [metrics, searchQuery, selectedFrequency, selectedCategory]);

  const publishedCount = metrics.filter((m) => m.isPublished).length;
  const draftCount = metrics.length - publishedCount;

  return (
    <div id="admin-cms-dashboard" className="space-y-6 animate-fade-in pb-16">
      {/* Top Navigation & Utility Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        {/* Simple Admin Module Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setAdminSection('indicators')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminSection === 'indicators'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Macro Indicators</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
              {metrics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSection('blog')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminSection === 'blog'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Articles & Full SEO</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {posts.length}
            </span>
          </button>
        </div>

        {/* Admin Utility Actions (Database Schema, Password Security, Logout) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            title="View Supabase Schema & Connection Status"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Database:</span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              {supabaseStatus?.supabaseConfigured ? 'Supabase' : 'Schema'}
            </span>
          </button>

          {onOpenPasswordChange && (
            <button
              type="button"
              onClick={onOpenPasswordChange}
              title="Change Admin Password"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Security</span>
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

      {adminSection === 'blog' ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                Editorial CMS
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Full SEO & Schema.org Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">
              Insights & Editorial CMS
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Publish macroeconomic analysis articles, configure optimal meta title and description character lengths, manage JSON-LD structured data, and preview live Google search snippets.
            </p>
          </div>

          <AdminBlogCMS
            posts={posts}
            onSavePost={onSavePost!}
            onDeletePost={onDeletePost!}
            onTogglePublish={onTogglePublishPost!}
            onResetPosts={onResetPosts}
          />
        </div>
      ) : (
        <>
          {/* Admin Header Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                Backend CMS
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                /admin URL route
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Macro Metrics Content Management
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Create, update, order, and toggle publishing for all macroeconomic indicators, data sources, values, and anchors.
            </p>

            {/* Quick stats pills */}
            <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
              <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Total Indicators: <strong>{metrics.length}</strong></span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                Published: <strong>{publishedCount}</strong>
              </span>
              {draftCount > 0 && (
                <span className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60">
                  Drafts: <strong>{draftCount}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              id="btn-admin-upload-csv"
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold text-xs sm:text-sm hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              title="Upload CSV file with all macroeconomic metrics"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Upload CSV</span>
            </button>

            <button
              id="btn-admin-add-new"
              type="button"
              onClick={onAddNew}
              className="px-4 py-2.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs sm:text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Metric</span>
            </button>

            <button
              id="btn-admin-open-calendar"
              type="button"
              onClick={onOpenCalendar}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Calendar Reference</span>
            </button>
          </div>
        </div>

        {/* Diagnostic / Admin Tools strip */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Rule adherence:</strong> Metrics start unpopulated. You can enter live data or test with the prompt's specimen cards below.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              title="Upload CSV for all metrics (supports full 24-field schema)"
              className="px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Upload Metrics CSV</span>
            </button>

            {onResetOfficialSpec && (
              <button
                type="button"
                onClick={onResetOfficialSpec}
                title="Loads the full set of 16 official macroeconomic indicators without numbers"
                className="px-3 py-1 rounded-lg border border-blue-300 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Reset to 16 Official Indicators (No Numbers)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncToSupabase}
              disabled={syncing || purging}
              title="Force synchronize all local parameters and articles to Supabase"
              className="px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{syncing ? 'Syncing...' : 'Sync to Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={handlePurgeAndSyncSupabase}
              disabled={syncing || purging}
              title="Purges any stale/conflicting legacy indicators in Supabase macro_parameters and resyncs active metrics"
              className="px-3 py-1 rounded-lg border border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{purging ? 'Purging Stale...' : 'Purge Stale & Sync Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={onPopulateSampleSpec}
              title="Populates the 3 reference cards from the attached screenshot (FII/DII, Forex Reserves, M3 Money Supply)"
              className="px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Load Specimen (3 Cards)</span>
            </button>

            {metrics.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                title="Wipes all indicators from storage to maintain zero dummy data"
                className="px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All Data</span>
              </button>
            )}
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* Filter & View Controls */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search indicator, source, anchor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Cadence:</span>
          </div>
          <select
            value={selectedFrequency}
            onChange={(e) => setSelectedFrequency(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Frequencies</option>
            <option value="DAILY">DAILY</option>
            <option value="WEEKLY">WEEKLY</option>
            <option value="MONTHLY">MONTHLY</option>
            <option value="BIMONTHLY">BIMONTHLY</option>
            <option value="QUARTERLY">QUARTERLY</option>
            <option value="HALF-YEARLY">HALF-YEARLY</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="MARKETS">MARKETS</option>
            <option value="EXTERNAL">EXTERNAL</option>
            <option value="MONETARY">MONETARY</option>
            <option value="INFLATION">INFLATION</option>
            <option value="REAL ECONOMY">REAL ECONOMY</option>
            <option value="FISCAL">FISCAL</option>
            <option value="INDUSTRY">INDUSTRY</option>
            <option value="COMMODITIES">COMMODITIES</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 ml-2 bg-slate-50 dark:bg-slate-950">
            <button
              onClick={() => setViewMode('grid')}
              title="Card Preview Grid"
              className={`p-1.5 rounded-md text-xs cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Structured Table View"
              className={`p-1.5 rounded-md text-xs cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {metrics.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Layers className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No indicators in CMS database
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            The database currently has no records, respecting the requirement to avoid dummy data. Click below to add an indicator or load the reference spec.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onAddNew}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Metric</span>
            </button>
            <button
              onClick={onPopulateSampleSpec}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Load Reference Spec (3 Cards)</span>
            </button>
          </div>
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
          No metrics matched your current filter criteria.
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View (Live visual preview matching screenshot) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetrics.map((metric, idx) => (
            <div key={metric.id} className="relative group/wrapper">
              {/* Card ordering and toggle toolbar above card */}
              <div className="mb-2 flex items-center justify-between text-xs px-1">
                <span className="font-mono text-[11px] text-slate-400">
                  #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMoveMetric(idx, 'up')}
                    disabled={idx === 0}
                    title="Move earlier"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onMoveMetric(idx, 'down')}
                    disabled={idx === filteredMetrics.length - 1}
                    title="Move later"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onTogglePublish(metric)}
                    title={metric.isPublished ? 'Unpublish (hide from public)' : 'Publish on live dashboard'}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                      metric.isPublished
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {metric.isPublished ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Live</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Draft</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* The Actual Display Card */}
              <MetricCard
                metric={metric}
                isAdmin={true}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Structured Table View */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Indicator & Category</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4">Value & Unit</th>
                  <th className="py-3 px-4">Delta / Trend</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source & Date</th>
                  <th className="py-3 px-4">Live</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMetrics.map((metric, idx) => (
                  <tr key={metric.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {metric.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="uppercase font-semibold">{metric.category}</span>
                        <span>·</span>
                        <span className="truncate max-w-xs">{metric.targetAnchor}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {metric.frequency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <strong className="text-slate-950 dark:text-white font-bold">
                        {metric.value}
                      </strong>{' '}
                      <span className="text-slate-500">{metric.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {metric.deltaValue || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {metric.status}
                      </span>
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

      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        supabaseStatus={supabaseStatus || null}
        onRefreshMetrics={onRefreshMetrics}
      />

  <CsvUploadModal
    isOpen={isCsvModalOpen}
    onClose={() => setIsCsvModalOpen(false)}
    onUploadSuccess={async () => {
      if (onRefreshMetrics) {
        await onRefreshMetrics();
      }
    }}
  />
</div>
  );
};
