import fs from 'fs';
import path from 'path';
import { getSupabase, SEED_INSIGHTS, mapRowToInsight } from '../src/lib/supabase.ts';
import { InsightPost } from '../src/types.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  let posts: InsightPost[] = [];
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        posts = data.map(mapRowToInsight);
      }
    }
  } catch (err) {
    console.error('Error fetching insights for sitemap:', err);
  }

  if (posts.length === 0) {
    posts = SEED_INSIGHTS;
  }

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
</urlset>`;

  return res.status(200).send(sitemapXml);
}
