import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { PublicDashboard } from './components/PublicDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { AdminPasswordChangeModal } from './components/AdminPasswordChangeModal.tsx';
import { MacroCalendarView } from './components/MacroCalendarView.tsx';
import { MetricEditorModal } from './components/MetricEditorModal.tsx';
import { MacroMetric, MacroCalendarTemplate } from './types.ts';
import { updatePageSEO } from './utils/seo.ts';
import { parseMetricsCSV } from './utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from './data/defaultMetrics.ts';
import { MacroNestLogo } from './components/MacroNestLogo.tsx';

export default function App() {
  // Initialize with the verified metrics parsed directly from data/metrics.csv
  const [metrics, setMetrics] = useState<MacroMetric[]>(DEFAULT_MACRO_METRICS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'calendar'>('dashboard');
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
        if (data.authenticated) {
          setIsAdminAuthenticated(true);
          setMustChangePassword(Boolean(data.mustChangePassword));
          return;
        }
      } else if (res.status === 404) {
        // Static hosting fallback
        setIsAdminAuthenticated(true);
        return;
      }
      // If token invalid, clear
      setIsAdminAuthenticated(false);
      setAdminToken(null);
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
    } catch (err) {
      console.error('Auth verification error:', err);
      if (token) {
        setIsAdminAuthenticated(true);
      }
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      verifyAuth(adminToken);
    }
  }, [adminToken, verifyAuth]);

  // Handle Login Success
  const handleLoginSuccess = (token: string, mustChange: boolean) => {
    setAdminToken(token);
    setIsAdminAuthenticated(true);
    setMustChangePassword(mustChange);
    sessionStorage.setItem('admin_token', token);
    localStorage.setItem('admin_token', token);
  };

  // Handle Logout
  const handleLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token');
  };

  // URL-based routing
  const parseUrlState = useCallback((): 'dashboard' | 'admin' | 'calendar' => {
    if (typeof window === 'undefined') return 'dashboard';
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (path.includes('/admin') || search.includes('admin') || search.includes('view=admin')) {
      return 'admin';
    }
    if (path.includes('/calendar') || search.includes('calendar') || search.includes('view=calendar')) {
      return 'calendar';
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
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseUrlState]);

  // Navigate view and update URL history
  const handleViewChange = (view: 'dashboard' | 'admin' | 'calendar') => {
    setCurrentView(view);

    let targetPath = '/';
    if (view === 'admin') targetPath = '/admin';
    else if (view === 'calendar') targetPath = '/calendar';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    if (view === 'dashboard') {
      updatePageSEO({
        title: 'India Macro Indicators | Official Central Economic Monitor',
        description:
          'Official macroeconomic dashboard tracking India banking liquidity, repo rate anchors, CPI inflation, forex reserves, and GDP prints directly from verified data feeds.',
      });
    }
  };

  /**
   * Fetch metrics directly from server API or static CSV file.
   * Guarantees that whether on backend server, local dev, or static client preview,
   * the application displays the latest data from the CSV file.
   */
  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Try server API endpoint (reads data/metrics.csv directly)
      const res = await fetch(`/api/metrics?_t=${Date.now()}`);
      if (res.ok) {
        const data: MacroMetric[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setMetrics(data);
          setIsRefreshing(false);
          return;
        }
      }

      // 2. Direct static CSV fallback (for static hosting or preview)
      const csvRes = await fetch(`/data/metrics.csv?_t=${Date.now()}`);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        const parsed = parseMetricsCSV(csvText);
        if (parsed.metrics && parsed.metrics.length > 0) {
          setMetrics(parsed.metrics);
          setIsRefreshing(false);
          return;
        }
      }

      // 3. Fallback to /metrics.csv
      const rootCsvRes = await fetch(`/metrics.csv?_t=${Date.now()}`);
      if (rootCsvRes.ok) {
        const csvText = await rootCsvRes.text();
        const parsed = parseMetricsCSV(csvText);
        if (parsed.metrics && parsed.metrics.length > 0) {
          setMetrics(parsed.metrics);
          setIsRefreshing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Network fetch failed, relying on bundled CSV data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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

  // Content Management: Save metric (Create or Update)
  const handleSaveMetric = async (metricData: Partial<MacroMetric>) => {
    try {
      if (editingMetric && editingMetric.id) {
        const res = await fetch(`/api/metrics/${editingMetric.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metricData),
        });
        if (res.ok) {
          await fetchMetrics();
          setIsEditorOpen(false);
          setEditingMetric(null);
        }
      } else {
        const res = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metricData),
        });
        if (res.ok) {
          await fetchMetrics();
          setIsEditorOpen(false);
          setEditingMetric(null);
        }
      }
    } catch (err) {
      console.error('Failed to save metric:', err);
    }
  };

  // Content Management: Delete metric
  const handleDeleteMetric = async (id: string) => {
    if (!confirm('Are you sure you want to delete this indicator?')) return;
    try {
      const res = await fetch(`/api/metrics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to delete metric:', err);
    }
  };

  // Content Management: Toggle publish status
  const handleTogglePublish = async (metric: MacroMetric) => {
    try {
      const res = await fetch(`/api/metrics/${metric.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !metric.isPublished }),
      });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to toggle publish:', err);
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
    setMetrics(reordered);

    try {
      await fetch('/api/metrics/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      });
    } catch (err) {
      console.error('Failed to reorder metrics on server:', err);
    }
  };

  // Content Management: Clear all metrics
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all indicators?')) return;
    try {
      const res = await fetch('/api/metrics/clear', { method: 'POST' });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to clear metrics:', err);
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

  // Reset to 16 official macro indicators
  const handleResetOfficialSpec = async () => {
    try {
      const res = await fetch('/api/metrics/reset-template', { method: 'POST' });
      if (res.ok) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to reset official spec:', err);
    }
  };

  // Template select helper from Macro Calendar
  const handleSelectTemplateToCreate = (template: MacroCalendarTemplate) => {
    const newMetricTemplate: Partial<MacroMetric> = {
      title: template.report,
      category: template.category,
      frequency: template.frequency,
      value: '',
      unit: template.defaultUnit,
      deltaValue: '',
      deltaType: 'neutral',
      targetAnchor: template.defaultTargetAnchor,
      summary: template.note || '',
      sourceName: template.source,
      sourceUrl: template.sourceUrl,
      releaseDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      releaseWindow: template.window,
      isPublished: true,
    };

    setEditingMetric(newMetricTemplate as MacroMetric);
    setIsEditorOpen(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Sticky Header with Day/Dark mode toggle */}
      <Header
        currentView={currentView}
        onViewChange={(view) => handleViewChange(view)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        metricsCount={metrics.filter((m) => m.isPublished).length}
        onRefreshData={fetchMetrics}
        isRefreshing={isRefreshing}
      />

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {loading && metrics.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-4" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading macroeconomic indicators from CSV...
            </p>
          </div>
        ) : currentView === 'admin' ? (
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
              onOpenPasswordChange={() => setIsPasswordChangeModalOpen(true)}
              onLogout={handleLogout}
            />
          )
        ) : currentView === 'calendar' ? (
          <MacroCalendarView
            onSelectTemplateToCreate={(tmpl) => {
              handleSelectTemplateToCreate(tmpl);
            }}
          />
        ) : (
          <PublicDashboard metrics={metrics} />
        )}
      </main>

      {/* Footer */}
      {currentView !== 'admin' && (
        <footer id="app-footer" className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 py-6 mt-16 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <MacroNestLogo className="h-8 w-auto" />
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-center sm:text-left">Primary Data Feeds: RBI, MoSPI, Ministry of Finance, CCIL</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
              <button
                type="button"
                onClick={() => handleViewChange('admin')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer font-medium"
                title="Open Content & Data Admin Portal"
              >
                Admin Portal
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="/data/metrics.csv"
                target="_blank"
                download="metrics.csv"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Download raw metrics CSV"
              >
                Data Feed (CSV)
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Google XML Sitemap"
              >
                Sitemap (XML)
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Search Engine & AI Crawler Directives"
              >
                Robots.txt
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium text-slate-600 dark:text-slate-300"
                title="AI Search & LLM Context File (llms.txt standard)"
              >
                AI Search Spec (llms.txt)
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Content Management Editor Modal for Metrics */}
      <MetricEditorModal
        isOpen={isEditorOpen}
        initialData={editingMetric}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingMetric(null);
        }}
        onSave={handleSaveMetric}
      />

      {/* Admin Password Change / First Login Modal */}
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
    </div>
  );
}
