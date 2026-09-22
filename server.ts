import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { INDIA_MACRO_CALENDAR_TEMPLATES, ATTACHED_SCREENSHOT_SPEC_METRICS } from './src/data/macroCalendar.ts';
import { INITIAL_MACRO_METRICS_WITHOUT_NUMBERS } from './src/data/initialMetrics.ts';
import { INITIAL_BLOG_POSTS } from './src/data/initialPosts.ts';
import { MacroMetric, BlogPost } from './src/types.ts';
import { parseMetricsCSV, exportMetricsToCSV } from './src/utils/csvParser.ts';

// Load environment variables from .env
dotenv.config();

const PORT = 3000;
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'metrics.json');
const DATA_CSV_FILE = path.join(DATA_DIR, 'metrics.csv');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

// Ensure data directory and initial files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_MACRO_METRICS_WITHOUT_NUMBERS, null, 2), 'utf-8');
}

if (!fs.existsSync(POSTS_FILE)) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(INITIAL_BLOG_POSTS, null, 2), 'utf-8');
}

// ================= SEO & CANONICAL DOMAIN HELPERS ================= //
const PRIMARY_CANONICAL_DOMAIN = 'https://macronest.online';

function getCanonicalBaseUrl(req: express.Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = (req.headers.host || '').toLowerCase();
  if (host.includes('macronest.online')) {
    return 'https://macronest.online';
  }
  if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('run.app')) {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    return `${proto}://${host}`;
  }
  return PRIMARY_CANONICAL_DOMAIN;
}

const SLUG_ALIASES: Record<string, string> = {
  'rbi-monetary-policy-repo-rate-decision': 'decoding-india-banking-system-liquidity-rbi-stance',
  'india-cpi-inflation-trajectory-food-core-dynamics': 'headline-cpi-vs-core-inflation-deconstructing-food-price-impulse',
  'banking-liquidity-deficit-and-call-money-rate-dynamics': 'decoding-india-banking-system-liquidity-rbi-stance',
};

function syncSitemapXmlFile(posts: BlogPost[], baseUrl: string = PRIMARY_CANONICAL_DOMAIN) {
  try {
    const publishedPosts = posts.filter((p) => p.isPublished);
    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/calendar</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const post of publishedPosts) {
      const postDate = post.updatedAt
        ? new Date(post.updatedAt).toISOString().split('T')[0]
        : now;
      xml += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    }

    xml += `\n</urlset>\n`;

    const publicSitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(publicSitemapPath, xml, 'utf-8');

    const distSitemapPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
    if (fs.existsSync(path.dirname(distSitemapPath))) {
      fs.writeFileSync(distSitemapPath, xml, 'utf-8');
    }
  } catch (err) {
    console.warn('Could not sync sitemap.xml to disk:', err);
  }
}

// ================= ADMIN AUTHENTICATION ================= //

interface AuthConfig {
  passwordHash: string;
  salt: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

const DEFAULT_DUMMY_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'AdminMacro2026!';

function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function getAuthConfig(): AuthConfig {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const content = fs.readFileSync(AUTH_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading auth config:', err);
  }

  // Generate initial dummy password config with mustChangePassword: true
  const salt = crypto.randomBytes(16).toString('hex');
  const initialConfig: AuthConfig = {
    passwordHash: hashPassword(DEFAULT_DUMMY_PASSWORD, salt),
    salt,
    mustChangePassword: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(initialConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving initial auth config:', err);
  }

  return initialConfig;
}

function saveAuthConfig(config: AuthConfig) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving auth config:', err);
  }
}

// Memory session tokens
interface SessionInfo {
  token: string;
  createdAt: number;
}
const activeSessions = new Map<string, SessionInfo>();

function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  // Expire after 7 days
  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// ================= SUPABASE CLIENT & ARTICLE MAPPING ================= //

function sanitizeSupabaseUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  // Strip /rest/v1 or /rest/v1/ suffix if user pasted the REST endpoint URL
  url = url.replace(/\/rest\/v1\/?$/i, '');
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  return url || null;
}

let cachedSupabase: SupabaseClient | null = null;
let lastSupabaseConfigKey = '';

function getSupabaseClient(): SupabaseClient | null {
  const rawUrl = process.env.SUPABASE_URL;
  const url = sanitizeSupabaseUrl(rawUrl);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;

  const configKey = `${url}:${key}`;
  if (cachedSupabase && lastSupabaseConfigKey === configKey) {
    return cachedSupabase;
  }

  try {
    cachedSupabase = createClient(url, key, {
      auth: { persistSession: false },
    });
    lastSupabaseConfigKey = configKey;
    return cachedSupabase;
  } catch (err) {
    console.error('Supabase initialization error:', err);
    return null;
  }
}

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.details || err.hint || '').toLowerCase();
  const code = String(err.code || '');
  return (
    code === 'PGRST204' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

const cachedTableStatus: {
  macroParameters: boolean | null;
  articles: boolean | null;
  adminAuth: boolean | null;
  lastChecked: number;
} = {
  macroParameters: null,
  articles: null,
  adminAuth: null,
  lastChecked: 0,
};

async function getAuthConfigAsync(): Promise<AuthConfig> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const now = Date.now();
    if (cachedTableStatus.adminAuth === false && now - cachedTableStatus.lastChecked < 60000) {
      return getAuthConfig();
    }

    try {
      const { data, error } = await supabase
        .from('admin_auth')
        .select('*')
        .eq('id', 'primary_admin')
        .maybeSingle();

      if (!error) {
        cachedTableStatus.adminAuth = true;
        cachedTableStatus.lastChecked = now;
        if (data && data.password_hash && data.salt) {
          return {
            passwordHash: data.password_hash,
            salt: data.salt,
            mustChangePassword: Boolean(data.must_change_password),
            updatedAt: data.updated_at || new Date().toISOString(),
          };
        }
      } else if (isTableMissingError(error)) {
        cachedTableStatus.adminAuth = false;
        cachedTableStatus.lastChecked = now;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.adminAuth = false;
        cachedTableStatus.lastChecked = now;
      }
    }
  }

  return getAuthConfig();
}

async function saveAuthConfigAsync(config: AuthConfig): Promise<void> {
  saveAuthConfig(config);

  const supabase = getSupabaseClient();
  if (supabase && cachedTableStatus.adminAuth !== false) {
    try {
      const { error } = await supabase.from('admin_auth').upsert({
        id: 'primary_admin',
        password_hash: config.passwordHash,
        salt: config.salt,
        must_change_password: config.mustChangePassword,
        updated_at: config.updatedAt,
      });
      if (error && isTableMissingError(error)) {
        cachedTableStatus.adminAuth = false;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.adminAuth = false;
      }
    }
  }
}

function mapRowToBlogPost(row: any): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category || 'Monetary Policy',
    author: row.author || 'Macro Research Desk',
    readTimeMinutes: Number(row.read_time_minutes) || 5,
    coverImage: row.cover_image || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    seo: {
      metaTitle: row.seo_meta_title || row.title,
      metaDescription: row.seo_meta_description || row.excerpt,
      keywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : [],
      canonicalUrl: row.seo_canonical_url || '',
      ogImage: row.seo_og_image || '',
      structuredDataType: row.seo_structured_data_type || 'Article',
    },
  };
}

