import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Header } from './components/Header.tsx';
import { PublicDashboard } from './components/PublicDashboard.tsx';
import { MacroMetric, isGlobalIndicator } from './types.ts';
import { updatePageSEO } from './utils/seo.ts';
import { parseMetricsCSV } from './utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from './data/defaultMetrics.ts';
import { MacroNestLogo } from './components/MacroNestLogo.tsx';
import { BackToTop } from './components/BackToTop.tsx';

// Code-split heavy interactive subviews to eliminate unused JS on initial dashboard load
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx').then(m => ({ default: m.AdminDashboard })));
const AdminLogin = lazy(() => import('./components/AdminLogin.tsx').then(m => ({ default: m.AdminLogin })));
const AdminPasswordChangeModal = lazy(() => import('./components/AdminPasswordChangeModal.tsx').then(m => ({ default: m.AdminPasswordChangeModal })));
const MacroCalendarView = lazy(() => import('./components/MacroCalendarView.tsx').then(m => ({ default: m.MacroCalendarView })));
const RepoRateCalculator = lazy(() => import('./components/RepoRateCalculator.tsx').then(m => ({ default: m.RepoRateCalculator })));
const InsightsView = lazy(() => import('./components/InsightsView.tsx').then(m => ({ default: m.InsightsView })));
const MetricEditorModal = lazy(() => import('./components/MetricEditorModal.tsx').then(m => ({ default: m.MetricEditorModal })));

