import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Header } from './components/Header.tsx';
import { PublicDashboard } from './components/PublicDashboard.tsx';
import { MacroMetric } from './types.ts';
import { updatePageSEO } from './utils/seo.ts';
import { DEFAULT_MACRO_METRICS } from './data/defaultMetrics.ts';
import { MacroNestLogo } from './components/MacroNestLogo.tsx';
import { BackToTop } from './components/BackToTop.tsx';

// Code-split interactive subviews
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx').then((m) => ({ default: m.AdminDashboard })));
const AdminLogin = lazy(() => import('./components/AdminLogin.tsx').then((m) => ({ default: m.AdminLogin })));
const AdminPasswordChangeModal = lazy(() => import('./components/AdminPasswordChangeModal.tsx').then((m) => ({ default: m.AdminPasswordChangeModal })));
const MacroCalendarView = lazy(() => import('./components/MacroCalendarView.tsx').then((m) => ({ default: m.MacroCalendarView })));
const RepoRateCalculator = lazy(() => import('./components/RepoRateCalculator.tsx').then((m) => ({ default: m.RepoRateCalculator })));
const InsightsView = lazy(() => import('./components/InsightsView.tsx').then((m) => ({ default: m.InsightsView })));
const MetricEditorModal = lazy(() => import('./components/MetricEditorModal.tsx').then((m) => ({ default: m.MetricEditorModal })));
const AboutView = lazy(() => import('./components/AboutView.tsx').then((m) => ({ default: m.AboutView })));
const MethodologyView = lazy(() => import('./components/MethodologyView.tsx').then((m) => ({ default: m.MethodologyView })));
const ContactView = lazy(() => import('./components/ContactView.tsx').then((m) => ({ default: m.ContactView })));
const PrivacyView = lazy(() => import('./components/PrivacyView.tsx').then((m) => ({ default: m.PrivacyView })));

export type AppView =
  | 'dashboard'
  | 'global'
  | 'admin'
  | 'calendar'
  | 'calculator'
  | 'insights'
  | 'about'
  | 'methodology'
  | 'contact'
  | 'privacy';

