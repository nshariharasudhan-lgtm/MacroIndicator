import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Database,
  Sparkles,
  ExternalLink,
  Code,
  Globe,
  FileText,
  Share2,
  HelpCircle,
  RefreshCw,
  Copy,
  Check,
  X
} from 'lucide-react';
import { InsightPost, INSIGHT_CATEGORIES } from '../types.ts';
import { 
  getInsights, 
  saveInsight, 
  deleteInsight, 
  isSupabaseConfigured,
  getSupabaseCredentials 
} from '../lib/supabase.ts';

export const InsightsAdminManager: React.FC = () => {
  const [posts, setPosts] = useState<InsightPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<InsightPost> | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<'content' | 'seo' | 'preview'>('content');
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Load insights
  const loadPosts = async () => {
    setLoading(true);
    try {
      const result = await getInsights(true);
      setPosts(result.posts);
      setIsUsingSupabase(result.isUsingSupabase);
    } catch (err) {
      console.error('Failed to load insights in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PUBLISHED'
          ? p.isPublished
          : !p.isPublished;
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [posts, searchQuery, statusFilter, categoryFilter]);

  // Open editor for new post
  const handleCreateNew = () => {
    setEditingPost({
      title: '',
      slug: '',
      category: 'Monetary Policy',
      excerpt: '',
      content: `## Key Macroeconomic Highlights\n\n- Primary observation:\n- Policy implication:\n\n### Granular Data Trends\n\nEnter detailed analysis here...`,
      tags: ['RBI', 'Economy', 'Macro'],
      coverImageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
      authorName: 'MacroNest Research Team',
      authorRole: 'Macroeconomic Intelligence Unit',
      isPublished: true,
      focusKeyword: '',
      metaTitle: '',
      metaDescription: '',
    });
    setActiveEditorTab('content');
    setIsEditorOpen(true);
  };

  // Open editor for existing post
  const handleEdit = (post: InsightPost) => {
    setEditingPost({ ...post });
    setActiveEditorTab('content');
    setIsEditorOpen(true);
  };

  // Quick toggle publish status
  const handleTogglePublish = async (post: InsightPost) => {
    const updated = { ...post, isPublished: !post.isPublished };
    const res = await saveInsight(updated);
    if (res.success) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? res.post : p)));
    }
  };

  // Delete post
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }
    const res = await deleteInsight(id);
    if (res.success) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Real-time SEO analysis engine
  const seoAudit = useMemo(() => {
    if (!editingPost) {
      return {
        score: 0,
        checks: [],
        status: 'Poor',
      };
    }

    const title = (editingPost.title || '').trim();
    const excerpt = (editingPost.excerpt || '').trim();
    const content = (editingPost.content || '').trim();
    const slug = (editingPost.slug || '').trim();
    const keyword = (editingPost.focusKeyword || '').toLowerCase().trim();
    const metaTitle = (editingPost.metaTitle || title).trim();
    const metaDesc = (editingPost.metaDescription || excerpt).trim();
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const checks: { label: string; passed: boolean; tip: string; points: number }[] = [];

    // 1. Focus keyword defined
    checks.push({
      label: 'Focus Keyword Defined',
      passed: Boolean(keyword),
      tip: keyword ? `Target keyword: "${keyword}"` : 'Enter a target focus keyword for SEO auditing',
      points: 10,
    });

    // 2. Keyword in title
    const kwInTitle = keyword && title.toLowerCase().includes(keyword);
    checks.push({
      label: 'Focus Keyword in Title',
      passed: Boolean(kwInTitle),
      tip: kwInTitle ? 'Keyword appears prominently in title' : 'Include your exact focus keyword in the title',
      points: 15,
    });

    // 3. Keyword in URL slug
    const kwInSlug = keyword && slug.toLowerCase().includes(keyword.replace(/\s+/g, '-'));
    checks.push({
      label: 'Focus Keyword in URL Slug',
      passed: Boolean(kwInSlug),
      tip: kwInSlug ? 'Clean SEO slug includes target keyword' : 'Add the keyword into the article slug',
      points: 10,
    });

    // 4. Keyword in meta description
    const kwInDesc = keyword && metaDesc.toLowerCase().includes(keyword);
    checks.push({
      label: 'Focus Keyword in Meta Description',
      passed: Boolean(kwInDesc),
      tip: kwInDesc ? 'Keyword present in meta description' : 'Add focus keyword to meta description',
      points: 15,
    });

    // 5. Title length check (40 - 65 chars optimal)
    const titleLen = metaTitle.length;
    const titleOptimal = titleLen >= 35 && titleLen <= 70;
    checks.push({
      label: 'Title Length (35-70 Chars)',
      passed: titleOptimal,
      tip: `Current: ${titleLen} characters. ${titleOptimal ? 'Ideal length for search snippets' : 'Make title 35-70 characters'}`,
      points: 10,
    });

    // 6. Meta description length (120 - 165 chars optimal)
    const descLen = metaDesc.length;
    const descOptimal = descLen >= 110 && descLen <= 165;
    checks.push({
      label: 'Meta Description Length (110-165 Chars)',
      passed: descOptimal,
      tip: `Current: ${descLen} characters. ${descOptimal ? 'Optimal length for Google snippets' : 'Aim between 110 and 165 characters'}`,
      points: 10,
    });

    // 7. Word count >= 250 words
    const countOk = wordCount >= 250;
    checks.push({
      label: 'Editorial Depth (> 250 words)',
      passed: countOk,
      tip: `Current: ${wordCount} words. ${countOk ? 'Sufficient editorial depth' : 'Add more detailed analysis for search depth'}`,
      points: 10,
    });

    // 8. Structured subheadings (H2/H3)
    const hasHeadings = /##\s/.test(content);
    checks.push({
      label: 'Structured Subheadings (H2 / H3)',
      passed: hasHeadings,
      tip: hasHeadings ? 'Clear heading structure present' : 'Use "## Heading" to organize your sections',
      points: 10,
    });

    // 9. Cover image provided
    const hasImage = Boolean(editingPost.coverImageUrl);
    checks.push({
      label: 'Cover Image for Social Cards',
      passed: hasImage,
      tip: hasImage ? 'Cover image configured for OpenGraph' : 'Provide a cover image URL for rich cards',
      points: 10,
    });

    const score = checks.reduce((sum, c) => sum + (c.passed ? c.points : 0), 0);
    let status = 'Poor';
    if (score >= 85) status = 'Excellent';
    else if (score >= 70) status = 'Good';
    else if (score >= 50) status = 'Needs Work';

    return { score, checks, status };
  }, [editingPost]);

  // Handle save from editor
  const handleSave = async (publishImmediate = true) => {
    if (!editingPost || !editingPost.title?.trim() || !editingPost.content?.trim()) {
      alert('Please provide at least an article Title and Content.');
      return;
    }

    setSaveStatus('Saving article...');
    try {
      const payload: Partial<InsightPost> & { title: string; content: string } = {
        ...editingPost,
        title: editingPost.title.trim(),
        content: editingPost.content.trim(),
        isPublished: publishImmediate,
      };

      const result = await saveInsight(payload);
      if (result.success) {
        setSaveStatus(
          result.isUsingSupabase
            ? '✅ Successfully saved directly to Supabase cloud database!'
            : '✅ Saved to local storage fallback (Configure .env with Supabase credentials for cloud sync)'
        );
        setTimeout(() => {
          setSaveStatus(null);
          setIsEditorOpen(false);
          loadPosts();
        }, 1200);
      } else {
        setSaveStatus(`⚠️ ${result.error || 'Failed to save'}`);
      }
    } catch (err: any) {
      setSaveStatus(`❌ Error: ${err.message}`);
    }
  };

  const sqlSchemaText = `-- =========================================================================
-- MacroNest.online — Insights Blog Engine Database Schema (Supabase)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Monetary Policy',
  tags TEXT[] DEFAULT ARRAY['RBI', 'Economy', 'Macro']::TEXT[],
  cover_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'MacroNest Research Team',
  author_role TEXT DEFAULT 'Macroeconomic Intelligence Unit',
  reading_time_minutes INTEGER DEFAULT 5,
  is_published BOOLEAN NOT NULL DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  canonical_url TEXT,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_slug ON public.insights(slug);
CREATE INDEX IF NOT EXISTS idx_insights_published ON public.insights(is_published, published_at DESC);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to published insights"
  ON public.insights FOR SELECT TO public USING (is_published = true);

CREATE POLICY "Allow full admin management"
  ON public.insights FOR ALL TO anon, authenticated, service_role
  USING (true) WITH CHECK (true);`;

  const copySqlSchema = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Supabase Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${isUsingSupabase ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Supabase Insights Blog Engine
              </h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                isUsingSupabase
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
              }`}>
                {isUsingSupabase ? 'Connected to Supabase' : 'Offline / Local Cache'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              {isUsingSupabase
                ? 'Your blog posts are synchronized live to your Supabase PostgreSQL database table "insights". Metrics stay in high-speed CSV as requested.'
                : 'Supabase credentials not yet provided in .env. Running on local cached store. Paste your Supabase URL & Key in .env to activate direct cloud database sync.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={() => setIsSchemaModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5 text-blue-500" />
            <span>SQL Schema</span>
          </button>
          <button
            onClick={loadPosts}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
            title="Refresh from Supabase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and New Post Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search articles by title, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <button
          onClick={handleCreateNew}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Write New Article</span>
        </button>
      </div>

      {/* Articles Management Table / List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
            Loading blog articles...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No articles found matching filters. Click "Write New Article" to create your first SEO-optimized post.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">SEO Score</th>
                  <th className="py-3 px-3">Published Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPosts.map((post) => {
                  const score = post.focusKeyword ? 90 : 65;
                  return (
                    <tr key={post.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {post.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                          /insights/{post.slug}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {post.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase cursor-pointer transition-colors ${
                            post.isPublished
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {post.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          score >= 80
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {score}/100 {score >= 80 ? 'Optimal' : 'Needs Focus'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/insights/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            title="View Live Article"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleEdit(post)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Edit in SEO Post Engine"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= SEO OPTIMIZED BLOG POST ENGINE MODAL ================= */}
      {isEditorOpen && editingPost && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    SEO Optimized Blog Post Engine
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Draft, optimize keywords, and publish research briefings directly to Supabase.
                  </p>
                </div>
              </div>

              {/* Editor Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('content')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeEditorTab === 'content'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Writing &amp; Content
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('seo')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeEditorTab === 'seo'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span>SEO Audit</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                    seoAudit.score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {seoAudit.score}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {saveStatus && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-bold text-blue-900 dark:text-blue-200">
                  {saveStatus}
                </div>
              )}

              {/* TAB 1: CONTENT & WRITING */}
              {activeEditorTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Article Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RBI MPC Stance Shift: How Neutral Policy Reshapes Systemic Liquidity"
                      value={editingPost.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const autoSlug = val
                          .toLowerCase()
                          .replace(/[^\w\s-]/g, '')
                          .replace(/[\s_-]+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        setEditingPost((prev) => ({
                          ...prev,
                          title: val,
                          slug: prev?.slug || autoSlug,
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        URL Slug *
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-800 text-slate-500 rounded-l-xl">
                          /insights/
                        </span>
                        <input
                          type="text"
                          value={editingPost.slug || ''}
                          onChange={(e) => setEditingPost((prev) => ({ ...prev, slug: e.target.value }))}
                          placeholder="rbi-mpc-stance-shift"
                          className="w-full px-3 py-2 text-xs font-mono rounded-r-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Macro Category
                      </label>
                      <select
                        value={editingPost.category || 'Monetary Policy'}
                        onChange={(e) => setEditingPost((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      >
                        {INSIGHT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Executive Excerpt (Short Summary)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {(editingPost.excerpt || '').length} / 160 characters
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Concise 1-2 sentence executive briefing on key takeaways..."
                      value={editingPost.excerpt || ''}
                      onChange={(e) => setEditingPost((prev) => ({ ...prev, excerpt: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Cover Banner Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={editingPost.coverImageUrl || ''}
                      onChange={(e) => setEditingPost((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Markdown Content Editor with Formatting Helpers */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Full Markdown Article Body
                      </label>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>Markdown Supported:</span>
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">## Heading</code>
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">**bold**</code>
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">&gt; quote</code>
                      </div>
                    </div>
                    <textarea
                      rows={12}
                      value={editingPost.content || ''}
                      onChange={(e) => setEditingPost((prev) => ({ ...prev, content: e.target.value }))}
                      className="w-full p-4 text-xs font-mono leading-relaxed rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={editingPost.authorName || 'MacroNest Research Team'}
                        onChange={(e) => setEditingPost((prev) => ({ ...prev, authorName: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Author Role / Desk
                      </label>
                      <input
                        type="text"
                        value={editingPost.authorRole || 'Macroeconomic Intelligence Unit'}
                        onChange={(e) => setEditingPost((prev) => ({ ...prev, authorRole: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REAL-TIME SEO OPTIMIZATION ENGINE & SERP SIMULATOR */}
              {activeEditorTab === 'seo' && (
                <div className="space-y-6">
                  {/* Score Card */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                        SEO Optimization Health
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{seoAudit.score}/100</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          seoAudit.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {seoAudit.status}
                        </span>
                      </div>
                    </div>

                    <div className="w-32 bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          seoAudit.score >= 80 ? 'bg-emerald-500' : seoAudit.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${seoAudit.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Target Focus Keyword */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Primary Target Focus Keyword *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RBI MPC stance"
                      value={editingPost.focusKeyword || ''}
                      onChange={(e) => setEditingPost((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The core query you want this macroeconomic research article to rank for in Google Search.
                    </p>
                  </div>

                  {/* Google Search Result (SERP) Simulator */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>Google Search (SERP) Snippet Preview</span>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs max-w-2xl font-sans">
                      <div className="text-[12px] text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate mb-0.5">
                        <span className="font-semibold">macronest.online</span>
                        <span className="text-slate-400">› insights › {editingPost.slug || 'article-slug'}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-blue-800 dark:text-blue-400 hover:underline cursor-pointer leading-tight mb-1 truncate">
                        {editingPost.metaTitle || editingPost.title || 'Article Headline Title'}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {editingPost.metaDescription || editingPost.excerpt || 'Article summary description will appear here as snippet for search engine visitors...'}
                      </p>
                    </div>
                  </div>

                  {/* SEO Health Checklist */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Live SEO Checklist
                    </div>
                    <div className="space-y-2">
                      {seoAudit.checks.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {c.passed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {c.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.tip}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publish to Supabase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SQL SCHEMA INSTRUCTIONS MODAL ================= */}
      {isSchemaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Supabase PostgreSQL Table Schema
                  </h3>
                  <p className="text-xs text-slate-500">
                    Run this SQL script in your Supabase SQL Editor to create the <code className="font-bold">insights</code> table.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSchemaModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-4 font-mono text-[11px] overflow-y-auto">
              <pre>{sqlSchemaText}</pre>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Only blog posts are stored in Supabase; Macro metrics stay in CSV.
              </span>
              <button
                onClick={copySqlSchema}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Script'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