function mapBlogPostToRow(post: BlogPost): any {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    author: post.author,
    read_time_minutes: post.readTimeMinutes,
    cover_image: post.coverImage || '',
    tags: post.tags || [],
    is_published: post.isPublished,
    published_at: post.publishedAt,
    updated_at: post.updatedAt,
    seo_meta_title: post.seo.metaTitle,
    seo_meta_description: post.seo.metaDescription,
    seo_keywords: post.seo.keywords || [],
    seo_canonical_url: post.seo.canonicalUrl || '',
    seo_og_image: post.seo.ogImage || '',
    seo_structured_data_type: post.seo.structuredDataType || 'Article',
  };
}

// Map database row to MacroMetric
function mapRowToMetric(row: any): MacroMetric {
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    frequency: row.frequency || 'MONTHLY',
    category: row.category || 'REAL ECONOMY',
    status: row.status || 'Normal',
    stanceState: row.stance_state || row.status || 'Normal',
    value: row.value || '—',
    unit: row.unit || '',
    previousValue: row.previous_value || '',
    deltaValue: row.delta_value || '',
    deltaDisplay: row.delta_display || '',
    deltaType: row.delta_type || 'neutral',
    trendDirection: row.trend_direction || '',
    trendBadgeStyle: row.trend_badge_style || '',
    targetAnchor: row.target_anchor || '',
    summary: row.summary || '',
    narrativeCommentary: row.summary || '',
    sourceName: row.source_name || '',
    sourceUrl: row.source_url || '',
    observationPeriod: row.observation_period || '',
    releaseDate: row.release_date || '',
    releaseWindow: row.release_window || '',
    typicalReleaseWindow: row.release_window || '',
    nextExpectedRelease: row.next_expected_release || '',
    dataStatus: row.data_status || 'provisional',
    verificationStatus: row.verification_status || 'verified_official',
    researchNotes: row.research_notes || '',
    isPublished: Boolean(row.is_published ?? true),
    order: Number(row.display_order ?? row.order ?? 1),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// Map base database row (backward compatible if Supabase columns not yet added)
function mapMetricToBaseRow(metric: MacroMetric): any {
  return {
    id: metric.id,
    slug: metric.slug || metric.id,
    title: metric.title,
    frequency: metric.frequency,
    category: metric.category,
    status: metric.status,
    value: metric.value,
    unit: metric.unit,
    delta_value: metric.deltaValue || '',
    delta_type: metric.deltaType || 'neutral',
    target_anchor: metric.targetAnchor || '',
    summary: metric.summary || metric.narrativeCommentary || '',
    source_name: metric.sourceName || '',
    source_url: metric.sourceUrl || '',
    release_date: metric.releaseDate || '',
    release_window: metric.releaseWindow || metric.typicalReleaseWindow || '',
    is_published: metric.isPublished,
    display_order: metric.order,
    created_at: metric.createdAt || new Date().toISOString(),
    updated_at: metric.updatedAt || new Date().toISOString(),
  };
}

// Map MacroMetric to full database row
function mapMetricToRow(metric: MacroMetric): any {
  return {
    ...mapMetricToBaseRow(metric),
    stance_state: metric.stanceState || metric.status,
    previous_value: metric.previousValue || '',
    delta_display: metric.deltaDisplay || '',
    trend_direction: metric.trendDirection || '',
    trend_badge_style: metric.trendBadgeStyle || '',
    observation_period: metric.observationPeriod || '',
    next_expected_release: metric.nextExpectedRelease || '',
    data_status: metric.dataStatus || 'provisional',
    verification_status: metric.verificationStatus || 'verified_official',
    research_notes: metric.researchNotes || '',
  };
}

function readMetricsLocal(): MacroMetric[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local metrics:', err);
  }
  return [];
}

function writeMetricsLocal(metrics: MacroMetric[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(metrics, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local metrics:', err);
  }
}

// Async Metrics Reader: Checks Supabase first if configured, falls back to local file
async function readMetricsAsync(): Promise<MacroMetric[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const now = Date.now();
    if (cachedTableStatus.macroParameters === false && now - cachedTableStatus.lastChecked < 60000) {
      return readMetricsLocal();
    }

    try {
      const { data, error } = await supabase
        .from('macro_parameters')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error) {
        cachedTableStatus.macroParameters = true;
        cachedTableStatus.lastChecked = now;
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapRowToMetric);
          // Keep local cache fresh with latest cloud data
          writeMetricsLocal(mapped);
          return mapped;
        }

        // If macro_parameters table exists in Supabase but is empty, seed it with local metrics
        if (Array.isArray(data) && data.length === 0) {
          const localMetrics = readMetricsLocal();
          if (localMetrics.length > 0) {
            await saveAllMetricsAsync(localMetrics, { replaceAll: true });
            return localMetrics;
          }
        }
      } else if (isTableMissingError(error)) {
        cachedTableStatus.macroParameters = false;
        cachedTableStatus.lastChecked = now;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.macroParameters = false;
        cachedTableStatus.lastChecked = now;
      }
    }
  }
  return readMetricsLocal();
}

// Async Metric Saver: updates local file + Supabase
async function saveMetricAsync(metric: MacroMetric): Promise<void> {
  const localMetrics = readMetricsLocal();
  const idx = localMetrics.findIndex((m) => m.id === metric.id);
  if (idx >= 0) {
    localMetrics[idx] = metric;
  } else {
    localMetrics.push(metric);
  }
  writeMetricsLocal(localMetrics);

  const supabase = getSupabaseClient();
  if (supabase && cachedTableStatus.macroParameters !== false) {
    try {
      // First prevent unique constraint violation on slug (macro_parameters_slug_key)
      const targetSlug = metric.slug || metric.id;
      if (targetSlug) {
        await supabase
          .from('macro_parameters')
          .delete()
          .eq('slug', targetSlug)
          .neq('id', metric.id);
      }

      const row = mapMetricToRow(metric);
      const { error } = await supabase.from('macro_parameters').upsert(row, { onConflict: 'id' });
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('column') || msg.includes('does not exist')) {
          const baseRow = mapMetricToBaseRow(metric);
          await supabase.from('macro_parameters').upsert(baseRow, { onConflict: 'id' });
        } else if (isTableMissingError(error)) {
          cachedTableStatus.macroParameters = false;
        }
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.macroParameters = false;
      }
    }
  }
}

// Async Metric Deleter: removes from local file + Supabase
async function deleteMetricAsync(id: string): Promise<void> {
  const localMetrics = readMetricsLocal();
  const filtered = localMetrics.filter((m) => m.id !== id);
  writeMetricsLocal(filtered);

  const supabase = getSupabaseClient();
  if (supabase && cachedTableStatus.macroParameters !== false) {
    try {
      const { error } = await supabase.from('macro_parameters').delete().eq('id', id);
      if (error && isTableMissingError(error)) {
        cachedTableStatus.macroParameters = false;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.macroParameters = false;
      }
    }
  }
}