export default function App() {
  // Initialize with live embedded metrics if present, otherwise localStorage cache, then default verified indicators
  const [metrics, setMetrics] = useState<MacroMetric[]>(() => {
    if (typeof window !== 'undefined') {
      if (Array.isArray((window as any).__INITIAL_METRICS__) && (window as any).__INITIAL_METRICS__.length > 0) {
        return (window as any).__INITIAL_METRICS__;
      }
      try {
        const cached = localStorage.getItem('macronest_indicators_cache_v3');
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
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/global')) return 'global';
      if (path.startsWith('/calendar')) return 'calendar';
      if (path.startsWith('/calculator')) return 'calculator';
      if (path.startsWith('/insights')) return 'insights';
      if (path.startsWith('/about')) return 'about';
      if (path.startsWith('/methodology')) return 'methodology';
      if (path.startsWith('/contact')) return 'contact';
      if (path.startsWith('/privacy')) return 'privacy';
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

      const res = await fetch('/api/admin/auth-status', {
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
          try {
            localStorage.setItem('macronest_indicators_cache_v3', JSON.stringify(event.data.metrics));
          } catch (_) {}
        }
      };
    }

    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Path-based client routing
  const parseUrlState = useCallback((): AppView => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/global')) return 'global';
    if (path.startsWith('/calendar')) return 'calendar';
    if (path.startsWith('/calculator')) return 'calculator';
    if (path.startsWith('/insights')) return 'insights';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/methodology')) return 'methodology';
    if (path.startsWith('/contact')) return 'contact';
    if (path.startsWith('/privacy')) return 'privacy';
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
    const ogImage = 'https://macronest.online/og-image.png';

    if (currentView === 'dashboard') {
      updatePageSEO({
        title: 'MacroNest.online | India Macroeconomic Indicators & Policy Rates',
        description:
          'MacroNest tracks Indian macroeconomic indicators compiled from official sources including RBI repo rate, CPI inflation, forex reserves, GST, and GDP growth.',
        canonicalUrl: 'https://macronest.online/',
        ogImage,
      });
    } else if (currentView === 'global') {
      updatePageSEO({
        title: 'Global Macroeconomic Indicators & Rates | MacroNest.online',
        description:
          'Track US Federal Reserve policy rates, US CPI inflation, nonfarm payrolls, 10Y US Treasury yields, Dollar Index (DXY), Brent crude, gold, and ECB decisions.',
        canonicalUrl: 'https://macronest.online/global',
        ogImage,
      });
    } else if (currentView === 'calendar') {
      updatePageSEO({
        title: 'India Macro Data Release Calendar | MacroNest.online',
        description:
          'Official release schedule and publication calendar for Indian economic data, including RBI MPC decisions, CPI inflation, GDP prints, and MoSPI releases.',
        canonicalUrl: 'https://macronest.online/calendar',
        ogImage,
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
        ogImage,
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
        ogImage,
      });
    } else if (currentView === 'about') {
      updatePageSEO({
        title: 'About Us | MacroNest.online',
        description:
          'Learn about MacroNest, an independent platform tracking Indian and global macroeconomic indicators compiled from RBI, MoSPI, GSTN, and official public sources.',
        canonicalUrl: 'https://macronest.online/about',
        ogImage,
      });
    } else if (currentView === 'methodology') {
      updatePageSEO({
        title: 'Data Methodology & Verification | MacroNest.online',
        description:
          'Understand the methodology behind MacroNest data compilation, EBLR loan formulas, statutory release cycles, and multi-source verification protocols.',
        canonicalUrl: 'https://macronest.online/methodology',
        ogImage,
      });
    } else if (currentView === 'contact') {
      updatePageSEO({
        title: 'Contact Research Desk | MacroNest.online',
        description:
          'Contact the MacroNest research desk for macroeconomic data questions, editorial feedback, and indicator inquiries.',
        canonicalUrl: 'https://macronest.online/contact',
        ogImage,
      });
    } else if (currentView === 'privacy') {
      updatePageSEO({
        title: 'Privacy Policy | MacroNest.online',
        description:
          'Privacy policy and data transparency statement for MacroNest. Calculations run locally in your browser with zero financial tracking.',
        canonicalUrl: 'https://macronest.online/privacy',
        ogImage,
      });
    } else if (currentView === 'admin') {
      updatePageSEO({
        title: 'Admin Portal | MacroNest.online',
        description: 'MacroNest.online Administrator Content & Data Management Portal.',
        canonicalUrl: 'https://macronest.online/admin',
        robots: 'noindex, nofollow',
      });
    }

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, [currentView]);

  // Navigate view and update URL history
  const handleViewChange = (view: AppView) => {
    setCurrentView(view);

    let targetPath = '/';
    if (view === 'global') targetPath = '/global';
    else if (view === 'admin') targetPath = '/admin';
    else if (view === 'calendar') targetPath = '/calendar';
    else if (view === 'calculator') targetPath = '/calculator';
    else if (view === 'insights') targetPath = '/insights';
    else if (view === 'about') targetPath = '/about';
    else if (view === 'methodology') targetPath = '/methodology';
    else if (view === 'contact') targetPath = '/contact';
    else if (view === 'privacy') targetPath = '/privacy';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getAdminHeaders = useCallback(() => {
    const token =
      adminToken ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token')
        : null) ||
      'admin-client-session-live';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [adminToken]);

  /**
   * Fetch metrics strictly from server JSON API.
   * Internal columns are stripped on server. Browser never fetches raw CSV.
   */
  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    let loadedMetrics: MacroMetric[] | null = null;

    try {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      };
      const token =
        adminToken ||
        (typeof window !== 'undefined'
          ? sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token')
          : null);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/metrics?_t=${Date.now()}`, {
        cache: 'no-store',
        headers,
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          loadedMetrics = data;
        }
      }
    } catch (err) {
      console.warn('API fetch notice:', err);
    }

    if (loadedMetrics !== null) {
      persistMetrics(loadedMetrics);
    }
    setIsRefreshing(false);
  }, [persistMetrics, adminToken]);

  // Initial load and periodic background sync (every 60s)
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleBatchUpdateMetrics = async (newMetrics: MacroMetric[]) => {
    persistMetrics(newMetrics);
    setTimeout(() => {
      fetchMetrics();
    }, 400);
  };

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
          headers: getAdminHeaders(),
          body: JSON.stringify(metricData),
        });
      } else {
        const newMetric: MacroMetric = {
          ...metricData,
          id: metricData.id || `metric-${Date.now()}`,
          order: metrics.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as MacroMetric;

        const updated = [...metrics, newMetric];
        persistMetrics(updated);
        setIsEditorOpen(false);
        setEditingMetric(null);

        await fetch('/api/metrics', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify(metricData),
        });
      }
    } catch (err) {
      console.error('Error saving metric:', err);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this indicator?')) {
      const updated = metrics.filter((m) => m.id !== id);
      persistMetrics(updated);

      try {
        await fetch(`/api/metrics/${id}`, {
          method: 'DELETE',
          headers: getAdminHeaders(),
        });
      } catch (err) {
        console.error('Error deleting metric:', err);
      }
    }
  };

  const handleTogglePublish = async (metricOrId: MacroMetric | string) => {
    const id = typeof metricOrId === 'string' ? metricOrId : metricOrId.id;
    const target = metrics.find((m) => m.id === id);
    if (!target) return;

    const newPublished = !target.isPublished;
    const updated = metrics.map((m) => (m.id === id ? { ...m, isPublished: newPublished } : m));
    persistMetrics(updated);

    try {
      await fetch(`/api/metrics/${id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ isPublished: newPublished }),
      });
    } catch (err) {
      console.error('Error toggling publish state:', err);
    }
  };

  const handleMoveMetric = async (indexOrId: number | string, direction: 'up' | 'down') => {
    let index: number;
    if (typeof indexOrId === 'number') {
      index = indexOrId;
    } else {
      index = metrics.findIndex((m) => m.id === indexOrId);
    }
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === metrics.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newMetrics = [...metrics];
    const temp = newMetrics[index];
    newMetrics[index] = newMetrics[targetIndex];
    newMetrics[targetIndex] = temp;

    newMetrics.forEach((m, idx) => {
      m.order = idx + 1;
    });

    persistMetrics(newMetrics);

    try {
      await fetch('/api/metrics/reorder', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ orderedIds: newMetrics.map((m) => m.id) }),
      });
    } catch (err) {
      console.error('Error reordering metrics:', err);
    }
  };

  const handlePopulateSampleSpec = async () => {
    if (window.confirm('Populate with sample indicators? This will replace your current metrics on screen.')) {
      setLoading(true);
      try {
        const res = await fetch('/api/metrics/populate-sample', {
          method: 'POST',
          headers: getAdminHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) {
            persistMetrics(data.metrics);
          }
        }
      } catch (err) {
        console.error('Error populating sample spec:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetOfficialSpec = async () => {
    if (window.confirm('Reload latest indicators directly from official data?')) {
      setLoading(true);
      try {
        await fetchMetrics();
      } catch (err) {
        console.error('Error resetting official spec:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL indicators?')) {
      setLoading(true);
      try {
        const res = await fetch('/api/metrics/clear', {
          method: 'POST',
          headers: getAdminHeaders(),
        });
        if (res.ok) {
          persistMetrics([]);
        }
      } catch (err) {
        console.error('Error clearing metrics:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const domesticCount = metrics.filter((m) => (m.category || '').toUpperCase() !== 'GLOBAL').length;
  const globalCount = metrics.filter((m) => (m.category || '').toUpperCase() === 'GLOBAL').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        currentView={currentView as any}
        onViewChange={(v) => handleViewChange(v as AppView)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        metricsCount={domesticCount}
        globalMetricsCount={globalCount}
        onRefreshData={fetchMetrics}
        isRefreshing={isRefreshing}
      />

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading macroeconomic indicators...</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20 text-xs text-slate-400">
                Loading view...
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
              <MacroCalendarView metrics={metrics} />
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
            ) : currentView === 'about' ? (
              <AboutView onNavigateHome={() => handleViewChange('dashboard')} />
            ) : currentView === 'methodology' ? (
              <MethodologyView onNavigateHome={() => handleViewChange('dashboard')} />
            ) : currentView === 'contact' ? (
              <ContactView onNavigateHome={() => handleViewChange('dashboard')} />
            ) : currentView === 'privacy' ? (
              <PrivacyView onNavigateHome={() => handleViewChange('dashboard')} />
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
        <footer
          id="app-footer"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs text-slate-700 dark:text-slate-300 py-8 mt-16 transition-colors"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  onClick={() => handleViewChange('dashboard')}
                  className="cursor-pointer"
                  aria-label="MacroNest Home"
                >
                  <MacroNestLogo className="h-8 w-auto" />
                </button>
                <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Compiled from official sources: RBI, MoSPI, GSTN, Office of the Economic Adviser, Ministry of Commerce &amp; Industry.
                </span>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold">
                <button
                  onClick={() => handleViewChange('about')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  About
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <button
                  onClick={() => handleViewChange('methodology')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Methodology
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <button
                  onClick={() => handleViewChange('calendar')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Release Calendar
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <button
                  onClick={() => handleViewChange('calculator')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  EMI Calculator
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <button
                  onClick={() => handleViewChange('insights')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Insights
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <button
                  onClick={() => handleViewChange('contact')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Contact
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <button
                  onClick={() => handleViewChange('privacy')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-700 dark:text-slate-300"
                >
                  Sitemap
                </a>
              </div>
            </div>

            {/* Mandatory Disclaimer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="m-0 text-center sm:text-left">
                <strong>Disclaimer:</strong> Not affiliated with RBI or the Government of India. For information only, not financial advice.
              </p>
              <p className="m-0 text-center sm:text-right">
                &copy; {new Date().getFullYear()} MacroNest.online. All rights reserved.
              </p>
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
