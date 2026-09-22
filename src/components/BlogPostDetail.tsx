import { FC, useEffect, useState } from 'react';
import { ArrowLeft, Clock, Calendar, Share2, Check, Tag, Bookmark } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BlogPost } from '../types.ts';
import { updatePageSEO, generatePostStructuredData } from '../utils/seo.ts';

interface BlogPostDetailProps {
  post: BlogPost;
  onBack: () => void;
  onSelectPost?: (post: BlogPost) => void;
  relatedPosts?: BlogPost[];
}

export const BlogPostDetail: FC<BlogPostDetailProps> = ({
  post,
  onBack,
  onSelectPost,
  relatedPosts = [],
}) => {
  const [copied, setCopied] = useState(false);

  // Sync full SEO on mount & when post changes
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}/blog/${post.slug}`;
    const structuredData = generatePostStructuredData(post, origin);

    updatePageSEO({
      title: post.seo.metaTitle || `${post.title} | India Macro Analysis`,
      description: post.seo.metaDescription || post.excerpt,
      keywords: post.seo.keywords?.length ? post.seo.keywords : post.tags,
      canonicalUrl: post.seo.canonicalUrl || url,
      ogType: 'article',
      ogImage: post.seo.ogImage || post.coverImage,
      structuredData,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [post]);

  const handleShare = () => {
    const origin = window.location.origin;
    const url = `${origin}/blog/${post.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article id={`blog-post-${post.id}`} className="max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Top Back & Action Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Insights</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">Link Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Article</span>
            </>
          )}
        </button>
      </div>

      {/* Article Header Card */}
      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-xs mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
            {post.category}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {post.readTimeMinutes} min read
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-snug">
          {post.title}
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          {post.excerpt}
        </p>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Authored by:</span>
            <span>{post.author}</span>
          </div>
          {post.seo.canonicalUrl && (
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
              Canonical: {post.seo.canonicalUrl.replace(/^https?:\/\//, '')}
            </span>
          )}
        </div>
      </header>

      {/* Article Markdown Body */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-xs mb-10">
        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed space-y-4">
          <ReactMarkdown
            components={{
              h2: ({ ...props }) => (
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white mt-8 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2" {...props} />
              ),
              h3: ({ ...props }) => (
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3" {...props} />
              ),
              p: ({ ...props }) => (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed my-3.5 text-base sm:text-[16px]" {...props} />
              ),
              ul: ({ ...props }) => (
                <ul className="list-disc pl-6 space-y-2 my-4 text-slate-700 dark:text-slate-300" {...props} />
              ),
              ol: ({ ...props }) => (
                <ol className="list-decimal pl-6 space-y-2 my-4 text-slate-700 dark:text-slate-300" {...props} />
              ),
              li: ({ ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
              blockquote: ({ ...props }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-slate-700 dark:text-slate-300 bg-blue-50/40 dark:bg-blue-950/20 rounded-r-lg" {...props} />
              ),
              strong: ({ ...props }) => (
                <strong className="font-bold text-slate-950 dark:text-white" {...props} />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Tags / Keywords pill bar */}
        {((post.tags && post.tags.length > 0) || (post.seo.keywords && post.seo.keywords.length > 0)) && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Tag className="w-3.5 h-3.5" />
              Indexed Topics:
            </span>
            {Array.from(new Set([...(post.tags || []), ...(post.seo.keywords || [])])).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SEO Schema Verification Badge (Transparency) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 mb-10 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>SEO & Schema.org Optimized:</strong> Rendered with dynamic <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">{post.seo.structuredDataType || 'BlogPosting'}</code> JSON-LD metadata, OpenGraph, and Twitter cards.
          </span>
        </div>
        <span className="text-[11px] text-slate-500 shrink-0">
          Last Updated: {new Date(post.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">
            More Macro Economic Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedPosts.slice(0, 2).map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectPost?.(rel)}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {rel.category}
                  </span>
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500">{rel.readTimeMinutes} min read</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {rel.title}
                </h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {rel.excerpt}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
