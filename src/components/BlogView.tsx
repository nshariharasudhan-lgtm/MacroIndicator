import { FC, useState, useMemo, useEffect } from 'react';
import { Search, Clock, Calendar, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { BlogPost } from '../types.ts';
import { updatePageSEO } from '../utils/seo.ts';

interface BlogViewProps {
  posts: BlogPost[];
  onSelectPost: (post: BlogPost) => void;
}

export const BlogView: FC<BlogViewProps> = ({ posts, onSelectPost }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Sync SEO for Blog Listing Page
  useEffect(() => {
    const origin = window.location.origin;
    updatePageSEO({
      title: 'India Macro Insights & Economic Analysis | Expert Policy Research',
      description:
        "In-depth macroeconomic commentary, policy analysis, and statistical evaluation of India's monetary stance, inflation drivers, fiscal trends, and external trade.",
      keywords: ['India Macro Insights', 'RBI Analysis', 'India GDP', 'Inflation Analysis', 'Macroeconomic Research'],
      canonicalUrl: `${origin}/blog`,
      ogType: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        'name': 'India Macro Insights & Research Desk',
        'description': "In-depth macroeconomic commentary, policy analysis, and statistical evaluation of India's monetary stance.",
        'url': `${origin}/blog`,
        'blogPost': posts.filter((p) => p.isPublished).map((p) => ({
          '@type': 'BlogPosting',
          'headline': p.title,
          'url': `${origin}/blog/${p.slug}`,
          'datePublished': p.publishedAt,
          'author': {
            '@type': 'Person',
            'name': p.author,
          },
        })),
      },
    });
  }, [posts]);

  // Extract unique categories
  const categories = useMemo(() => {
    const published = posts.filter((p) => p.isPublished);
    const cats = Array.from(new Set(published.map((p) => p.category).filter(Boolean)));
    return ['ALL', ...cats];
  }, [posts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    const published = posts.filter((p) => p.isPublished);
    return published.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [posts, searchQuery, selectedCategory]);

  return (
    <div id="macro-blog-view" className="space-y-8 animate-fade-in pb-16">
      {/* Editorial Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                Macroeconomic Analysis
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Official data insights & research commentary
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              India Macro Insights
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Rigorous macroeconomic briefings contextualizing RBI liquidity operations, inflation dynamics, foreign exchange management, and fiscal indicators.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{filteredPosts.length} Articles</span>
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'All Articles' : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search articles, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
          No published analysis articles match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, idx) => {
            const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <article
                key={post.id}
                id={`card-post-${post.id}`}
                onClick={() => onSelectPost(post)}
                className="group flex flex-col justify-between p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer relative"
              >
                <div>
                  {/* Category & Meta */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{post.readTimeMinutes} min</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer / Read link */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>{formattedDate}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Read Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Discrete Footer Info */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center sm:text-left text-[11px] text-slate-500 dark:text-slate-400">
        Articles written with structured references to official statistical releases from RBI, MoSPI, Ministry of Commerce, and NSDL.
      </div>
    </div>
  );
};
