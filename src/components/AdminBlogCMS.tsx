import { FC, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Globe,
  Share2,
  Code,
  X,
  FileText,
  Sliders,
  Copy,
  Check,
  ExternalLink,
  Download,
} from 'lucide-react';
import { BlogPost, BlogPostSEO } from '../types.ts';

const CANONICAL_BASE = 'https://macronest.online';

interface AdminBlogCMSProps {
  posts: BlogPost[];
  onSavePost: (post: Partial<BlogPost> & { id?: string }) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onTogglePublish: (post: BlogPost) => Promise<void>;
  onResetPosts?: () => Promise<void>;
}

export const AdminBlogCMS: FC<AdminBlogCMSProps> = ({
  posts,
  onSavePost,
  onDeletePost,
  onTogglePublish,
  onResetPosts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'content' | 'seo'>('content');
  const [saving, setSaving] = useState(false);

  // Google Search Console Hub state
  const [showGSCModal, setShowGSCModal] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [copiedRss, setCopiedRss] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Monetary Policy');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('Macro Research Desk');
  const [readTimeMinutes, setReadTimeMinutes] = useState(5);
  const [isPublished, setIsPublished] = useState(true);
  const [tags, setTags] = useState('');

  // SEO Form fields
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [structuredDataType, setStructuredDataType] = useState<'Article' | 'BlogPosting' | 'NewsArticle'>('Article');

  const openCreateModal = () => {
    setEditingPost(null);
    setIsCreating(true);
    setActiveModalTab('content');

    setTitle('');
    setSlug('');
    setCategory('Monetary Policy');
    setExcerpt('');
    setContent('');
    setAuthor('Macro Research Desk');
    setReadTimeMinutes(5);
    setIsPublished(true);
    setTags('RBI, Macro, Monetary Policy');

    setMetaTitle('');
    setMetaDescription('');
    setKeywords('RBI, Monetary Policy, India Macro');
    setCanonicalUrl('');
    setStructuredDataType('Article');
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setIsCreating(false);
    setActiveModalTab('content');

    setTitle(post.title);
    setSlug(post.slug);
    setCategory(post.category);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setAuthor(post.author);
    setReadTimeMinutes(post.readTimeMinutes);
    setIsPublished(post.isPublished);
    setTags(post.tags?.join(', ') || '');

    setMetaTitle(post.seo.metaTitle || post.title);
    setMetaDescription(post.seo.metaDescription || post.excerpt);
    setKeywords(post.seo.keywords?.join(', ') || '');
    setCanonicalUrl(
      post.seo.canonicalUrl && !post.seo.canonicalUrl.includes('indiamacrodashboard.com')
        ? post.seo.canonicalUrl
        : `${CANONICAL_BASE}/blog/${post.slug}`
    );
    setStructuredDataType(post.seo.structuredDataType || 'Article');
  };

  const closeModal = () => {
    setEditingPost(null);
    setIsCreating(false);
  };

  // Title change auto-generates slug & default SEO title if untouched
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
      if (!metaTitle || metaTitle === title) {
        setMetaTitle(`${val} | MacroNest.online Analysis`.slice(0, 60));
      }
    }
  };

  // Content change auto-calculates read time & auto-suggests excerpt if blank
  const handleContentChange = (val: string) => {
    setContent(val);
    const words = val.trim().split(/\s+/).length;
    const estTime = Math.max(1, Math.ceil(words / 200));
    setReadTimeMinutes(estTime);

    if (!excerpt && val.length > 50) {
      const cleanSnippet = val.replace(/[#*`\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
      setExcerpt(cleanSnippet + '...');
      if (!metaDescription) {
        setMetaDescription(cleanSnippet);
      }
    }
  };

  // One-click Auto SEO Generator
  const handleAutoGenerateSEO = () => {
    const cleanTitle = title.trim();
    const cleanExcerpt = excerpt.trim() || content.replace(/[#*`\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);

    setMetaTitle(cleanTitle.length > 60 ? cleanTitle.slice(0, 57) + '...' : cleanTitle);
    setMetaDescription(cleanExcerpt.length > 160 ? cleanExcerpt.slice(0, 157) + '...' : cleanExcerpt);

    const generatedKeywords = [
      category,
      'India Macro',
      'RBI',
      ...tags.split(',').map((t) => t.trim()),
    ].filter(Boolean);

    setKeywords(Array.from(new Set(generatedKeywords)).join(', '));
    setCanonicalUrl(`${CANONICAL_BASE}/blog/${slug || 'analysis'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const seoData: BlogPostSEO = {
        metaTitle: metaTitle.trim() || `${title} | MacroNest.online Analysis`,
        metaDescription: metaDescription.trim() || excerpt.trim() || title,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        canonicalUrl:
          canonicalUrl.trim() && !canonicalUrl.includes('indiamacrodashboard.com')
            ? canonicalUrl.trim()
            : `${CANONICAL_BASE}/blog/${slug.trim()}`,
        structuredDataType,
      };

      const payload: Partial<BlogPost> & { id?: string } = {
        id: editingPost?.id,
        title: title.trim(),
        slug: slug.trim(),
        category: category.trim(),
        excerpt: excerpt.trim(),
        content,
        author: author.trim(),
        readTimeMinutes: Number(readTimeMinutes) || 5,
        isPublished,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        seo: seoData,
      };

      await onSavePost(payload);
      closeModal();
    } catch (err) {
      console.error('Failed to save post:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyArticleUrl = (post: BlogPost) => {
    const url = `${CANONICAL_BASE}/blog/${post.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    }
  };

  const handleCopyAllUrls = () => {
    const published = posts.filter((p) => p.isPublished);
    const text = published.map((p) => `${CANONICAL_BASE}/blog/${p.slug}`).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleDownloadUrlsTxt = () => {
    const published = posts.filter((p) => p.isPublished);
    const lines = [
      `# MacroNest.online - Published Articles for Google Search Console`,
      `# Generated on: ${new Date().toISOString()}`,
      `# Sitemap: ${CANONICAL_BASE}/sitemap.xml`,
      `# RSS: ${CANONICAL_BASE}/rss.xml`,
      '',
      ...published.map((p) => `${CANONICAL_BASE}/blog/${p.slug}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'macronest-article-urls.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredPosts = posts.filter(
    (p) =>
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="admin-blog-cms" className="space-y-6">
      {/* CMS Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {posts.length} {posts.length === 1 ? 'Article' : 'Articles'} ({posts.filter((p) => p.isPublished).length} Published)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGSCModal(true)}
            className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="View & copy all individual URLs for Google Search Console indexing"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Google Search Console URLs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200/80 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-bold">
              {posts.filter((p) => p.isPublished).length}
            </span>
          </button>

          {onResetPosts && (
            <button
              type="button"
              onClick={onResetPosts}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset to 3 Initial Articles
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Posts Table */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
          No articles found. Click &quot;New Article&quot; to write your first macroeconomic analysis.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Article Title & Category</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SEO Optimization</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredPosts.map((post) => {
                  const hasGoodMetaTitle = post.seo?.metaTitle && post.seo.metaTitle.length >= 30 && post.seo.metaTitle.length <= 65;
                  const hasGoodMetaDesc = post.seo?.metaDescription && post.seo.metaDescription.length >= 100 && post.seo.metaDescription.length <= 165;
                  const seoScore = (hasGoodMetaTitle ? 50 : 25) + (hasGoodMetaDesc ? 50 : 25);

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3.5 max-w-md">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1 text-sm">
                          {post.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {post.category}
                          </span>
                          <span>•</span>
                          <span>{post.readTimeMinutes} min read</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">/{post.slug}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        {post.author}
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => onTogglePublish(post)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            post.isPublished
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {post.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            SEO {seoScore}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({post.seo.structuredDataType || 'Article'})
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyArticleUrl(post)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Copy Individual URL for Google Search Console"
                          >
                            {copiedPostId === post.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(post)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Post"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePost(post.id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simple Modal Editor */}
      {(isCreating || editingPost) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {editingPost ? 'Edit Macro Analysis Article' : 'New Macro Analysis Article'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Write macroeconomic research and configure full SEO search optimization.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simple Sub-Tabs: Content vs SEO */}
            <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveModalTab('content')}
                className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeModalTab === 'content'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Article Content</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('seo')}
                className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeModalTab === 'seo'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Full SEO Optimization</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                  Google & Social
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeModalTab === 'content' ? (
                <>
                  {/* Title & Slug */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Article Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="e.g. India Forex Reserves & External Resilience"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        URL Slug *
                      </label>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="e.g. india-forex-reserves-analysis"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  {/* Category & Author & Read time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Monetary Policy, Fiscal, Inflation Watch"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Author
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Read Time (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={readTimeMinutes}
                        onChange={(e) => setReadTimeMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Excerpt / Summary *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Brief 1-2 sentence overview of the article..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  {/* Article Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Article Content (Markdown supported) *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Supports ## headings, bullets, blockquotes
                      </span>
                    </div>
                    <textarea
                      rows={9}
                      required
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Write your in-depth economic analysis here..."
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  {/* Tags & Published Toggle */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Topic Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g. RBI, Liquidity, WACR, Repo"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4 sm:pt-0">
                      <input
                        type="checkbox"
                        id="isPublishedCheck"
                        checked={isPublished}
                        onChange={(e) => setIsPublished(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="isPublishedCheck" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                        Publish Article immediately
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                /* Full SEO Optimization Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <div className="text-xs text-blue-900 dark:text-blue-200">
                      <strong>Automatic SEO Assistant:</strong> Extract optimal meta tags directly from your article.
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSEO}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Generate SEO</span>
                    </button>
                  </div>

                  {/* SEO Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Meta Title (&lt;title&gt; & og:title) *
                      </label>
                      <span
                        className={`text-[11px] font-bold ${
                          metaTitle.length >= 30 && metaTitle.length <= 60
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {metaTitle.length} / 60 chars {metaTitle.length >= 30 && metaTitle.length <= 60 ? '✓ Optimal' : '(30–60 rec.)'}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="e.g. India Forex Reserves & External Resilience | Macro Analysis"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  {/* SEO Meta Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Meta Description (&lt;meta name=&quot;description&quot;&gt; & og:description) *
                      </label>
                      <span
                        className={`text-[11px] font-bold ${
                          metaDescription.length >= 120 && metaDescription.length <= 160
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {metaDescription.length} / 160 chars {metaDescription.length >= 120 && metaDescription.length <= 160 ? '✓ Optimal' : '(120–160 rec.)'}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Concise 120-160 character summary that search engines display under your link..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  {/* Keywords & Structured Data Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Meta Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="e.g. RBI, Repo Rate, Inflation, WACR"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Schema.org Structured Data Type
                      </label>
                      <select
                        value={structuredDataType}
                        onChange={(e) => setStructuredDataType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      >
                        <option value="Article">Article (Standard Analysis)</option>
                        <option value="BlogPosting">BlogPosting (Macro Blog)</option>
                        <option value="NewsArticle">NewsArticle (Breaking Release)</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Google Search Result Preview */}
                  <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-inner">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Search Result Preview</span>
                    </div>

                    <div className="space-y-1 font-sans">
                      <div className="text-[11px] text-slate-700 dark:text-slate-400 truncate">
                        https://macronest.online &gt; blog &gt; {slug || 'analysis'}
                      </div>
                      <div className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer">
                        {metaTitle || `${title || 'Title of your macroeconomic article'} | MacroNest.online Analysis`}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {metaDescription || excerpt || 'Your 120-160 character meta description will be displayed here in Google search engine snippets.'}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="text-slate-500 font-mono text-[11px] truncate max-w-md">
                        https://macronest.online/blog/{slug || 'analysis'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(`https://macronest.online/blog/${slug || 'analysis'}`);
                            setCopiedPostId('modal-preview');
                            setTimeout(() => setCopiedPostId(null), 2000);
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1"
                      >
                        {copiedPostId === 'modal-preview' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied GSC URL</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Individual URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPost ? 'Update Post & SEO' : 'Save & Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Search Console Indexing Hub Modal */}
      {showGSCModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <span>Google Search Console Indexing Hub</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Live Production
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Individual canonical URLs for all existing articles and automatic discovery for future articles.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGSCModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Automated Indexing Recommendation Card */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Best Practice: Submit Sitemap Once (Indexes All Present &amp; Future Articles)</span>
                    </h4>
                    <p className="text-xs text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
                      Instead of inspecting URLs one-by-one, submit this single Sitemap in{' '}
                      <strong>Google Search Console &gt; Sitemaps</strong>. It is dynamically synced on the server and includes all current articles plus every new article you publish in the future automatically.
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Sitemap */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/50">
                    <div className="truncate mr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Primary XML Sitemap</div>
                      <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {CANONICAL_BASE}/sitemap.xml
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(`${CANONICAL_BASE}/sitemap.xml`);
                          setCopiedSitemap(true);
                          setTimeout(() => setCopiedSitemap(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      {copiedSitemap ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSitemap ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* RSS Feed */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/50">
                    <div className="truncate mr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">RSS Feed (Rapid Google Discovery)</div>
                      <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {CANONICAL_BASE}/rss.xml
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(`${CANONICAL_BASE}/rss.xml`);
                          setCopiedRss(true);
                          setTimeout(() => setCopiedRss(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      {copiedRss ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRss ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Individual URLs Header & Batch Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Individual Article URLs</span>
                    <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {posts.filter((p) => p.isPublished).length} Published
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Copy individual URLs to test in Google Search Console URL Inspection tool or submit to indexing APIs.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAllUrls}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? 'All URLs Copied!' : 'Copy All URLs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadUrlsTxt}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              {/* Individual URLs List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {posts.map((post) => {
                    const articleUrl = `${CANONICAL_BASE}/blog/${post.slug}`;
                    const gscInspectUrl = `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(
                      CANONICAL_BASE + '/'
                    )}&item_url=${encodeURIComponent(articleUrl)}`;

                    return (
                      <div
                        key={post.id}
                        className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                post.isPublished
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {post.isPublished ? 'Live' : 'Draft'}
                            </span>
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              {post.category}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {post.title}
                          </div>

                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <span className="text-slate-400">URL:</span>
                            <span className="select-all text-slate-700 dark:text-slate-300">{articleUrl}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyArticleUrl(post)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            {copiedPostId === post.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>

                          <a
                            href={gscInspectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/40 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Inspect this individual URL directly in Google Search Console"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect in GSC</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Helpful instructions */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>How Google indexes new articles created in the future:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>Whenever you click &quot;Save &amp; Publish Post&quot; or publish a post in this CMS, it immediately updates <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">/sitemap.xml</code> and <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">/rss.xml</code>.</li>
                  <li>Googlebot periodically polls your sitemap and will automatically crawl the new URL without manual action.</li>
                  <li>For instant indexing of breaking articles, click &quot;Inspect in GSC&quot; above or paste the article&apos;s individual URL into the Google Search Console top search bar and click &quot;Request Indexing&quot;.</li>
                </ol>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              <span className="text-[11px] text-slate-500">
                All URLs strictly conform to canonical domain <code className="font-mono">{CANONICAL_BASE}</code>
              </span>
              <button
                type="button"
                onClick={() => setShowGSCModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
