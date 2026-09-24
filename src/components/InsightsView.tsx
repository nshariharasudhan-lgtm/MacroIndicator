import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  Share2, 
  Search, 
  Tag, 
  Check, 
  ExternalLink,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { InsightPost, INSIGHT_CATEGORIES } from '../types.ts';
import { getInsights } from '../lib/supabase.ts';

interface InsightsViewProps {
  initialSlug?: string;
  onNavigateHome?: () => void;
}

function updateMetaTag(selector: string, attr: string, value: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    if (selector.includes('[name=')) {
      const name = selector.match(/\[name="?([^"\]]+)"?\]/)?.[1];
      if (name) el.setAttribute('name', name);
    } else if (selector.includes('[property=')) {
      const prop = selector.match(/\[property="?([^"\]]+)"?\]/)?.[1];
      if (prop) el.setAttribute('property', prop);
    } else if (selector.includes('[rel=')) {
      const rel = selector.match(/\[rel="?([^"\]]+)"?\]/)?.[1];
      if (rel) el.setAttribute('rel', rel);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export const InsightsView: React.FC<InsightsViewProps> = ({ initialSlug, onNavigateHome }) => {
  const [posts, setPosts] = useState<InsightPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<InsightPost | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Load insights
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const result = await getInsights(false);
        if (isMounted) {
          setPosts(result.posts);

          // If URL had initial slug, open it
          const currentPath = window.location.pathname;
          const match = currentPath.match(/^\/insights\/([a-zA-Z0-9_-]+)/);
          const slugToOpen = initialSlug || (match ? match[1] : undefined);

          if (slugToOpen) {
            const matched = result.posts.find((p) => p.slug === slugToOpen);
            if (matched) {
              setSelectedPost(matched);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialSlug]);

  // Handle browser back / forward navigation via popstate
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/insights\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const found = posts.find((p) => p.slug === match[1]);
        if (found) {
          setSelectedPost(found);
          return;
        }
      }
      setSelectedPost(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [posts]);

  // Update document title, canonical link, OpenGraph & Schema.org JSON-LD
  useEffect(() => {
    if (selectedPost) {
      const canonicalUrl = `https://macronest.online/insights/${selectedPost.slug}`;
      const title = `${selectedPost.metaTitle || selectedPost.title} | MacroNest Insights`;
      const desc = selectedPost.metaDescription || selectedPost.excerpt;

      document.title = title;
      updateMetaTag('meta[name="description"]', 'content', desc);
      updateMetaTag('link[rel="canonical"]', 'href', canonicalUrl);
      updateMetaTag('meta[property="og:title"]', 'content', title);
      updateMetaTag('meta[property="og:description"]', 'content', desc);
      updateMetaTag('meta[property="og:url"]', 'content', canonicalUrl);
      updateMetaTag('meta[property="og:type"]', 'content', 'article');
      if (selectedPost.coverImageUrl) {
        updateMetaTag('meta[property="og:image"]', 'content', selectedPost.coverImageUrl);
        updateMetaTag('meta[name="twitter:image"]', 'content', selectedPost.coverImageUrl);
      }
      updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
      updateMetaTag('meta[name="twitter:title"]', 'content', title);
      updateMetaTag('meta[name="twitter:description"]', 'content', desc);

      // Inject Schema.org BlogPosting structured data
      let scriptTag = document.getElementById('json-ld-article-schema') as HTMLScriptElement | null;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'json-ld-article-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: selectedPost.title,
        description: desc,
        image: selectedPost.coverImageUrl,
        datePublished: selectedPost.publishedAt,
        dateModified: selectedPost.updatedAt || selectedPost.publishedAt,
        author: {
          '@type': 'Person',
          name: selectedPost.authorName,
          jobTitle: selectedPost.authorRole || 'Macroeconomic Intelligence',
        },
        publisher: {
          '@type': 'Organization',
          name: 'MacroNest',
          url: 'https://macronest.online',
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        keywords: selectedPost.tags?.join(', ') || selectedPost.focusKeyword,
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.title = 'Macroeconomic Insights & Policy Briefings | MacroNest.online';
      updateMetaTag('meta[name="description"]', 'content', 'Curated economic analysis, monetary policy breakdowns, systemic liquidity monitors, and fiscal trajectory forecasts.');
      updateMetaTag('link[rel="canonical"]', 'href', 'https://macronest.online/insights');
      updateMetaTag('meta[property="og:title"]', 'content', 'Macroeconomic Insights & Policy Briefings | MacroNest.online');
      updateMetaTag('meta[property="og:description"]', 'content', 'Curated economic analysis, monetary policy breakdowns, systemic liquidity monitors, and fiscal trajectory forecasts.');
      updateMetaTag('meta[property="og:url"]', 'content', 'https://macronest.online/insights');
      updateMetaTag('meta[property="og:type"]', 'content', 'website');

      const scriptTag = document.getElementById('json-ld-article-schema');
      if (scriptTag) {
        scriptTag.remove();
      }
    }
  }, [selectedPost]);

  const navigateToArticle = (post: InsightPost) => {
    window.history.pushState({ slug: post.slug }, '', `/insights/${post.slug}`);
    setSelectedPost(post);
  };

  const navigateBackToDirectory = () => {
    window.history.pushState(null, '', '/insights');
    setSelectedPost(null);
  };

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
        (p.focusKeyword && p.focusKeyword.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [posts, selectedCategory, searchQuery]);

  const handleShare = async (post: InsightPost) => {
    const shareUrl = `${window.location.origin}/insights/${post.slug}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedSlug(post.slug);
      setTimeout(() => setCopiedSlug(null), 2500);
    }
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'Monetary Policy':
        return 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-900';
      case 'Fiscal & GST':
        return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-900';
      case 'Inflation & CPI':
        return 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-900';
      case 'Forex & External':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-900';
      case 'Global Benchmarks':
        return 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-900';
      case 'Markets & Yields':
        return 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-900';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    }
  };

  // ================= SINGLE POST READER VIEW ================= //
  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={navigateBackToDirectory}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Insights</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <a
              href="/insights"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  navigateBackToDirectory();
                }
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Insights
            </a>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {selectedPost.category}
            </span>
          </div>
        </nav>

        {/* Article Container */}
        <article className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-6 sm:p-10">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getCategoryTheme(selectedPost.category)}`}>
                {selectedPost.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(selectedPost.publishedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{selectedPost.readingTimeMinutes} min read</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white leading-tight tracking-tight">
              {selectedPost.title}
            </h1>

            <p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed border-l-4 border-blue-600 dark:border-blue-500 pl-4 py-1">
              {selectedPost.excerpt}
            </p>

            {/* Author Byline & Social Share */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm">
                  MN
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedPost.authorName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPost.authorRole || 'Macroeconomic Intelligence'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare(selectedPost)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  title="Copy link to clipboard"
                >
                  {copiedSlug === selectedPost.slug ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Cover Banner */}
          {selectedPost.coverImageUrl && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[420px] bg-slate-100 dark:bg-slate-800">
              <img
                src={selectedPost.coverImageUrl}
                alt={selectedPost.title}
                className="w-full h-full object-cover max-h-[420px]"
                loading="eager"
              />
            </div>
          )}

          {/* Markdown Content Body */}
          <div className="mt-8 prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4">
            {selectedPost.content.split('\n\n').map((block, idx) => {
              const trimmed = block.trim();
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    {trimmed.replace('## ', '')}
                  </h2>
                );
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-6 mb-2">
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600 dark:border-blue-400 my-4 text-slate-800 dark:text-blue-100 font-medium">
                    {trimmed.replace('> ', '')}
                  </blockquote>
                );
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const items = trimmed.split('\n').map((i) => i.replace(/^[-*]\s+/, ''));
                return (
                  <ul key={idx} className="list-disc pl-6 space-y-1.5 my-3 text-slate-700 dark:text-slate-300">
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                );
              }
              if (/^\d+\.\s/.test(trimmed)) {
                const items = trimmed.split('\n').map((i) => i.replace(/^\d+\.\s+/, ''));
                return (
                  <ol key={idx} className="list-decimal pl-6 space-y-1.5 my-3 text-slate-700 dark:text-slate-300">
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ol>
                );
              }
              return (
                <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed my-3 font-normal">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Tags & Keywords */}
          {selectedPost.tags && selectedPost.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Tags:
              </span>
              {selectedPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer Navigation within Reader */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setSelectedPost(null)}
              className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explore More Insights</span>
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              MacroNest Economic Research Desk
            </div>
          </div>
        </article>
      </div>
    );
  }

  // ================= MAIN BLOG DIRECTORY VIEW ================= //
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {onNavigateHome ? (
            <button onClick={onNavigateHome} className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
              Home
            </button>
          ) : (
            <a href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
              Home
            </a>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Insights</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-8 space-y-4">
        {/* Search input & counter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search insights by topic, keyword, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 self-end sm:self-auto">
            Showing {filteredPosts.length} of {posts.length} {filteredPosts.length === 1 ? 'Article' : 'Articles'}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Insights ({posts.length})
          </button>
          {INSIGHT_CATEGORIES.map((cat) => {
            const count = posts.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat} {count > 0 && <span className="opacity-70 text-[11px]">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 mx-auto border-2 border-slate-300 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-xs text-slate-600 dark:text-slate-400">Loading macroeconomic insights...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No insights found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No published articles match your current category or search query. Try resetting filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* 
         * USER REQUIREMENT:
         * "The design of the blog post should also as a card display with 2 rows. i mean only 2 articles in one line."
         * Exact implementation: grid-cols-1 md:grid-cols-2 (2 columns on tablet and desktop, 1 on narrow mobile)
         */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-400/50 bg-white dark:bg-slate-900 shadow-xs hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden will-change-transform"
            >
              {/* Card Banner Image */}
              <a
                href={`/insights/${post.slug}`}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    navigateToArticle(post);
                  }
                }}
                className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 block cursor-pointer"
                title={post.title}
              >
                {post.coverImageUrl ? (
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                    <TrendingUp className="w-12 h-12 text-slate-400" />
                  </div>
                )}
                {/* Category badge floating on banner */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-md ${getCategoryTheme(post.category)}`}>
                    {post.category}
                  </span>
                </div>
              </a>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Meta row: Date and Reading Time */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mb-2.5">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readingTimeMinutes} min read
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    <a
                      href={`/insights/${post.slug}`}
                      onClick={(e) => {
                        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                          e.preventDefault();
                          navigateToArticle(post);
                        }
                      }}
                    >
                      {post.title}
                    </a>
                  </h2>

                  {/* Excerpt */}
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                {/* Footer byline & Read More action */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold">
                      MN
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                      {post.authorName}
                    </span>
                  </div>

                  <a
                    href={`/insights/${post.slug}`}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        navigateToArticle(post);
                      }
                    }}
                    className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform cursor-pointer"
                  >
                    <span>Read Analysis</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
