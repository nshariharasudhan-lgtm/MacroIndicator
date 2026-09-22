import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { PublicDashboard } from './components/PublicDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { AdminPasswordChangeModal } from './components/AdminPasswordChangeModal.tsx';
import { MacroCalendarView } from './components/MacroCalendarView.tsx';
import { MetricEditorModal } from './components/MetricEditorModal.tsx';
import { BlogView } from './components/BlogView.tsx';
import { BlogPostDetail } from './components/BlogPostDetail.tsx';
import { MacroMetric, MacroCalendarTemplate, BlogPost } from './types.ts';
import { updatePageSEO } from './utils/seo.ts';
import { INITIAL_MACRO_METRICS_WITHOUT_NUMBERS } from './data/initialMetrics.ts';
import { INITIAL_BLOG_POSTS } from './data/initialPosts.ts';
import { MacroNestLogo } from './components/MacroNestLogo.tsx';

export default function App() {
  const [metrics, setMetrics] = useState<MacroMetric[]>(INITIAL_MACRO_METRICS_WITHOUT_NUMBERS);
  const [posts, setPosts] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'calendar' | 'blog'>('dashboard');
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
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
  const [supabaseStatus, setSupabaseStatus] = useState<{
    supabaseConfigured: boolean;
    supabaseUrl: string | null;
    mode: string;
    message: string;
  } | null>(null);

  // Day / Dark mode state — defaults to clean white background as requested
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
    }
    return false; // clean white background by default
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

  // Fetch Database & Supabase connection status
  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/db-status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch DB status:', err);
    }
  }, []);

  useEffect(() => {
    fetchDbStatus();
  }, [fetchDbStatus]);

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

  // URL-based routing (Admin Dashboard should be accessible through URL, Blog on top/url)
  const parseUrlState = useCallback((): {
    view: 'dashboard' | 'admin' | 'calendar' | 'blog';
    postSlug: string | null;
  } => {
    if (typeof window === 'undefined') return { view: 'dashboard', postSlug: null };
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (path.includes('/admin') || search.includes('admin') || search.includes('view=admin')) {
      return { view: 'admin', postSlug: null };
    }
    if (path.includes('/calendar') || search.includes('calendar') || search.includes('view=calendar')) {
      return { view: 'calendar', postSlug: null };
    }
    if (path.startsWith('/blog') || search.includes('blog') || search.includes('view=blog')) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const slug = parts[0] === 'blog' && parts[1] ? parts[1] : null;
      return { view: 'blog', postSlug: slug };
    }
    return { view: 'dashboard', postSlug: null };
  }, []);

  // Initialize view from URL and handle browser popstate
  useEffect(() => {
    const state = parseUrlState();
    setCurrentView(state.view);
    setSelectedPostSlug(state.postSlug);

    const handlePopState = () => {
      const nextState = parseUrlState();
      setCurrentView(nextState.view);
      setSelectedPostSlug(nextState.postSlug);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseUrlState]);

  // Navigate view and update URL history
  const handleViewChange = (
    view: 'dashboard' | 'admin' | 'calendar' | 'blog',
    postSlug?: string | null
  ) => {
    setCurrentView(view);
    setSelectedPostSlug(postSlug || null);

    let targetPath = '/';
    if (view === 'admin') targetPath = '/admin';
    else if (view === 'calendar') targetPath = '/calendar';
    else if (view === 'blog') targetPath = postSlug ? `/blog/${postSlug}` : '/blog';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    if (view === 'dashboard') {
      updatePageSEO({
        title: 'India Macro Indicators | Official Central Economic Monitor',
        description:
          'Official macroeconomic dashboard tracking India banking liquidity, repo rate anchors, CPI inflation, forex reserves, and GDP prints with zero dummy numbers.',
      });
    }
  };

  // Fetch metrics from backend API
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const data: MacroMetric[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setMetrics(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  }, []);

  // Fetch blog posts from backend API
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data: BlogPost[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch blog posts:', err);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchPosts()]);
      setLoading(false);
    };
    initData();
  }, [fetchMetrics, fetchPosts]);

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
    if (!confirm('Are you sure you want to delete this metric?')) return;
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

  // Content Management: Clear all metrics (Reset to blank state)
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

  // Reset to 16 official macro indicators without numbers
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

  // ================= BLOG POST CMS ACTIONS ================= //

  const handleSavePost = async (postData: Partial<BlogPost> & { id?: string }) => {
    try {
      if (postData.id) {
        const res = await fetch(`/api/posts/${postData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });
        if (res.ok) {
          await fetchPosts();
        }
      } else {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });
        if (res.ok) {
          await fetchPosts();
        }
      }
    } catch (err) {
      console.error('Failed to save blog post:', err);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPosts();
      }
    } catch (err) {
      console.error('Failed to delete blog post:', err);
    }
  };

  const handleTogglePublishPost = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });
      if (res.ok) {
        await fetchPosts();
      }
    } catch (err) {
      console.error('Failed to toggle post publish:', err);
    }
  };

  const handleResetPosts = async () => {
    if (!confirm('Reset articles to the 3 standard macroeconomic research analyses?')) return;
    try {
      const res = await fetch('/api/posts/reset-template', { method: 'POST' });
      if (res.ok) {
        await fetchPosts();
      }
    } catch (err) {
      console.error('Failed to reset blog posts:', err);
    }
  };

  // Find selected post if in blog post detail view
  const currentPost = selectedPostSlug
    ? posts.find((p) => p.slug === selectedPostSlug || p.id === selectedPostSlug)
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Sticky Header with Day/Dark mode toggle at top-right & Top Navigation for Indicators and Blog */}
      <Header
        currentView={currentView}
        onViewChange={(view) => handleViewChange(view)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        metricsCount={metrics.filter((m) => m.isPublished).length}
      />

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {loading && metrics.length === 0 && posts.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-4" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connecting to macroeconomic backend service...
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
              // Blog CMS Props
              posts={posts}
              onSavePost={handleSavePost}
              onDeletePost={handleDeletePost}
              onTogglePublishPost={handleTogglePublishPost}
              onResetPosts={handleResetPosts}
              // Auth & Supabase Props
              onOpenPasswordChange={() => setIsPasswordChangeModalOpen(true)}
              onLogout={handleLogout}
              supabaseStatus={supabaseStatus}
            />
          )
        ) : currentView === 'calendar' ? (
          <MacroCalendarView
            onSelectTemplateToCreate={(tmpl) => {
              handleSelectTemplateToCreate(tmpl);
            }}
          />
        ) : currentView === 'blog' ? (
          currentPost ? (
            <BlogPostDetail
              post={currentPost}
              onBack={() => handleViewChange('blog')}
              onSelectPost={(post) => handleViewChange('blog', post.slug)}
              relatedPosts={posts.filter((p) => p.id !== currentPost.id && p.isPublished)}
            />
          ) : (
            <BlogView
              posts={posts}
              onSelectPost={(post) => handleViewChange('blog', post.slug)}
            />
          )
        ) : (
          <PublicDashboard metrics={metrics} />
        )}
      </main>

      {/* Search Engines & Crawler Transparency Footer */}
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
