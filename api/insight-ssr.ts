import fs from 'fs';
import path from 'path';
import { getSupabase, SEED_INSIGHTS, mapRowToInsight } from '../src/lib/supabase.ts';
import { InsightPost } from '../src/types.ts';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        out.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      continue;
    }

    if (trimmed.startsWith('### ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<h3 class="text-xl font-bold text-slate-900 mt-6 mb-3">${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<h2 class="text-2xl font-extrabold text-slate-900 mt-8 mb-4 border-b border-slate-200 pb-2">${formatInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<h1 class="text-3xl font-extrabold text-slate-900 mt-8 mb-4">${formatInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>');
        out.push('<ol class="list-decimal pl-6 space-y-2 my-4 text-slate-700">');
        inList = true;
        listType = 'ol';
      }
      out.push(`<li>${formatInline(numMatch[2])}</li>`);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>');
        out.push('<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700">');
        inList = true;
        listType = 'ul';
      }
      out.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<blockquote class="border-l-4 border-blue-600 pl-4 py-1 italic my-4 text-slate-600 bg-slate-50 rounded-r-lg">${formatInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
    out.push(`<p class="text-slate-700 leading-relaxed my-4">${formatInline(trimmed)}</p>`);
  }

  if (inList) {
    out.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  return out.join('\n');
}

function formatInline(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" rel="noopener">$1</a>');
}

export default async function handler(req: any, res: any) {
  const slug = (req.query?.slug || req.url?.split('?')[0]?.split('/').pop() || '').trim();

  // Load base HTML template
  const candidatePaths = [
    path.join(process.cwd(), 'dist', 'insights', 'index.html'),
    path.join(process.cwd(), 'insights', 'index.html'),
    path.join(process.cwd(), 'dist', 'insights.html'),
  ];

  let baseHtml = '';
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      baseHtml = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  if (!baseHtml) {
    return res.status(500).send('Insights template not found');
  }

  if (!slug) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(baseHtml);
  }

  // Find post in Supabase or fallback
  let post: InsightPost | null = null;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (!error && data) {
        post = mapRowToInsight(data);
      }
    }
  } catch (err) {
    console.error('Error fetching insight post:', err);
  }

  if (!post) {
    const foundSeed = SEED_INSIGHTS.find((p) => p.slug === slug);
    if (foundSeed) post = foundSeed;
  }

  if (!post) {
    // If not found, still return the SPA template with 404
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(baseHtml);
  }

  const canonicalUrl = `https://macronest.online/insights/${post.slug}`;
  const rawTitle = post.metaTitle || post.title;
  const pageTitle = rawTitle.includes('MacroNest') ? rawTitle : `${rawTitle} | MacroNest Insights`;
  const metaDesc = post.metaDescription || post.excerpt;
  const cleanDesc = escapeHtml(metaDesc);
  const cleanTitle = escapeHtml(post.title);
  const keywords = escapeHtml(post.tags?.join(', ') || post.focusKeyword || 'India macro insights, economy, RBI');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: metaDesc,
    image: post.coverImageUrl || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.authorName,
      jobTitle: post.authorRole || 'Macroeconomic Intelligence',
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
    keywords: post.tags?.join(', ') || post.focusKeyword,
  };

  const renderedBodyHtml = `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav aria-label="Breadcrumb" class="mb-6 flex items-center justify-between flex-wrap gap-3">
        <a href="/insights" class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs">
          &larr; Back to Insights
        </a>
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <a href="/" class="hover:text-blue-600">Home</a> &gt; 
          <a href="/insights" class="hover:text-blue-600">Insights</a> &gt; 
          <span class="font-semibold text-slate-700">${escapeHtml(post.category)}</span>
        </div>
      </nav>

      <article class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs">
        <header class="space-y-4">
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
              ${escapeHtml(post.category)}
            </span>
            <span class="text-xs text-slate-500 font-semibold">
              ${new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span class="text-slate-300">•</span>
            <span class="text-xs text-slate-500 font-semibold">
              ${post.readingTimeMinutes} min read
            </span>
          </div>

          <h1 class="text-2xl sm:text-4xl font-extrabold text-slate-950 leading-tight tracking-tight">
            ${cleanTitle}
          </h1>

          <p class="text-base sm:text-lg font-medium text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-4 py-1">
            ${escapeHtml(post.excerpt)}
          </p>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                MN
              </div>
              <div>
                <div class="text-sm font-bold text-slate-900">${escapeHtml(post.authorName)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(post.authorRole || 'Macroeconomic Intelligence')}</div>
              </div>
            </div>
          </div>
        </header>

        ${post.coverImageUrl ? `
          <div class="mt-8 rounded-2xl overflow-hidden border border-slate-200 max-h-[420px] bg-slate-100">
            <img src="${post.coverImageUrl}" alt="${cleanTitle}" class="w-full h-full object-cover" />
          </div>
        ` : ''}

        <div class="mt-8 pt-8 border-t border-slate-100 prose max-w-none">
          ${markdownToHtml(post.content)}
        </div>

        ${post.tags && post.tags.length > 0 ? `
          <footer class="mt-10 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
            ${post.tags.map((t: string) => `<span class="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">#${escapeHtml(t)}</span>`).join('')}
          </footer>
        ` : ''}
      </article>
    </div>
  `;

  let articleHtml = baseHtml;
  articleHtml = articleHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
  articleHtml = articleHtml.replace(/<link[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" id="canonical-url" href="${canonicalUrl}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" id="meta-description" content="${cleanDesc}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*name=["']keywords["'][^>]*>/i, `<meta name="keywords" id="meta-keywords" content="${keywords}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*property=["']og:title["'][^>]*>/i, `<meta property="og:title" id="og-title" content="${cleanTitle}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*property=["']og:description["'][^>]*>/i, `<meta property="og:description" id="og-description" content="${cleanDesc}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*property=["']og:url["'][^>]*>/i, `<meta property="og:url" id="og-url" content="${canonicalUrl}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*property=["']og:type["'][^>]*>/i, `<meta property="og:type" id="og-type" content="article" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" id="twitter-title" content="${cleanTitle}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" id="twitter-description" content="${cleanDesc}" />`);
  articleHtml = articleHtml.replace(/<meta[^>]*name=["']twitter:url["'][^>]*>/i, `<meta name="twitter:url" id="twitter-url" content="${canonicalUrl}" />`);

  if (post.coverImageUrl) {
    articleHtml = articleHtml.replace(/<meta[^>]*property=["']og:image["'][^>]*>/i, `<meta property="og:image" id="og-image" content="${post.coverImageUrl}" />`);
    articleHtml = articleHtml.replace(/<meta[^>]*name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" id="twitter-image" content="${post.coverImageUrl}" />`);
  }

  // Replace default schema with specific BlogPosting schema
  const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
  if (articleHtml.includes('<script type="application/ld+json">')) {
    articleHtml = articleHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLdScript);
  } else {
    articleHtml = articleHtml.replace('</head>', `  ${jsonLdScript}\n  </head>`);
  }

  // Inject rendered body into root
  articleHtml = articleHtml.replace(/<div id="root">[\s\S]*?<\/div>(\s*<noscript>|<script)/, `<div id="root">${renderedBodyHtml}</div>$1`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(articleHtml);
}