// Async Batch Metrics Saver: updates local file + Supabase
async function saveAllMetricsAsync(
  metrics: MacroMetric[],
  options?: { replaceAll?: boolean }
): Promise<{ success: boolean; totalSaved: number; purgedCount: number; error?: string }> {
  writeMetricsLocal(metrics);

  const supabase = getSupabaseClient();
  let purgedCount = 0;

  if (supabase && cachedTableStatus.macroParameters !== false) {
    try {
      const incomingIds = new Set(metrics.map((m) => m.id));
      const incomingSlugs = new Set(metrics.map((m) => m.slug || m.id));

      if (options?.replaceAll) {
        // Find existing IDs and slugs in Supabase to purge obsolete/stale rows
        const { data: existingRows } = await supabase
          .from('macro_parameters')
          .select('id, slug');

        if (Array.isArray(existingRows) && existingRows.length > 0) {
          const idsToDelete: string[] = [];
          for (const row of existingRows) {
            // Delete if row ID is not in new metrics list
            if (!incomingIds.has(row.id)) {
              idsToDelete.push(row.id);
            }
            // Or delete if this row has a slug that matches one of our incoming metrics but under a different ID
            else if (row.slug && incomingSlugs.has(row.slug) && !metrics.some((m) => m.id === row.id && (m.slug || m.id) === row.slug)) {
              idsToDelete.push(row.id);
            }
          }

          if (idsToDelete.length > 0) {
            for (let i = 0; i < idsToDelete.length; i += 50) {
              const chunk = idsToDelete.slice(i, i + 50);
              const { error: delErr } = await supabase.from('macro_parameters').delete().in('id', chunk);
              if (!delErr) {
                purgedCount += chunk.length;
              }
            }
          }
        }
      } else {
        // In non-replace mode, still purge conflicting rows where another ID holds the same slug
        for (const m of metrics) {
          const targetSlug = m.slug || m.id;
          if (targetSlug) {
            await supabase
              .from('macro_parameters')
              .delete()
              .eq('slug', targetSlug)
              .neq('id', m.id);
          }
        }
      }

      // Upsert full rows into Supabase
      const rows = metrics.map(mapMetricToRow);
      const { error } = await supabase.from('macro_parameters').upsert(rows, { onConflict: 'id' });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('column') || msg.includes('does not exist')) {
          console.warn('Supabase missing extended columns, retrying batch upsert with base columns (including slug)...');
          const baseRows = metrics.map(mapMetricToBaseRow);
          const { error: baseErr } = await supabase.from('macro_parameters').upsert(baseRows, { onConflict: 'id' });
          if (baseErr) {
            console.error('Base batch upsert failed:', baseErr);
            return { success: false, totalSaved: metrics.length, purgedCount, error: baseErr.message };
          }
        } else if (isTableMissingError(error)) {
          cachedTableStatus.macroParameters = false;
        } else {
          console.error('Upsert to macro_parameters failed:', error);
          return { success: false, totalSaved: metrics.length, purgedCount, error: error.message };
        }
      }

      cachedTableStatus.macroParameters = true;
      return { success: true, totalSaved: metrics.length, purgedCount };
    } catch (err: any) {
      if (isTableMissingError(err)) {
        cachedTableStatus.macroParameters = false;
      }
      return { success: false, totalSaved: metrics.length, purgedCount, error: err?.message || String(err) };
    }
  }

  return { success: true, totalSaved: metrics.length, purgedCount: 0 };
}

function readPostsLocal(): BlogPost[] {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const content = fs.readFileSync(POSTS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local posts:', err);
  }
  return [];
}

function writePostsLocal(posts: BlogPost[]) {
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local posts:', err);
  }
}

// Async Posts Reader: Checks Supabase first if configured, falls back to local
async function readPostsAsync(): Promise<BlogPost[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const now = Date.now();
    if (cachedTableStatus.articles === false && now - cachedTableStatus.lastChecked < 60000) {
      return readPostsLocal();
    }

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false });

      if (!error) {
        cachedTableStatus.articles = true;
        cachedTableStatus.lastChecked = now;
        if (Array.isArray(data) && data.length > 0) {
          return data.map(mapRowToBlogPost);
        }
      } else if (isTableMissingError(error)) {
        cachedTableStatus.articles = false;
        cachedTableStatus.lastChecked = now;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.articles = false;
        cachedTableStatus.lastChecked = now;
      }
    }
  }
  return readPostsLocal();
}

// Async Post Saver: writes to local file + Supabase if configured
async function savePostAsync(post: BlogPost): Promise<void> {
  // Always update local storage
  const localPosts = readPostsLocal();
  const idx = localPosts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    localPosts[idx] = post;
  } else {
    localPosts.unshift(post);
  }
  writePostsLocal(localPosts);
  syncSitemapXmlFile(localPosts);

  // Sync with Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase && cachedTableStatus.articles !== false) {
    try {
      const row = mapBlogPostToRow(post);
      const { error } = await supabase.from('articles').upsert(row, { onConflict: 'id' });
      if (error && isTableMissingError(error)) {
        cachedTableStatus.articles = false;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.articles = false;
      }
    }
  }
}

