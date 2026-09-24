import { FC } from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { MacroNestLogo } from './MacroNestLogo.tsx';

interface HeaderProps {
  currentView: 'dashboard' | 'global' | 'admin' | 'calendar' | 'calculator';
  onViewChange: (view: 'dashboard' | 'global' | 'admin' | 'calendar' | 'calculator') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  metricsCount: number;
  globalMetricsCount?: number;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const Header: FC<HeaderProps> = ({
  currentView,
  onViewChange,
  darkMode,
  onToggleDarkMode,
  metricsCount,
  globalMetricsCount = 0,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-4">
          <button
            id="nav-brand-btn"
            onClick={() => onViewChange('dashboard')}
            className="flex items-center group cursor-pointer focus:outline-none transition-transform hover:opacity-90"
            aria-label="MacroNest.online Home"
          >
            <MacroNestLogo className="h-11 sm:h-13 w-auto" />
          </button>
        </div>

        {/* Center: Clean public navigation */}
        {currentView !== 'admin' ? (
          <nav id="top-public-nav" className="flex items-center gap-1 sm:gap-2">
            <button
              id="top-nav-indicators"
              onClick={() => onViewChange('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'dashboard'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Domestic ({metricsCount})</span>
            </button>

            <button
              id="top-nav-global"
              onClick={() => onViewChange('global')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'global'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>Global Indicators ({globalMetricsCount})</span>
            </button>

            <button
              id="top-nav-calendar"
              onClick={() => onViewChange('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentView === 'calendar'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Calendar</span>
            </button>

            <button
              id="top-nav-calculator"
              onClick={() => onViewChange('calculator')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'calculator'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>EMI Calculator</span>
              <span className="hidden md:inline text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                New
              </span>
            </button>
          </nav>
        ) : (
          /* If in Admin mode, show mode label and back button */
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 uppercase tracking-wider">
              Admin Portal
            </span>
            <button
              onClick={() => onViewChange('dashboard')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
            >
              ← Back to Indicators
            </button>
          </div>
        )}

        {/* Right: Day/Dark Mode Toggle (No Admin button visible to public) */}
        <div className="flex items-center gap-2">
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleDarkMode}
            aria-label="Toggle day and dark mode"
            title={darkMode ? 'Switch to Day mode' : 'Switch to Dark mode'}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