export default function App() {
  // Initialize with cached client data if available, otherwise default verified indicators
  const [metrics, setMetrics] = useState<MacroMetric[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('macronest_indicators_cache_v4');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return DEFAULT_MACRO_METRICS;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'global' | 'admin' | 'calendar' | 'calculator' | 'insights'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/global')) return 'global';
      if (path.startsWith('/calendar')) return 'calendar';
      if (path.startsWith('/calculator')) return 'calculator';
      if (path.startsWith('/insights')) return 'insights';
    }
    return 'dashboard';
  });
  const [initialInsightSlug, setInitialInsightSlug] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/insights\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    return undefined;
  });
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingMetric, setEditingMetric] = useState<MacroMetric | null>(null);

  // Admin Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || null;
    }
    return null;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState<boolean>(false);

  // Day / Dark mode state — defaults to clean light theme
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
    }
    return false;
  });

  // Apply dark mode class to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Check Admin Authentication Status
  const verifyAuth = useCallback(async (token: string) => {
    try {
      if (token.startsWith('admin-client-session-')) {
        setIsAdminAuthenticated(true);
        setMustChangePassword(false);
        return;
      }

      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdminAuthenticated(true);
        setMustChangePassword(Boolean(data.mustChangePassword));
      } else {
        setIsAdminAuthenticated(false);
        setAdminToken(null);
        sessionStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token');
      }
    } catch (_) {
      // Offline fallback: allow authenticated session
      setIsAdminAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      verifyAuth(adminToken);
    } else {
      setIsAdminAuthenticated(false);
    }
  }, [adminToken, verifyAuth]);

  const handleLoginSuccess = (token: string, mustChange: boolean) => {
    setAdminToken(token);
    setIsAdminAuthenticated(true);
    setMustChangePassword(mustChange);
    sessionStorage.setItem('admin_token', token);
    localStorage.setItem('admin_token', token);
    setCurrentView('admin');
    if (window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin');
    }
  };

  const handleLogout = async () => {
    try {
      if (adminToken && !adminToken.startsWith('admin-client-session-')) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    } catch (_) {}
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token');
    setCurrentView('dashboard');
    window.history.pushState(null, '', '/');
  };

  // Synchronize state across open tabs and browser memory immediately
  const persistMetrics = useCallback((newMetrics: MacroMetric[]) => {
    newMetrics.sort((a, b) => (a.order || 0) - (b.order || 0));
    setMetrics(newMetrics);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('macronest_indicators_cache_v3', JSON.stringify(newMetrics));
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('macronest_live_sync');
          ch.postMessage({ type: 'METRICS_UPDATED', metrics: newMetrics });
          ch.close();
        }
      } catch (_) {}
    }
  }, []);

  // Listen for broadcast channel updates from Admin or other tabs
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('macronest_live_sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'METRICS_UPDATED' && Array.isArray(event.data.metrics)) {
          setMetrics(event.data.metrics);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'macronest_indicators_cache_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMetrics(parsed);
          }
        } catch (_) {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Path-based client routing
  const parseUrlState = useCallback((): 'dashboard' | 'global' | 'admin' | 'calendar' | 'calculator' | 'insights' => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin')) {
      return 'admin';
    } else if (path.startsWith('/global')) {
      return 'global';
    } else if (path.startsWith('/calendar')) {
      return 'calendar';
    } else if (path.startsWith('/calculator')) {
      return 'calculator';
    } else if (path.startsWith('/insights')) {
      return 'insights';
    }
    return 'dashboard';
  }, []);

  // Initialize view from URL and handle browser popstate
  useEffect(() => {
    const view = parseUrlState();
    setCurrentView(view);

    const handlePopState = () => {
      const nextView = parseUrlState();
      setCurrentView(nextView);
      const match = window.location.pathname.match(/^\/insights\/([a-zA-Z0-9_-]+)/);
      if (match) {
        setInitialInsightSlug(match[1]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseUrlState]);

  // Synchronize document SEO and Canonical URL whenever view changes
  useEffect(() => {
    if (currentView === 'dashboard') {
      updatePageSEO({
        title: 'MacroNest.online | India Macroeconomic Indicators & Research',
        description:
          'MacroNest.online - Knowledge Today, A Brighter Tomorrow. Track Indian macroeconomic indicators, RBI repo rate anchors, banking system liquidity, CPI inflation, forex reserves, and GDP prints directly from official statutory feeds.',
        canonicalUrl: 'https://macronest.online/',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      });
    } else if (currentView === 'global') {
      updatePageSEO({
        title: 'Global Macroeconomic Indicators & Rates | MacroNest.online',
        description:
          'Track US Federal Reserve policy rates, US CPI inflation, nonfarm payrolls, 10Y US Treasury yields, Dollar Index (DXY), Brent crude, gold, ECB rate decisions, and China PMI.',
        canonicalUrl: 'https://macronest.online/global',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      });
    } else if (currentView === 'calendar') {
      updatePageSEO({
        title: 'India Macro Data Release Calendar | MacroNest.online',
        description:
          'Official release schedule and publication calendar for Indian economic data, including RBI MPC decisions, CPI inflation, GDP prints, and MoSPI releases.',
        canonicalUrl: 'https://macronest.online/calendar',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Schedule',
          name: 'India Macro Data Release Calendar',
          description:
            'Official release schedule for Indian macroeconomic indicators and RBI monetary policy committee announcements.',
          url: 'https://macronest.online/calendar',
        },
      });
    } else if (currentView === 'calculator') {
      updatePageSEO({
        title: 'RBI Repo Rate EMI & Savings Calculator | MacroNest.online',
        description:
          'Simulate how RBI repo rate changes affect your Home Loan EMI, tenure, and bank Fixed Deposit returns with official External Benchmark Lending Rate (EBLR) formulas.',
        canonicalUrl: 'https://macronest.online/calculator',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'FinancialProduct',
          name: 'RBI Repo Rate EMI & Savings Calculator',
          description:
            'Interactive Indian macroeconomic calculator simulating the effect of RBI MPC policy repo rate adjustments on retail floating loans and fixed deposits.',
          url: 'https://macronest.online/calculator',
        },
      });
    } else if (currentView === 'insights') {
      updatePageSEO({
        title: 'Macroeconomic Insights & Policy Briefings | MacroNest.online',
        description:
          'Authoritative macroeconomic research, RBI monetary policy commentary, inflation dynamics, GST buoyancy, and fiscal trajectory analysis by MacroNest.',
        canonicalUrl: 'https://macronest.online/insights',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'MacroNest Insights',
          description: 'Macroeconomic policy analysis and Indian economic intelligence.',
          url: 'https://macronest.online/insights',
        },
      });
    } else if (currentView === 'admin') {
      updatePageSEO({
        title: 'Admin Portal | MacroNest.online',
        description: 'MacroNest.online Administrator Content & Data Management Portal.',
        canonicalUrl: 'https://macronest.online/admin',
        robots: 'noindex, nofollow',
      });
    }

    // Google Analytics page_view trigger for SPA navigation
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, [currentView]);

  // Navigate view and update URL history
  const handleViewChange = (view: 'dashboard' | 'global' | 'admin' | 'calendar' | 'calculator' | 'insights') => {
    setCurrentView(view);

    let targetPath = '/';
    if (view === 'global') targetPath = '/global';
    else if (view === 'admin') targetPath = '/admin';
    else if (view === 'calendar') targetPath = '/calendar';
    else if (view === 'calculator') targetPath = '/calculator';
    else if (view === 'insights') targetPath = '/insights';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  /**
   * Fetch metrics directly from server API or static CSV file.
   * Guarantees that whether on backend server, local dev, or static client preview,
   * the application displays the latest data from the CSV file.
   */
  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    let loadedMetrics: MacroMetric[] | null = null;

    // 1. Try server API endpoint (reads data/metrics.csv directly)
    try {
      const res = await fetch(`/api/metrics?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          loadedMetrics = data;
        }
      }
    } catch (err) {
      console.warn('API fetch failed, falling back to static CSV:', err);
    }

    // 2. Direct static CSV fallback (for static hosting or preview)
    if (!loadedMetrics) {
      try {
        const csvRes = await fetch(`/data/metrics.csv?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        });
        const contentType = csvRes.headers.get('content-type') || '';
        if (csvRes.ok && (contentType.includes('csv') || contentType.includes('text'))) {
          const csvText = await csvRes.text();
          const parsed = parseMetricsCSV(csvText);
          if (parsed.metrics && parsed.metrics.length > 0) {
            loadedMetrics = parsed.metrics;
          }
        }
      } catch (err) {
        console.warn('Static /data/metrics.csv fetch failed:', err);
      }
    }

    // 3. Fallback to /metrics.csv
    if (!loadedMetrics) {
      try {
        const rootCsvRes = await fetch(`/metrics.csv?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        });
        const contentType = rootCsvRes.headers.get('content-type') || '';
        if (rootCsvRes.ok && (contentType.includes('csv') || contentType.includes('text'))) {
          const csvText = await rootCsvRes.text();
          const parsed = parseMetricsCSV(csvText);
          if (parsed.metrics && parsed.metrics.length > 0) {
            loadedMetrics = parsed.metrics;
          }
        }
      } catch (err) {
        console.warn('Static /metrics.csv fetch failed:', err);
      }
    }

    if (loadedMetrics && loadedMetrics.length > 0) {
      persistMetrics(loadedMetrics);
    }
    setIsRefreshing(false);
  }, [persistMetrics]);

  // Initial load and periodic background sync (every 15s + when window regains focus)
  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(() => {
      fetchMetrics();
    }, 15000);

    const handleFocus = () => {
      fetchMetrics();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchMetrics]);

  // Batch update handler called from CSV upload modal
  const handleBatchUpdateMetrics = async (newMetrics: MacroMetric[]) => {
    persistMetrics(newMetrics);
  };

  // Content Management: Save metric (Create or Update)
  const handleSaveMetric = async (metricData: Partial<MacroMetric>) => {
    try {
      if (editingMetric && editingMetric.id) {
        const updated = metrics.map((m) =>
          m.id === editingMetric.id ? { ...m, ...metricData, updatedAt: new Date().toISOString() } : m
        );
        persistMetrics(updated);
        setIsEditorOpen(false);
        setEditingMetric(null);

        await fetch(`/api/metrics/${editingMetric.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metricData),
        });
      } else {
        const newMetric: MacroMetric = {
          ...(metricData as any),
          id: metricData.id || `metric-${Date.now()}`,
          order: metrics.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [...metrics, newMetric];
        persistMetrics(updated);
        setIsEditorOpen(false);
        setEditingMetric(null);

        await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metricData),
        });
      }
    } catch (err) {
      console.warn('Network sync notice (client state is saved):', err);
    }
  };

  // Content Management: Delete metric
  const handleDeleteMetric = async (id: string) => {
    if (!confirm('Are you sure you want to delete this indicator?')) return;
    const updated = metrics.filter((m) => m.id !== id && m.slug !== id);
    persistMetrics(updated);

    try {
      await fetch(`/api/metrics/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Server delete notice (client state is updated):', err);
    }
  };

  // Content Management: Toggle publish status
  const handleTogglePublish = async (metric: MacroMetric) => {
    const updated = metrics.map((m) =>
      m.id === metric.id ? { ...m, isPublished: !m.isPublished, updatedAt: new Date().toISOString() } : m
    );
    persistMetrics(updated);

    try {
      await fetch(`/api/metrics/${metric.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !metric.isPublished }),
      });
    } catch (err) {
      console.warn('Server toggle notice (client state is updated):', err);
    }
  };

  // Content Management: Reorder metrics
  const handleMoveMetric = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= metrics.length) return;

    const newMetrics = [...metrics];
    const [moved] = newMetrics.splice(index, 1);
    newMetrics.splice(targetIndex, 0, moved);

    const reordered = newMetrics.map((m, i) => ({ ...m, order: i + 1 }));
    persistMetrics(reordered);

    try {
      await fetch('/api/metrics/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      });
    } catch (err) {
      console.warn('Server reorder notice (client state is updated):', err);
    }
  };

  // Content Management: Clear all metrics
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all indicators?')) return;
    persistMetrics([]);
    try {
      await fetch('/api/metrics/clear', { method: 'POST' });
    } catch (err) {
      console.warn('Server clear notice (client state is updated):', err);
    }
  };

  // Populate sample screenshot spec metrics
  const handlePopulateSampleSpec = async () => {
    try {
      const res = await fetch('/api/metrics/populate-sample', { method: 'POST' });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to populate sample spec:', err);
    }
  };

  // Reset to 23 official macro indicators
  const handleResetOfficialSpec = async () => {
    try {
      persistMetrics(DEFAULT_MACRO_METRICS);
      const res = await fetch('/api/metrics/reset-template', { method: 'POST' });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.warn('Server reset notice (client state is reset):', err);
    }
  };

  const domesticPublishedCount = metrics.filter((m) => m.isPublished && !isGlobalIndicator(m)).length;
  const globalPublishedCount = metrics.filter((m) => m.isPublished && isGlobalIndicator(m)).length;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Sticky Header with Day/Dark mode toggle */}
      <Header
        currentView={currentView}
        onViewChange={(view) => handleViewChange(view)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        metricsCount={domesticPublishedCount}
        globalMetricsCount={globalPublishedCount}
        onRefreshData={fetchMetrics}
        isRefreshing={isRefreshing}
      />

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {loading && metrics.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-4" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Loading macroeconomic indicators from CSV...
            </p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="py-20 text-center">
                <div className="w-8 h-8 mx-auto border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-4" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Loading view...
                </p>
              </div>
            }
          >
            {currentView === 'admin' ? (
              !isAdminAuthenticated ? (
                <AdminLogin
                  onLoginSuccess={handleLoginSuccess}
                  onCancel={() => handleViewChange('dashboard')}
                />
              ) : (
                <AdminDashboard
                  metrics={metrics}
                  onAddNew={() => {
                    setEditingMetric(null);
                    setIsEditorOpen(true);
                  }}
                  onEdit={(metric) => {
                    setEditingMetric(metric);
                    setIsEditorOpen(true);
                  }}
                  onDelete={handleDeleteMetric}
                  onTogglePublish={handleTogglePublish}
                  onMoveMetric={handleMoveMetric}
                  onPopulateSampleSpec={handlePopulateSampleSpec}
                  onResetOfficialSpec={handleResetOfficialSpec}
                  onClearAll={handleClearAll}
                  onOpenCalendar={() => handleViewChange('calendar')}
                  loading={loading}
                  onRefreshMetrics={fetchMetrics}
                  onBatchUpdateMetrics={handleBatchUpdateMetrics}
                  onOpenPasswordChange={() => setIsPasswordChangeModalOpen(true)}
                  onLogout={handleLogout}
                />
              )
            ) : currentView === 'calendar' ? (
              <MacroCalendarView />
            ) : currentView === 'calculator' ? (
              <RepoRateCalculator
                metrics={metrics}
                onNavigateHome={() => handleViewChange('dashboard')}
              />
            ) : currentView === 'insights' ? (
              <InsightsView
                initialSlug={initialInsightSlug}
                onNavigateHome={() => handleViewChange('dashboard')}
              />
            ) : (
              <PublicDashboard
                metrics={metrics}
                activeTab={currentView === 'global' ? 'global' : 'domestic'}
                onTabChange={(tab) => handleViewChange(tab === 'global' ? 'global' : 'dashboard')}
                onOpenCalculator={() => handleViewChange('calculator')}
              />
            )}
          </Suspense>
        )}
      </main>

      {/* Footer */}
      {currentView !== 'admin' && (
        <footer id="app-footer" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-300 py-6 mt-16 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <MacroNestLogo className="h-8 w-auto" />
              <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
              <span className="text-center sm:text-left text-slate-700 dark:text-slate-300 font-medium">Primary Data Feeds: RBI, MoSPI, Ministry of Finance, CCIL</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
              <button
                onClick={() => handleViewChange('insights')}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Macroeconomic Insights & Research Briefings"
              >
                Insights
              </button>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <button
                onClick={() => handleViewChange('calculator')}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="RBI Repo Rate EMI & Savings Calculator"
              >
                EMI Calculator
              </button>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <button
                onClick={() => handleViewChange('calendar')}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="India Macro Data Release Calendar"
              >
                Calendar
              </button>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <a
                href="/data/metrics.csv"
                target="_blank"
                download="metrics.csv"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-slate-700 dark:text-slate-300"
                title="Download raw metrics CSV"
              >
                Data Feed (CSV)
              </a>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-slate-700 dark:text-slate-300"
                title="Google XML Sitemap"
              >
                Sitemap (XML)
              </a>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-slate-700 dark:text-slate-300"
                title="Search Engine & AI Crawler Directives"
              >
                Robots.txt
              </a>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold text-slate-800 dark:text-slate-200"
                title="AI Search & LLM Context File (llms.txt standard)"
              >
                AI Search Spec (llms.txt)
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Content Management Editor Modal for Metrics */}
      {isEditorOpen && (
        <Suspense fallback={null}>
          <MetricEditorModal
            isOpen={isEditorOpen}
            initialData={editingMetric}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingMetric(null);
            }}
            onSave={handleSaveMetric}
          />
        </Suspense>
      )}

      {/* Admin Password Change / First Login Modal */}
      {(isPasswordChangeModalOpen || (isAdminAuthenticated && mustChangePassword)) && (
        <Suspense fallback={null}>
          <AdminPasswordChangeModal
            isOpen={isPasswordChangeModalOpen || (isAdminAuthenticated && mustChangePassword)}
            isFirstLogin={mustChangePassword}
            token={adminToken || ''}
            onClose={() => setIsPasswordChangeModalOpen(false)}
            onSuccess={() => {
              setMustChangePassword(false);
              setIsPasswordChangeModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* Floating Back to Top Button */}
      <BackToTop showThreshold={300} />
    </div>
  );
}
