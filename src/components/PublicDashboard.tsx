import { FC, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MacroMetric } from '../types.ts';
import { MetricCard } from './MetricCard.tsx';
import { EmptyState } from './EmptyState.tsx';

interface PublicDashboardProps {
  metrics: MacroMetric[];
}

export const PublicDashboard: FC<PublicDashboardProps> = ({ metrics }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCadence, setSelectedCadence] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Only published metrics appear on the public dashboard
  const publishedMetrics = useMemo(() => {
    return metrics.filter((m) => m.isPublished);
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    return publishedMetrics.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.targetAnchor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.summary.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCadence =
        selectedCadence === 'ALL' ||
        (selectedCadence === 'DAILY' && m.frequency === 'DAILY') ||
        (selectedCadence === 'WEEKLY' && m.frequency === 'WEEKLY') ||
        (selectedCadence === 'MONTHLY' && m.frequency === 'MONTHLY') ||
        (selectedCadence === 'QUARTERLY' &&
          (m.frequency === 'BIMONTHLY' ||
            m.frequency === 'QUARTERLY' ||
            m.frequency === 'HALF-YEARLY'));

      const matchesCat =
        selectedCategory === 'ALL' || m.category === selectedCategory;

      return matchesSearch && matchesCadence && matchesCat;
    });
  }, [publishedMetrics, searchQuery, selectedCadence, selectedCategory]);

  if (publishedMetrics.length === 0) {
    return <EmptyState />;
  }

  return (
    <div id="public-macro-dashboard" className="space-y-6 animate-fade-in pb-16">
      {/* Sleek, Non-Hero Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        {/* Cadence Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCadence('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Indicators ({publishedMetrics.length})
          </button>
          <button
            onClick={() => setSelectedCadence('DAILY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'DAILY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setSelectedCadence('WEEKLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'WEEKLY'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setSelectedCadence('MONTHLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'MONTHLY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedCadence('QUARTERLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'QUARTERLY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Quarterly / MPC
          </button>
        </div>

        {/* Minimal Search Input */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search indicator, source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Indicators Grid */}
      {filteredMetrics.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
          No indicators match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {/* Discrete Footer Info */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center sm:text-left text-[11px] text-slate-500 dark:text-slate-400">
        Official release schedules referenced from RBI, MoSPI, Ministry of Commerce, and NSDL.
      </div>
    </div>
  );
};
