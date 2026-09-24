import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getSupabase, SEED_INSIGHTS, mapRowToInsight } from '../src/lib/supabase.ts';
import { InsightPost } from '../src/types.ts';

dotenv.config();

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

    // Headers
    if (trimmed.startsWith('### ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<h3 class="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3">${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<h2 class="text-2xl font-extrabold text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">${formatInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-8 mb-4">${formatInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    // Numbered List
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>');
        out.push('<ol class="list-decimal pl-6 space-y-2 my-4 text-slate-700 dark:text-slate-300">');
        inList = true;
        listType = 'ol';
      }
      out.push(`<li>${formatInline(numMatch[2])}</li>`);
      continue;
    }

    // Bulleted List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>');
        out.push('<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700 dark:text-slate-300">');
        inList = true;
        listType = 'ul';
      }
      out.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(`<blockquote class="border-l-4 border-blue-600 dark:border-blue-400 pl-4 py-1 italic my-4 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-r-lg">${formatInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    // Standard paragraph
    if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
    out.push(`<p class="text-slate-700 dark:text-slate-300 leading-relaxed my-4">${formatInline(trimmed)}</p>`);
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
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" rel="noopener">$1</a>');
}

async function fetchAllPosts(): Promise<InsightPost[]> {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        console.log(`Fetched ${data.length} published articles from Supabase.`);
        return data.map(mapRowToInsight);
      }
    }
  } catch (err) {
    console.warn('Could not query Supabase during prerender, using fallback seed posts:', err);
  }

  console.log(`Using ${SEED_INSIGHTS.length} seed articles for static prerendering.`);
  return SEED_INSIGHTS;
}

async function run() {
  const distDir = path.join(process.cwd(), 'dist');
  const insightsDistTemplate = path.join(distDir, 'insights', 'index.html');

  if (!fs.existsSync(insightsDistTemplate)) {
    console.error(`Error: ${insightsDistTemplate} does not exist. Run vite build first.`);
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(insightsDistTemplate, 'utf8');
  const posts = await fetchAllPosts();

  console.log(`Prerendering static HTML pages for ${posts.length} articles...`);

  for (const post of posts) {
    const canonicalUrl = `https://macronest.online/insights/${post.slug}`;
    const rawTitle = post.metaTitle || post.title;
    const pageTitle = rawTitle.includes('MacroNest') ? rawTitle : `${rawTitle} | MacroNest Insights`;
    const metaDesc = post.metaDescription || post.excerpt;
    const cleanDesc = escapeHtml(metaDesc);
    const cleanTitle = escapeHtml(post.title);
    const keywords = escapeHtml(post.tags?.join(', ') || post.focusKeyword || 'India macro insights, economy, RBI');

    // JSON-LD Schema
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
        logo: {
          '@type': 'ImageObject',
          url: 'https://macronest.online/macronest-logo.svg',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
      keywords: post.tags?.join(', ') || post.focusKeyword,
    };

    // Semantic Pre-Rendered HTML content
    const renderedBodyHtml = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav aria-label="Breadcrumb" class="mb-6 flex items-center justify-between flex-wrap gap-3">
          <a href="/insights" class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xs">
            &larr; Back to Insights
          </a>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <a href="/" class="hover:text-blue-600">Home</a> &gt; 
            <a href="/insights" class="hover:text-blue-600">Insights</a> &gt; 
            <span class="font-semibold text-slate-700">${escapeHtml(post.category)}</span>
          </div>
        </nav>

        <article class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs">
          <header class="space-y-4">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
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

            <h1 class="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white leading-tight tracking-tight">
              ${cleanTitle}
            </h1>

            <p class="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed border-l-4 border-blue-600 pl-4 py-1">
              ${escapeHtml(post.excerpt)}
            </p>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  MN
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-900 dark:text-white">${escapeHtml(post.authorName)}</div>
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

          <div class="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 prose dark:prose-invert max-w-none">
            ${markdownToHtml(post.content)}
          </div>

          ${post.tags && post.tags.length > 0 ? `
            <footer class="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              ${post.tags.map((t: string) => `<span class="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">#${escapeHtml(t)}</span>`).join('')}
            </footer>
          ` : ''}
        </article>
      </div>
    `;

    // Inject tags into HTML
    let articleHtml = baseHtml;

    // 1. Replace title
    articleHtml = articleHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // 2. Replace Canonical
    articleHtml = articleHtml.replace(/<link[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" id="canonical-url" href="${canonicalUrl}" />`);

    // 3. Replace Meta Description
    articleHtml = articleHtml.replace(/<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" id="meta-description" content="${cleanDesc}" />`);

    // 4. Replace Keywords
    articleHtml = articleHtml.replace(/<meta[^>]*name=["']keywords["'][^>]*>/i, `<meta name="keywords" id="meta-keywords" content="${keywords}" />`);

    // 5. Replace OpenGraph & Twitter
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

    // 6. Inject Article Schema.org JSON-LD (replacing default directory schema)
    const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
    if (articleHtml.includes('<script type="application/ld+json">')) {
      articleHtml = articleHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLdScript);
    } else {
      articleHtml = articleHtml.replace('</head>', `  ${jsonLdScript}\n  </head>`);
    }

    // 7. Inject rendered content into root
    const rootStart = articleHtml.indexOf('<div id="root">');
    const noscriptStart = articleHtml.indexOf('<noscript>', rootStart);
    if (rootStart !== -1 && noscriptStart !== -1) {
      articleHtml =
        articleHtml.substring(0, rootStart) +
        `<div id="root">${renderedBodyHtml}</div>\n\n    ` +
        articleHtml.substring(noscriptStart);
    } else {
      articleHtml = articleHtml.replace('<div id="root"></div>', `<div id="root">${renderedBodyHtml}</div>`);
    }

    // Write file to dist/insights/[slug]/index.html & dist/insights/[slug].html
    const slugDir = path.join(distDir, 'insights', post.slug);
    if (!fs.existsSync(slugDir)) {
      fs.mkdirSync(slugDir, { recursive: true });
    }
    fs.writeFileSync(path.join(slugDir, 'index.html'), articleHtml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'insights', `${post.slug}.html`), articleHtml, 'utf8');

    console.log(`✓ Prerendered: /insights/${post.slug}`);
  }

  // Generate complete sitemap.xml with all articles
  const today = new Date().toISOString().split('T')[0];
  const sitemapUrls = [
    { loc: 'https://macronest.online/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://macronest.online/global', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://macronest.online/calendar', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://macronest.online/calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: 'https://macronest.online/insights', priority: '0.9', changefreq: 'weekly' },
  ];

  posts.forEach((p) => {
    sitemapUrls.push({
      loc: `https://macronest.online/insights/${p.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
    });
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), sitemapXml, 'utf8');
  console.log(`✓ Generated sitemap.xml with ${sitemapUrls.length} total URLs.`);
}

run().catch((err) => {
  console.error('Error during prerender:', err);
  process.exit(1);
});