// Async Post Deleter: removes from local + Supabase
async function deletePostAsync(id: string): Promise<void> {
  const localPosts = readPostsLocal();
  const filtered = localPosts.filter((p) => p.id !== id);
  writePostsLocal(filtered);
  syncSitemapXmlFile(filtered);

  const supabase = getSupabaseClient();
  if (supabase && cachedTableStatus.articles !== false) {
    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error && isTableMissingError(error)) {
        cachedTableStatus.articles = false;
      }
    } catch (err) {
      if (isTableMissingError(err)) {
        cachedTableStatus.articles = false;
      }
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get all metrics (reads from Supabase if configured, falls back to local JSON)
  app.get('/api/metrics', async (_req, res) => {
    try {
      const metrics = await readMetricsAsync();
      res.json(metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Get calendar templates from India Macro Data Calendar
  app.get('/api/calendar-templates', (_req, res) => {
    res.json(INDIA_MACRO_CALENDAR_TEMPLATES);
  });

  // Create a new metric
  app.post('/api/metrics', async (req, res) => {
    try {
      const metrics = await readMetricsAsync();
      const newMetric: MacroMetric = {
        id: req.body.id || `metric-${Date.now()}`,
        title: req.body.title || 'Untitled Metric',
        frequency: req.body.frequency || 'MONTHLY',
        category: req.body.category || 'REAL ECONOMY',
        status: req.body.status || 'Normal',
        value: req.body.value || '0',
        unit: req.body.unit || '',
        deltaValue: req.body.deltaValue || '0%',
        deltaType: req.body.deltaType || 'neutral',
        targetAnchor: req.body.targetAnchor || '',
        summary: req.body.summary || '',
        sourceName: req.body.sourceName || 'Official Release',
        sourceUrl: req.body.sourceUrl || '',
        releaseDate: req.body.releaseDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        releaseWindow: req.body.releaseWindow || '',
        isPublished: req.body.isPublished !== undefined ? req.body.isPublished : true,
        order: req.body.order !== undefined ? req.body.order : metrics.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveMetricAsync(newMetric);
      res.status(201).json(newMetric);
    } catch (err) {
      console.error('Error creating metric:', err);
      res.status(500).json({ error: 'Failed to create metric' });
    }
  });

  // Update an existing metric
  app.put('/api/metrics/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const metrics = await readMetricsAsync();
      const index = metrics.findIndex((m) => m.id === id);

      if (index === -1) {
        res.status(404).json({ error: 'Metric not found' });
        return;
      }

      const updatedMetric: MacroMetric = {
        ...metrics[index],
        ...req.body,
        id,
        updatedAt: new Date().toISOString(),
      };

      await saveMetricAsync(updatedMetric);
      res.json(updatedMetric);
    } catch (err) {
      console.error('Error updating metric:', err);
      res.status(500).json({ error: 'Failed to update metric' });
    }
  });

  // Delete a metric
  app.delete('/api/metrics/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const metrics = await readMetricsAsync();
      const exists = metrics.some((m) => m.id === id);

      if (!exists) {
        res.status(404).json({ error: 'Metric not found' });
        return;
      }

      await deleteMetricAsync(id);
      res.json({ success: true, deletedId: id });
    } catch (err) {
      console.error('Error deleting metric:', err);
      res.status(500).json({ error: 'Failed to delete metric' });
    }
  });

  // Reorder metrics
  app.post('/api/metrics/reorder', async (req, res) => {
    try {
      let orderedIds: string[] = [];

      if (Array.isArray(req.body?.orderedIds)) {
        orderedIds = req.body.orderedIds;
      } else if (Array.isArray(req.body)) {
        orderedIds = req.body
          .map((item: any) => (typeof item === 'string' ? item : item?.id))
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
      }

      if (!orderedIds.length) {
        res.status(400).json({ error: 'orderedIds must be an array of IDs or objects with id' });
        return;
      }

      const metrics = await readMetricsAsync();
      const metricMap = new Map(metrics.map((m) => [m.id, m]));
      const reordered: MacroMetric[] = [];

      orderedIds.forEach((id, idx) => {
        const item = metricMap.get(id);
        if (item) {
          reordered.push({ ...item, order: idx + 1 });
          metricMap.delete(id);
        }
      });

      // Append any remaining metrics not explicitly in the list
      metricMap.forEach((item) => {
        reordered.push({ ...item, order: reordered.length + 1 });
      });

      await saveAllMetricsAsync(reordered);
      res.json(reordered);
    } catch (err) {
      console.error('Error reordering metrics:', err);
      res.status(500).json({ error: 'Failed to reorder metrics' });
    }
  });

  // Admin action: Reset to full official indicators list (without numbers)
  app.post('/api/metrics/reset-template', async (_req, res) => {
    try {
      await saveAllMetricsAsync(INITIAL_MACRO_METRICS_WITHOUT_NUMBERS);
      res.json({
        success: true,
        message: 'Reset to official macro indicators (without numbers)',
        metrics: INITIAL_MACRO_METRICS_WITHOUT_NUMBERS
      });
    } catch (err) {
      console.error('Error resetting metrics:', err);
      res.status(500).json({ error: 'Failed to reset metrics' });
    }
  });

  // Admin action: Load attached screenshot sample cards (optional admin action)
  app.post('/api/metrics/populate-sample', async (_req, res) => {
    try {
      await saveAllMetricsAsync(ATTACHED_SCREENSHOT_SPEC_METRICS, { replaceAll: true });
      res.json({
        success: true,
        message: 'Populated 3 reference metrics from attached screenshot spec',
        metrics: ATTACHED_SCREENSHOT_SPEC_METRICS
      });
    } catch (err) {
      console.error('Error populating sample metrics:', err);
      res.status(500).json({ error: 'Failed to populate sample metrics' });
    }
  });

  // Admin action: Clear all metrics (reset to empty)
  app.post('/api/metrics/clear', async (_req, res) => {
    try {
      writeMetricsLocal([]);
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('macro_parameters').delete().not('id', 'is', null);
      }
      res.json({
        success: true,
        message: 'All metrics cleared from both local storage and Supabase cloud database.',
        metrics: []
      });
    } catch (err) {
      console.error('Error clearing metrics:', err);
      res.status(500).json({ error: 'Failed to clear metrics' });
    }
  });

  // ================= CSV METRICS UPLOAD & EXPORT API ================= //

  // Upload and parse CSV file for metrics
  app.post('/api/metrics/upload-csv', upload.single('file'), async (req, res) => {
    try {
      let csvContent = '';

      // Check if file was uploaded via multer
      if (req.file && req.file.buffer) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (typeof req.body === 'string' && req.body.trim().length > 0) {
        // Raw text/csv body
        csvContent = req.body;
      } else if (req.body && typeof req.body === 'object') {
        // JSON body with csvContent or csv field
        csvContent = req.body.csvContent || req.body.csv || req.body.fileContent || '';
      }

      if (!csvContent || csvContent.trim().length === 0) {
        res.status(400).json({
          error: 'No CSV content provided. Upload a file with field name "file" or send CSV text in the request body.',
        });
        return;
      }

      // Parse the CSV using our robust RFC 4180 parser
      const parseResult = parseMetricsCSV(csvContent);

      if (parseResult.errors.length > 0 && parseResult.metrics.length === 0) {
        res.status(400).json({
          error: 'Failed to parse CSV file',
          details: parseResult.errors,
          totalRows: parseResult.totalRows,
        });
        return;
      }

      const mode = (req.body?.mode || req.query?.mode || 'replace').toString().toLowerCase();
      let finalMetrics: MacroMetric[] = [];

      if (mode === 'upsert') {
        const existing = await readMetricsAsync();
        const map = new Map<string, MacroMetric>();
        existing.forEach((item) => {
          map.set(item.id, item);
          if (item.slug) map.set(item.slug, item);
        });

        parseResult.metrics.forEach((m) => {
          const matched = map.get(m.id) || (m.slug ? map.get(m.slug) : undefined);
          if (matched) {
            const merged: MacroMetric = {
              ...matched,
              ...m,
              id: matched.id,
              order: matched.order,
              updatedAt: new Date().toISOString(),
            };
            map.set(matched.id, merged);
          } else {
            map.set(m.id, {
              ...m,
              order: map.size + 1,
            });
          }
        });

        // Deduplicate values
        const uniqueMetrics = Array.from(new Set(map.values()));
        finalMetrics = uniqueMetrics.sort((a, b) => (a.order || 0) - (b.order || 0));
      } else {
        // Default: replace mode
        finalMetrics = parseResult.metrics.map((m, idx) => ({
          ...m,
          order: idx + 1,
        }));
      }

      // Persist metrics to local storage + Supabase with automatic orphaned/stale row purge
      const syncResult = await saveAllMetricsAsync(finalMetrics, { replaceAll: mode === 'replace' });

      // Archive CSV to disk
      try {
        fs.writeFileSync(DATA_CSV_FILE, csvContent, 'utf-8');
      } catch (err) {
        console.warn('Could not archive metrics to CSV file:', err);
      }

      const publishedCount = finalMetrics.filter((m) => m.isPublished).length;
      const draftCount = finalMetrics.length - publishedCount;

      res.json({
        success: true,
        message: `Successfully processed ${parseResult.metrics.length} metrics from CSV (${mode} mode). ${
          syncResult.purgedCount ? `Purged ${syncResult.purgedCount} obsolete/conflicting indicators in Supabase.` : ''
        }`,
        mode,
        totalUploaded: parseResult.metrics.length,
        totalStored: finalMetrics.length,
        purgedCount: syncResult.purgedCount || 0,
        publishedCount,
        draftCount,
        warnings: parseResult.errors,
        metrics: finalMetrics,
      });
    } catch (err: any) {
      console.error('Error handling CSV upload:', err);
      res.status(500).json({ error: 'Failed to process CSV file', details: err?.message || String(err) });
    }
  });

  // Load official indicators from default CSV (data/metrics.csv)
  app.post('/api/metrics/load-default-csv', async (req, res) => {
    try {
      let csvContent = '';
      if (fs.existsSync(DATA_CSV_FILE)) {
        csvContent = fs.readFileSync(DATA_CSV_FILE, 'utf-8');
      } else {
        const rootCsv = path.join(process.cwd(), 'data', 'metrics.csv');
        if (fs.existsSync(rootCsv)) {
          csvContent = fs.readFileSync(rootCsv, 'utf-8');
        }
      }

      if (!csvContent) {
        res.status(404).json({ error: 'Default metrics CSV file not found on server.' });
        return;
      }

      const parseResult = parseMetricsCSV(csvContent);
      if (parseResult.metrics.length === 0) {
        res.status(400).json({ error: 'No metrics found in default CSV file.' });
        return;
      }

      const finalMetrics = parseResult.metrics.map((m, idx) => ({
        ...m,
        order: idx + 1,
      }));

      const syncResult = await saveAllMetricsAsync(finalMetrics, { replaceAll: true });

      const publishedCount = finalMetrics.filter((m) => m.isPublished).length;
      const draftCount = finalMetrics.length - publishedCount;

      res.json({
        success: true,
        message: `Loaded ${finalMetrics.length} official indicators from default CSV. ${
          syncResult.purgedCount ? `Purged ${syncResult.purgedCount} obsolete/conflicting indicators in Supabase.` : ''
        }`,
        totalStored: finalMetrics.length,
        purgedCount: syncResult.purgedCount || 0,
        publishedCount,
        draftCount,
        metrics: finalMetrics,
      });
    } catch (err: any) {
      console.error('Error loading default CSV:', err);
      res.status(500).json({ error: 'Failed to load default CSV', details: err?.message || String(err) });
    }
  });

  // Export current metrics as CSV
  app.get('/api/metrics/export-csv', async (_req, res) => {
    try {
      const metrics = await readMetricsAsync();
      const csv = exportMetricsToCSV(metrics);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators.csv"');
      res.send(csv);
    } catch (err: any) {
      console.error('Error exporting metrics to CSV:', err);
      res.status(500).json({ error: 'Failed to export metrics to CSV' });
    }
  });

  // Download official CSV template
  app.get('/api/metrics/template-csv', (_req, res) => {
    try {
      let sampleCsv = '';
      if (fs.existsSync(DATA_CSV_FILE)) {
        sampleCsv = fs.readFileSync(DATA_CSV_FILE, 'utf-8');
      } else {
        const rootCsv = path.join(process.cwd(), 'data', 'metrics.csv');
        if (fs.existsSync(rootCsv)) {
          sampleCsv = fs.readFileSync(rootCsv, 'utf-8');
        }
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators_template.csv"');
      res.send(sampleCsv);
    } catch (err: any) {
      console.error('Error serving template CSV:', err);
      res.status(500).json({ error: 'Failed to serve template CSV' });
    }
  });

  // ================= ADMIN AUTHENTICATION API ================= //

  // Admin Login
  app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const config = await getAuthConfigAsync();
    const providedHash = hashPassword(password, config.salt);

    if (providedHash !== config.passwordHash) {
      res.status(401).json({ error: 'Incorrect admin password' });
      return;
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      token,
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      token,
      mustChangePassword: config.mustChangePassword,
    });
  });

  // Admin Auth Status check
  app.get('/api/admin/auth-status', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-admin-token'] as string);

    if (!isValidSession(token)) {
      res.json({ authenticated: false, mustChangePassword: false });
      return;
    }

    const config = await getAuthConfigAsync();
    res.json({
      authenticated: true,
      mustChangePassword: config.mustChangePassword,
    });
  });

  // Admin Change Password
  app.post('/api/admin/change-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-admin-token'] as string);

    if (!isValidSession(token)) {
      res.status(401).json({ error: 'Unauthorized. Please log in first.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const config = await getAuthConfigAsync();
    if (currentPassword) {
      const currentHash = hashPassword(currentPassword, config.salt);
      if (currentHash !== config.passwordHash) {
        res.status(401).json({ error: 'Current password does not match' });
        return;
      }
    }

    // Generate new salt and save
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);

    const updatedConfig: AuthConfig = {
      passwordHash: newHash,
      salt: newSalt,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    };

    await saveAuthConfigAsync(updatedConfig);

    res.json({
      success: true,
      message: 'Password changed successfully',
      mustChangePassword: false,
    });
  });

  // Admin Logout
  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-admin-token'] as string);

    if (token) {
      activeSessions.delete(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Supabase & Storage Connection Status
  app.get('/api/admin/db-status', async (_req, res) => {
    const supabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL);
    const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim());
    const isConfigured = Boolean(supabaseUrl && hasKey);

    const tables = {
      admin_auth: false,
      articles: false,
      macro_parameters: false,
    };

    const counts = {
      macro_parameters: 0,
      v_indicator_summary: 0,
      articles: 0,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const [authCheck, articlesCheck, paramsCheck, viewCheck] = await Promise.allSettled([
          supabase.from('admin_auth').select('id').limit(1),
          supabase.from('articles').select('id', { count: 'exact', head: true }),
          supabase.from('macro_parameters').select('id', { count: 'exact', head: true }),
          supabase.from('v_indicator_summary').select('id', { count: 'exact', head: true }),
        ]);

        tables.admin_auth = authCheck.status === 'fulfilled' && !authCheck.value.error;
        tables.articles = articlesCheck.status === 'fulfilled' && !articlesCheck.value.error;
        tables.macro_parameters = paramsCheck.status === 'fulfilled' && !paramsCheck.value.error;

        if (articlesCheck.status === 'fulfilled' && typeof (articlesCheck.value as any)?.count === 'number') {
          counts.articles = (articlesCheck.value as any).count;
        }
        if (paramsCheck.status === 'fulfilled' && typeof (paramsCheck.value as any)?.count === 'number') {
          counts.macro_parameters = (paramsCheck.value as any).count;
        }
        if (viewCheck.status === 'fulfilled' && typeof (viewCheck.value as any)?.count === 'number') {
          counts.v_indicator_summary = (viewCheck.value as any).count;
        }

        cachedTableStatus.adminAuth = tables.admin_auth;
        cachedTableStatus.articles = tables.articles;
        cachedTableStatus.macroParameters = tables.macro_parameters;
        cachedTableStatus.lastChecked = Date.now();
      } catch {
        // Fallback gracefully
      }
    }

    const allTablesReady = tables.admin_auth && tables.articles && tables.macro_parameters;

    res.json({
      supabaseConfigured: isConfigured,
      supabaseUrl: isConfigured ? supabaseUrl : null,
      mode: isConfigured ? 'supabase_cloud' : 'local_json_fallback',
      tables,
      counts,
      allTablesReady,
      message: !isConfigured
        ? 'Running in Local Storage mode. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to connect.'
        : allTablesReady
        ? `Connected to Supabase. (${counts.macro_parameters} parameters in database, ${counts.v_indicator_summary} in published view, ${counts.articles} articles).`
        : 'Connected to Supabase. Some tables are not yet created in your SQL Editor. Run supabase-schema.sql to finish setup.',
    });
  });

  // Admin action: Manually push all local parameters & articles to Supabase and purge obsolete rows
  app.post('/api/admin/sync-all-to-supabase', async (_req, res) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(400).json({ error: 'Supabase is not configured in .env' });
      return;
    }

    try {
      // 1. Sync admin credentials
      const config = await getAuthConfigAsync();
      await saveAuthConfigAsync(config);

      // 2. Sync macro parameters using saveAllMetricsAsync with replaceAll: true
      const localMetrics = readMetricsLocal();
      let metricPurgedCount = 0;
      if (localMetrics.length > 0) {
        const syncResult = await saveAllMetricsAsync(localMetrics, { replaceAll: true });
        if (!syncResult.success) {
          res.status(400).json({
            error: `macro_parameters table sync issue: ${syncResult.error}. Please run the reset-and-sync-supabase.sql script in your Supabase SQL Editor.`,
          });
          return;
        }
        metricPurgedCount = syncResult.purgedCount;
      }

      // 3. Sync articles
      const localPosts = readPostsLocal();
      if (localPosts.length > 0) {
        const rows = localPosts.map(mapBlogPostToRow);
        const { error: postErr } = await supabase.from('articles').upsert(rows, { onConflict: 'id' });
        if (postErr) {
          res.status(400).json({
            error: `articles table sync issue: ${postErr.message}. Please run the supabase-schema.sql script in your Supabase SQL Editor.`,
          });
          return;
        }
      }

      cachedTableStatus.adminAuth = true;
      cachedTableStatus.articles = true;
      cachedTableStatus.macroParameters = true;
      cachedTableStatus.lastChecked = Date.now();

      res.json({
        success: true,
        message: `Successfully synced all parameters and articles to Supabase. ${
          metricPurgedCount ? `Purged ${metricPurgedCount} obsolete/conflicting indicators.` : ''
        }`,
        syncedMetricsCount: localMetrics.length,
        syncedArticlesCount: localPosts.length,
        purgedCount: metricPurgedCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync with Supabase' });
    }
  });

  // Admin action: Specifically purge any stale/conflicting/legacy rows in Supabase macro_parameters
  app.post('/api/admin/purge-stale-supabase-metrics', async (_req, res) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(400).json({ error: 'Supabase is not configured' });
      return;
    }

    try {
      const localMetrics = readMetricsLocal();
      const syncResult = await saveAllMetricsAsync(localMetrics, { replaceAll: true });

      // Query counts after purge
      const { count: paramCount } = await supabase.from('macro_parameters').select('id', { count: 'exact', head: true });
      const { count: viewCount } = await supabase.from('v_indicator_summary').select('id', { count: 'exact', head: true });

      res.json({
        success: true,
        message: `Purged ${syncResult.purgedCount} obsolete/conflicting indicators from Supabase. Cloud database now contains exactly ${paramCount || localMetrics.length} indicators (${viewCount || 0} published in view).`,
        purgedCount: syncResult.purgedCount,
        activeCount: localMetrics.length,
        macroParametersCount: paramCount,
        vIndicatorSummaryCount: viewCount,
      });
    } catch (err: any) {
      console.error('Error purging stale Supabase metrics:', err);
      res.status(500).json({ error: err.message || 'Failed to purge stale Supabase metrics' });
    }
  });

  // ================= BLOG POSTS CMS API ================= //

  // Get all blog posts (reads from Supabase if configured, or local fallback)
  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await readPostsAsync();
      const { published } = req.query;
      if (published === 'true') {
        res.json(posts.filter((p) => p.isPublished));
        return;
      }
      res.json(posts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // Get single blog post by ID or slug
  app.get('/api/posts/:idOrSlug', async (req, res) => {
    try {
      const { idOrSlug } = req.params;
      const posts = await readPostsAsync();
      const post = posts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }
      res.json(post);
    } catch (err) {
      console.error('Error fetching post:', err);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  // Create new blog post
  app.post('/api/posts', async (req, res) => {
    try {
      const posts = await readPostsAsync();
      const title = req.body.title?.trim() || 'Untitled Analysis';
      const slugBase = req.body.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Ensure slug uniqueness
      let slug = slugBase || `post-${Date.now()}`;
      let counter = 1;
      while (posts.some((p) => p.slug === slug)) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }

      const excerpt = req.body.excerpt?.trim() || (req.body.content ? req.body.content.slice(0, 160).replace(/[#*`]/g, '').trim() + '...' : '');

      const newPost: BlogPost = {
        id: req.body.id || `post-${Date.now()}`,
        title,
        slug,
        excerpt,
        content: req.body.content || '',
        category: req.body.category || 'Monetary Policy',
        author: req.body.author || 'Editorial Team',
        readTimeMinutes: Number(req.body.readTimeMinutes) || Math.max(1, Math.ceil((req.body.content || '').split(/\s+/).length / 200)),
        coverImage: req.body.coverImage || '',
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        isPublished: req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true,
        publishedAt: req.body.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seo: {
          metaTitle: req.body.seo?.metaTitle?.trim() || `${title} | MacroNest.online Analysis`,
          metaDescription: req.body.seo?.metaDescription?.trim() || excerpt || title,
          keywords: Array.isArray(req.body.seo?.keywords) ? req.body.seo.keywords : [],
          canonicalUrl: (req.body.seo?.canonicalUrl && !req.body.seo.canonicalUrl.includes('indiamacrodashboard.com'))
            ? req.body.seo.canonicalUrl
            : `${PRIMARY_CANONICAL_DOMAIN}/blog/${slug}`,
          ogImage: req.body.seo?.ogImage || req.body.coverImage || '',
          structuredDataType: req.body.seo?.structuredDataType || 'Article',
        },
      };

      await savePostAsync(newPost);
      res.status(201).json(newPost);
    } catch (err) {
      console.error('Error creating post:', err);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // Update existing blog post
  app.put('/api/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const posts = await readPostsAsync();
      const index = posts.findIndex((p) => p.id === id);

      if (index === -1) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      const current = posts[index];
      const title = req.body.title !== undefined ? req.body.title.trim() : current.title;
      const content = req.body.content !== undefined ? req.body.content : current.content;
      const excerpt = req.body.excerpt !== undefined ? req.body.excerpt.trim() : current.excerpt;
      const slug = req.body.slug !== undefined ? req.body.slug.trim() : current.slug;

      const updatedPost: BlogPost = {
        ...current,
        ...req.body,
        id,
        title,
        slug,
        content,
        excerpt,
        readTimeMinutes: Number(req.body.readTimeMinutes) || Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
        updatedAt: new Date().toISOString(),
        seo: {
          ...current.seo,
          ...(req.body.seo || {}),
          metaTitle: req.body.seo?.metaTitle?.trim() || current.seo?.metaTitle || `${title} | MacroNest.online Analysis`,
          metaDescription: req.body.seo?.metaDescription?.trim() || current.seo?.metaDescription || excerpt,
          canonicalUrl: (req.body.seo?.canonicalUrl && !req.body.seo.canonicalUrl.includes('indiamacrodashboard.com'))
            ? req.body.seo.canonicalUrl
            : `${PRIMARY_CANONICAL_DOMAIN}/blog/${slug}`,
        },
      };

      await savePostAsync(updatedPost);
      res.json(updatedPost);
    } catch (err) {
      console.error('Error updating post:', err);
      res.status(500).json({ error: 'Failed to update post' });
    }
  });

  // Delete a blog post
  app.delete('/api/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const posts = await readPostsAsync();
      const exists = posts.some((p) => p.id === id);

      if (!exists) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      await deletePostAsync(id);
      res.json({ success: true, deletedId: id });
    } catch (err) {
      console.error('Error deleting post:', err);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // Reset blog posts to default initial posts
  app.post('/api/posts/reset-template', async (_req, res) => {
    try {
      writePostsLocal(INITIAL_BLOG_POSTS);
      const supabase = getSupabaseClient();
      if (supabase) {
        for (const post of INITIAL_BLOG_POSTS) {
          try {
            await supabase.from('articles').upsert(mapBlogPostToRow(post), { onConflict: 'id' });
          } catch (e) {
            console.error('Error resetting post in Supabase:', e);
          }
        }
      }
      res.json({
        success: true,
        message: 'Reset to initial macroeconomic analysis articles',
        posts: INITIAL_BLOG_POSTS,
      });
    } catch (err) {
      console.error('Error resetting posts:', err);
      res.status(500).json({ error: 'Failed to reset posts' });
    }
  });

  // ================= SEO, CRAWLER & INDEXING ROUTES ================= //

  function escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Dynamic robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    const robotsContent = `# Robots.txt for MacroNest.online | India Macroeconomic Indicators & Research
User-agent: *
Allow: /
Allow: /blog
Allow: /blog/*
Allow: /calendar
Allow: /sitemap.xml
Allow: /rss.xml
Allow: /feed.xml
Allow: /llms.txt
Disallow: /admin
Disallow: /admin/*
Disallow: /api/admin
Disallow: /api/admin/*

# Dedicated AI search crawlers & LLMs
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Cohere-ai
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${sitemapUrl}
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(robotsContent);
  });

  // Dynamic sitemap.xml generated with all published articles and core pages
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = getCanonicalBaseUrl(req);
      const posts = await readPostsAsync();
      const publishedPosts = posts.filter((p) => p.isPublished);
      const now = new Date().toISOString().split('T')[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/calendar</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

      for (const post of publishedPosts) {
        const postDate = post.updatedAt
          ? new Date(post.updatedAt).toISOString().split('T')[0]
          : now;
        xml += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
      }

      xml += `\n</urlset>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (err) {
      console.error('Error generating dynamic sitemap.xml:', err);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Dynamic RSS 2.0 / Feed XML for rapid search engine and news crawler indexing
  app.get(['/rss.xml', '/feed.xml'], async (req, res) => {
    try {
      const baseUrl = getCanonicalBaseUrl(req);
      const posts = await readPostsAsync();
      const publishedPosts = posts.filter((p) => p.isPublished);
      const buildDate = new Date().toUTCString();

      let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>MacroNest.online | India Macroeconomic Indicators &amp; Research</title>
    <link>${baseUrl}/blog</link>
    <description>In-depth macroeconomic analysis, monetary policy breakdowns, and economic indicator research on the Indian economy.</description>
    <language>en-IN</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
`;

      for (const post of publishedPosts) {
        const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : buildDate;
        const articleUrl = `${baseUrl}/blog/${post.slug}`;
        rss += `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description><![CDATA[${post.excerpt || post.title}]]></description>
      <category><![CDATA[${post.category || 'Macroeconomics'}]]></category>
      <dc:creator><![CDATA[${post.author || 'MacroNest Research Desk'}]]></dc:creator>
      <pubDate>${pubDate}</pubDate>
    </item>
`;
      }

      rss += `  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(rss);
    } catch (err) {
      console.error('Error generating RSS feed:', err);
      res.status(500).send('Error generating RSS feed');
    }
  });

  // SEO Helper API: returns structured individual URLs for Google Search Console URL Inspection
  app.get('/api/seo/article-urls', async (req, res) => {
    try {
      const baseUrl = getCanonicalBaseUrl(req);
      const posts = await readPostsAsync();
      const published = posts.filter((p) => p.isPublished);

      const articles = published.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        url: `${baseUrl}/blog/${p.slug}`,
        canonicalUrl: p.seo?.canonicalUrl || `${baseUrl}/blog/${p.slug}`,
        publishedAt: p.publishedAt,
        updatedAt: p.updatedAt,
      }));

      res.json({
        total: articles.length,
        canonicalBaseUrl: baseUrl,
        sitemapUrl: `${baseUrl}/sitemap.xml`,
        rssFeedUrl: `${baseUrl}/rss.xml`,
        robotsTxtUrl: `${baseUrl}/robots.txt`,
        articles,
        urlList: articles.map((a) => a.url),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve article URLs' });
    }
  });

  // Clean URL redirects for common search engine / crawler aliases
  app.get(['/sitemap', '/sitemap/'], (_req, res) => res.redirect(301, '/sitemap.xml'));
  app.get(['/rss', '/feed'], (_req, res) => res.redirect(301, '/rss.xml'));

  // Dynamic llms.txt standard for AI Search Engines (Perplexity, ChatGPT, Claude, Cursor)
  const handleLlmsTxt = async (req: express.Request, res: express.Response) => {
    try {
      const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
      const host = req.headers.host || 'localhost:3000';
      const baseUrl = `${proto}://${host}`;
      const posts = await readPostsAsync();
      const publishedPosts = posts.filter((p) => p.isPublished);

      let doc = `# India Macro Indicators & Economic Monitor\n\n`;
      doc += `> Official and independent monitor for Indian macroeconomic indicators, banking system liquidity, monetary policy anchors, and macroeconomic research.\n\n`;
      doc += `## Core Capabilities\n`;
      doc += `- Real-time tracking of Reserve Bank of India (RBI) repo rate, SDF, and MSF corridor anchors.\n`;
      doc += `- Systemic banking liquidity deficit / surplus monitoring via CCIL and RBI WSS feeds.\n`;
      doc += `- Consumer Price Index (CPI) and Wholesale Price Index (WPI) headline vs core inflation prints.\n`;
      doc += `- Foreign Exchange (Forex) reserve health and import cover metrics.\n`;
      doc += `- Macroeconomic Release Calendar with official publishing frequencies and statutory release windows.\n`;
      doc += `- Full research analyses covering monetary policy, fiscal deficits, liquidity management, and sovereign debt.\n\n`;
      doc += `## Key Sections & Canonical URLs\n`;
      doc += `- **Homepage & Indicator Monitor**: ${baseUrl}/\n`;
      doc += `- **Macroeconomic Release Calendar**: ${baseUrl}/calendar\n`;
      doc += `- **Macroeconomic Research & Analysis**: ${baseUrl}/blog\n\n`;
      doc += `## Published Research Articles\n`;
      for (const post of publishedPosts) {
        doc += `- [${post.title}](${baseUrl}/blog/${post.slug}): ${post.excerpt} (Category: ${post.category}, Author: ${post.author})\n`;
      }
      doc += `\n## Official Data Verification Sources\n`;
      doc += `- Reserve Bank of India (RBI): https://www.rbi.org.in\n`;
      doc += `- Ministry of Statistics and Programme Implementation (MoSPI): https://www.mospi.gov.in\n`;
      doc += `- Clearing Corporation of India Limited (CCIL): https://www.ccilindia.com\n`;
      doc += `- Ministry of Finance, Government of India: https://finmin.nic.in\n`;

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(doc);
    } catch (err) {
      console.error('Error generating llms.txt:', err);
      res.status(500).send('Error generating llms.txt');
    }
  };

  app.get('/llms.txt', handleLlmsTxt);
  app.get('/.well-known/llms.txt', handleLlmsTxt);

  // SEO HTML Pre-rendering & Metadata Injection Helper
  async function injectPreRenderedSEO(rawHtml: string, req: express.Request): Promise<string> {
    const baseUrl = getCanonicalBaseUrl(req);
    const pathname = req.path.toLowerCase();

    let html = rawHtml;

    // 1. Specific Individual Article URL: /blog/:slug
    if (pathname.startsWith('/blog/')) {
      const rawSlug = req.path.split('/')[2];
      const slug = (SLUG_ALIASES[rawSlug] || rawSlug || '').trim();
      if (slug) {
        try {
          const posts = await readPostsAsync();
          const post = posts.find((p) => p.slug === slug || p.id === slug);
          if (post) {
            const title = escapeHtml(post.seo?.metaTitle || `${post.title} | MacroNest.online Analysis`);
            const description = escapeHtml(post.seo?.metaDescription || post.excerpt);
            const keywords = escapeHtml((post.seo?.keywords?.length ? post.seo.keywords : post.tags || []).join(', '));
            const articleUrl = `${baseUrl}/blog/${post.slug}`;
            const author = escapeHtml(post.author || 'MacroNest Research Desk');
            const datePublished = post.publishedAt || new Date().toISOString();
            const dateModified = post.updatedAt || datePublished;

            // Replace Title Tag
            html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

            // Replace or Inject Description
            if (html.includes('<meta name="description"')) {
              html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);
            } else {
              html = html.replace('</head>', `<meta name="description" content="${description}" />\n</head>`);
            }

            // Replace or Inject Keywords
            if (html.includes('<meta name="keywords"')) {
              html = html.replace(/<meta\s+name="keywords"\s+content=".*?"\s*\/?>/i, `<meta name="keywords" content="${keywords}" />`);
            }

            // Replace or Inject Canonical Tag
            if (html.includes('<link rel="canonical"')) {
              html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${articleUrl}" />`);
            } else {
              html = html.replace('</head>', `<link rel="canonical" href="${articleUrl}" />\n</head>`);
            }

            // Replace OpenGraph & Twitter Tags
            html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
            html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
            html = html.replace(/<meta\s+property="og:type"\s+content=".*?"\s*\/?>/i, `<meta property="og:type" content="article" />`);
            html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${articleUrl}" />`);
            html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
            html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);

            // Inject Schema.org BlogPosting
            const articleSchema = {
              '@context': 'https://schema.org',
              '@type': post.seo?.structuredDataType || 'BlogPosting',
              'headline': post.title,
              'description': post.excerpt,
              'author': {
                '@type': 'Person',
                'name': post.author || 'MacroNest Research Desk',
              },
              'datePublished': datePublished,
              'dateModified': dateModified,
              'mainEntityOfPage': {
                '@type': 'WebPage',
                '@id': articleUrl,
              },
              'publisher': {
                '@type': 'Organization',
                'name': 'MacroNest.online',
                'url': baseUrl,
              },
              'keywords': post.seo?.keywords?.join(', ') || post.tags?.join(', ') || 'India Economy, Macroeconomics',
              'articleSection': post.category,
            };

            const schemaScript = `\n<script type="application/ld+json" id="article-structured-data">\n${JSON.stringify(articleSchema, null, 2)}\n</script>\n`;
            html = html.replace('</head>', `${schemaScript}</head>`);

            // Semantic HTML noscript block inside body for bots and search engines that don't execute JS
            const cleanParagraphs = (post.content || '')
              .split(/\n\n+/)
              .filter((p) => p.trim())
              .map((p) => `<p>${escapeHtml(p.replace(/^[#*-]\s+/g, ''))}</p>`)
              .join('\n');

            const noscriptContent = `
<noscript>
  <article style="max-width: 800px; margin: 2rem auto; padding: 1rem; font-family: sans-serif; line-height: 1.6;">
    <header>
      <span style="color: #2563eb; font-weight: bold; font-size: 0.875rem;">${escapeHtml(post.category)}</span>
      <h1 style="font-size: 2rem; margin: 0.5rem 0;">${escapeHtml(post.title)}</h1>
      <p style="color: #64748b; font-size: 0.875rem;">Published on ${escapeHtml(post.publishedAt)} by ${author} | Read time: ${post.readTimeMinutes || 5} min</p>
      <p style="font-size: 1.125rem; font-weight: 500; margin: 1rem 0; color: #334155;">${escapeHtml(post.excerpt)}</p>
    </header>
    <div class="article-body" style="margin-top: 1.5rem; color: #1e293b;">
      ${cleanParagraphs}
    </div>
  </article>
</noscript>`;

            html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${noscriptContent}`);
            return html;
          }
        } catch (err) {
          console.error('Error pre-rendering blog article SEO:', err);
        }
      }
    }

    // 2. Insights Page: /blog
    if (pathname === '/blog') {
      const title = 'India Macro Insights & Policy Analyses | India Macro Dashboard';
      const description = 'Deep-dive macroeconomic analyses on Reserve Bank of India policy decisions, systemic banking liquidity deficit, inflation anchors, and economic trends.';
      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);
      html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${baseUrl}/blog" />`);
      html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
      return html;
    }

    // 3. Macro Calendar Page: /calendar
    if (pathname === '/calendar') {
      const title = 'India Macroeconomic Release Calendar | Official Schedules & Windows';
      const description = 'Statutory publishing frequencies and release windows for RBI MPC decisions, CPI inflation, GDP prints, WPI, and Forex reserves.';
      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);
      html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${baseUrl}/calendar" />`);
      html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
      return html;
    }

    // 4. Default Homepage (/)
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${baseUrl}/" />`);
    return html;
  }

  // 301 Permanent Redirects for legacy slug aliases to preserve search engine equity
  app.get('/blog/:slug', (req, res, next) => {
    const rawSlug = (req.params.slug || '').toLowerCase().trim();
    if (SLUG_ALIASES[rawSlug]) {
      return res.redirect(301, `/blog/${SLUG_ALIASES[rawSlug]}`);
    }
    next();
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Intercept navigation requests to inject server-side SEO metadata before Vite SPA fallback
    app.get(['/', '/blog', '/blog/:slug', '/calendar'], async (req, res, next) => {
      if (req.headers.accept?.includes('text/html')) {
        try {
          const indexHtmlPath = path.join(process.cwd(), 'index.html');
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          const html = await injectPreRenderedSEO(template, req);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(html);
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
          return;
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    let indexHtmlTemplate = '';
    try {
      if (fs.existsSync(indexHtmlPath)) {
        indexHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');
      }
    } catch (e) {
      console.warn('Could not load dist/index.html upfront:', e);
    }

    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res) => {
      if (req.headers.accept?.includes('text/html') && indexHtmlTemplate) {
        const html = await injectPreRenderedSEO(indexHtmlTemplate, req);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`India Macro Dashboard server running on port ${PORT}`);
  });
}

startServer();
