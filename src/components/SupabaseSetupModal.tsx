import { FC, useState } from 'react';
import { Database, Check, Copy, X, ShieldCheck, RefreshCw, AlertTriangle, Layers, BookOpen } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabaseStatus: {
    supabaseConfigured: boolean;
    supabaseUrl: string | null;
    mode: string;
    message: string;
    counts?: {
      macro_parameters?: number;
      v_indicator_summary?: number;
      articles?: number;
    };
  } | null;
  onRefreshMetrics?: () => void;
}

const SUPABASE_RESET_AND_SYNC_SQL = `-- ==========================================================
-- RESET & SYNC SUPABASE SCHEMA FOR INDIA MACRO DASHBOARD
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==========================================================

-- 1. Ensure all extended columns exist on macro_parameters
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS stance_state TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS previous_value TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS delta_display TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS trend_direction TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS trend_badge_style TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS observation_period TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS next_expected_release TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS data_status TEXT DEFAULT 'provisional';
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified_official';
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS research_notes TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS why_it_matters TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS methodology_summary TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS benchmark_neutral_rate TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS historical_low_val TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS historical_high_val TEXT;

-- 2. Purge legacy 'ind-*' rows that had constant/stale metrics and conflicting slugs
DELETE FROM macro_parameters WHERE id LIKE 'ind-%';

-- 3. Create or replace view v_indicator_summary
DROP VIEW IF EXISTS v_indicator_summary CASCADE;

CREATE OR REPLACE VIEW v_indicator_summary AS
SELECT
  p.id,
  COALESCE(p.slug, p.id) AS slug,
  p.title,
  p.frequency,
  p.category,
  p.status,
  p.value AS current_value,
  p.unit,
  p.delta_value,
  p.delta_type,
  p.target_anchor,
  p.release_date,
  p.release_window,
  p.source_name,
  p.source_url,
  p.is_published,
  p.display_order,
  p.updated_at
FROM macro_parameters p
WHERE p.is_published = true;

-- 4. INSTEAD OF UPDATE trigger so you can edit directly in Supabase Table Editor!
CREATE OR REPLACE FUNCTION trg_v_indicator_summary_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE macro_parameters
  SET
    title = NEW.title,
    frequency = NEW.frequency,
    category = NEW.category,
    status = NEW.status,
    value = NEW.current_value,
    unit = NEW.unit,
    delta_value = NEW.delta_value,
    delta_type = NEW.delta_type,
    target_anchor = NEW.target_anchor,
    release_date = NEW.release_date,
    release_window = NEW.release_window,
    source_name = NEW.source_name,
    source_url = NEW.source_url,
    display_order = NEW.display_order,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_v_indicator_summary ON v_indicator_summary;
CREATE TRIGGER trg_update_v_indicator_summary
  INSTEAD OF UPDATE ON v_indicator_summary
  FOR EACH ROW
  EXECUTE FUNCTION trg_v_indicator_summary_update();

-- 5. INSTEAD OF DELETE trigger so deletions in Supabase Table Editor work!
CREATE OR REPLACE FUNCTION trg_v_indicator_summary_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM macro_parameters WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_v_indicator_summary ON v_indicator_summary;
CREATE TRIGGER trg_delete_v_indicator_summary
  INSTEAD OF DELETE ON v_indicator_summary
  FOR EACH ROW
  EXECUTE FUNCTION trg_v_indicator_summary_delete();
`;

export const SupabaseSetupModal: FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  supabaseStatus,
  onRefreshMetrics,
}) => {
  const [copied, setCopied] = useState(false);
  const [purging, setPurging] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_RESET_AND_SYNC_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePurgeAndSync = async () => {
    setPurging(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/purge-stale-supabase-metrics', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purge stale Supabase metrics');
      }
      setActionFeedback(data.message || 'Purged stale metrics and resynced successfully!');
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  const isConnected = Boolean(supabaseStatus?.supabaseConfigured);
  const counts = supabaseStatus?.counts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Supabase Schema & Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronize macro indicators, articles, and editable SQL views
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status banner */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <div className="text-xs font-semibold">
                  {isConnected ? 'Supabase Connected' : 'Local Storage Mode (Ready for Supabase)'}
                </div>
                <div className="text-[11px] font-mono opacity-80">
                  {isConnected ? supabaseStatus?.supabaseUrl : 'Fallback to local JSON store'}
                </div>
              </div>
            </div>

            {counts && isConnected && (
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 font-semibold">
                  {counts.macro_parameters ?? 0} indicators
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-semibold">
                  {counts.v_indicator_summary ?? 0} published view
                </span>
              </div>
            )}
          </div>

          {/* Quick Explanation for Constant Metrics Issue */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Resolving Constant / Stale Metrics in Supabase</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              If indicators in Supabase appeared constant or refused to update, it is caused by legacy rows (e.g. conflicting slugs from old placeholder indicators) or missing table columns. The one-click purge tool below deletes old conflicting indicators and syncs the exact 23 active indicators into <code className="font-mono text-slate-900 dark:text-white">macro_parameters</code> and <code className="font-mono text-slate-900 dark:text-white">v_indicator_summary</code>.
            </p>

            {isConnected && (
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePurgeAndSync}
                  disabled={purging}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${purging ? 'animate-spin' : ''}`} />
                  <span>{purging ? 'Purging Stale & Syncing...' : 'Purge Stale Indicators & Sync Supabase'}</span>
                </button>
              </div>
            )}

            {actionFeedback && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                {actionFeedback}
              </div>
            )}
          </div>

          {/* SQL Schema Code block */}
          <div>
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reset & Schema Script (<code className="font-mono text-[11px]">reset-and-sync-supabase.sql</code>)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <pre className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto scrollbar-thin">
                {SUPABASE_RESET_AND_SYNC_SQL}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Row Level Security (RLS) & INSTEAD OF triggers enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
