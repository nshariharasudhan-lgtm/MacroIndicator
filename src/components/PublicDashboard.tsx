import { FC, useState, useMemo } from 'react';
import { Search, Calculator, ArrowRight, Globe, TrendingUp, Sparkles } from 'lucide-react';
import { MacroMetric, isGlobalIndicator } from '../types.ts';
import { MetricCard } from './MetricCard.tsx';
import { EmptyState } from './EmptyState.tsx';

interface PublicDashboardProps {
  metrics: MacroMetric[];
  activeTab?: 'domestic' | 'global';
  onTabChange?: (tab: 'domestic' | 'global') => void;
  onOpenCalculator?: () => void;
}

export const PublicDashboard: FC<PublicDashboardProps> = ({
  metrics,
  activeTab = 'domestic',
  onTabChange,
  onOpenCalculator,
}) => {
  const [internalTab, setInternalTab] = useState<'domestic' | 'global'>(activeTab);
  const currentTab = onTabChange ? activeTab : internalTab;

  const handleSwitchTab = (tab: 'domestic' | 'global') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCadence, setSelectedCadence] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Segregate metrics into Domestic vs Global based on category and indicator slug
  const { domesticMetrics, globalMetrics } = useMemo(() => {
    const domestic: MacroMetric[] = [];
    const global: MacroMetric[] = [];

    metrics.forEach((m) => {
      if (isGlobalIndicator(m)) {
        global.push(m);
      } else {
        domestic.push(m);
      }
    });

    return { domesticMetrics: domestic, globalMetrics: global };
  }, [metrics]);

  const publishedDomestic = useMemo(() => domesticMetrics.filter((m) => m.isPublished !== false), [domesticMetrics]);
  const publishedGlobal = useMemo(() => globalMetrics.filter((m) => m.isPublished !== false), [globalMetrics]);

  // Active pool based on selected tab
  const activePool = currentTab === 'global' ? publishedGlobal : publishedDomestic;

  const filteredMetrics = useMemo(() => {
    return activePool.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        (m.slug || '').toLowerCase().includes(q) ||
        m.sourceName.toLowerCase().includes(q) ||
        m.targetAnchor.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        (m.stanceState || '').toLowerCase().includes(q);

      const freq = (m.frequency || '').toUpperCase();
      const matchesCadence =
        selectedCadence === 'ALL' ||
        (selectedCadence === 'DAILY' && freq === 'DAILY') ||
        (selectedCadence === 'WEEKLY' && freq === 'WEEKLY') ||
        (selectedCadence === 'FORTNIGHTLY' && freq === 'FORTNIGHTLY') ||
        (selectedCadence === 'MONTHLY' && freq === 'MONTHLY') ||
        (selectedCadence === 'MEETINGS' && (freq === 'MPC' || freq === 'FOMC' || freq.includes('ECB') || freq === 'BIMONTHLY')) ||
        (selectedCadence === 'QUARTERLY' &&
          (freq === 'QUARTERLY' || freq === 'HALF-YEARLY' || freq === 'BIMONTHLY' || freq === 'MPC'));

      const matchesCat =
        selectedCategory === 'ALL' || m.category === selectedCategory;

      return matchesSearch && matchesCadence && matchesCat;
    });
  }, [activePool, searchQuery, selectedCadence, selectedCategory]);

  if (publishedDomestic.length === 0 && publishedGlobal.length === 0) {
    return <EmptyState />;
  }

  return (
    <div id="public-macro-dashboard" className="space-y-6 animate-fade-in pb-16">
      {/* Top Scope Switcher Tabs: Domestic vs Global */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 sm:p-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            id="tab-domestic-indicators"
            onClick={() => {
              handleSwitchTab('domestic');
              setSelectedCadence('ALL');
              setSelectedCategory('ALL');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'domestic'
                ? 'bg-white text-slate-950 dark:bg-slate-800 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="text-base">🇮🇳</span>
            <span>Domestic Indicators</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono ${
                currentTab === 'domestic'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {publishedDomestic.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-global-indicators"
            onClick={() => {
              handleSwitchTab('global');
              setSelectedCadence('ALL');
              setSelectedCategory('ALL');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'global'
                ? 'bg-white text-slate-950 dark:bg-slate-800 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-4 h-4 text-sky-500" />
            <span>Global Indicators</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono ${
                currentTab === 'global'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {publishedGlobal.length}
            </span>
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pr-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Compiled from RBI, MoSPI &amp; GSTN</span>
        </div>
      </div>

      {/* Global Section Context Card (when Global tab is active) */}
      {currentTab === 'global' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-slate-50 to-indigo-50/70 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/90 border border-sky-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                  International Macroeconomic Benchmarks
                </span>
                <span className="text-[10px] bg-sky-200 dark:bg-sky-900/80 text-sky-900 dark:text-sky-200 font-extrabold px-1.5 py-0.5 rounded-full">
                  GLOBAL
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Global Policy Rates, Commodity Benchmarks &amp; External Drivers
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Track US Federal Reserve policy, US CPI inflation, nonfarm payrolls, 10Y US Treasury yields, US Dollar Index (DXY), Brent crude, gold, ECB rate decisions, and China PMI directly impacting India’s trade deficit, rupee exchange rate, and capital flows.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        {/* Cadence Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCadence('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All {currentTab === 'global' ? 'Global' : 'Domestic'} ({activePool.length})
          </button>

          <button
            onClick={() => setSelectedCadence('DAILY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'DAILY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Daily
          </button>

          {currentTab === 'domestic' && (
            <>
              <button
                onClick={() => setSelectedCadence('WEEKLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCadence === 'WEEKLY'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Weekly
              </button>

              <button
                onClick={() => setSelectedCadence('FORTNIGHTLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCadence === 'FORTNIGHTLY'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Fortnightly
              </button>
            </>
          )}

          <button
            onClick={() => setSelectedCadence('MONTHLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === 'MONTHLY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Monthly
          </button>

          <button
            onClick={() => setSelectedCadence(currentTab === 'global' ? 'MEETINGS' : 'QUARTERLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCadence === (currentTab === 'global' ? 'MEETINGS' : 'QUARTERLY')
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {currentTab === 'global' ? 'Central Bank (FOMC/ECB)' : 'Quarterly / MPC'}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={
              currentTab === 'global'
                ? 'Search Fed, DXY, Brent, Gold...'
                : 'Search CPI, GST, Repo, GDP...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Featured Interactive Tool Banner (shown on Domestic tab) */}
      {currentTab === 'domestic' && onOpenCalculator && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-amber-50/70 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Interactive Simulator
                </span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                  NEW
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                RBI Repo Rate Impact on Home Loan EMI &amp; Bank Fixed Deposits
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Simulate how RBI MPC rate cuts or hikes pass through to floating loans (EBLR) and term deposits.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenCalculator}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 justify-center shadow-xs"
          >
            <span>Open Calculator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Indicators Grid */}
      {filteredMetrics.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
          No {currentTab === 'global' ? 'global' : 'domestic'} indicators match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {/* Discrete Footer Info */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div>
          {currentTab === 'global'
            ? 'Data compiled from official sources: US Federal Reserve (FOMC), US Bureau of Labor Statistics, European Central Bank, ICE, and NBS China.'
            : 'Data compiled from official sources such as RBI, MoSPI and GSTN, plus other public sources.'}
        </div>
        <div className="text-right">
          Showing {filteredMetrics.length} of {activePool.length} {currentTab === 'global' ? 'global' : 'domestic'} indicators
        </div>
      </div>
    </div>
  );
};
