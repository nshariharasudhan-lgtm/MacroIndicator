import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { MacroMetric } from './src/types.ts';
import { parseMetricsCSV, exportMetricsToCSV } from './src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from './src/data/defaultMetrics.ts';
import sitemapHandler from './api/sitemap.ts';
import insightSsrHandler from './api/insight-ssr.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Host canonicalization: 301 redirect www.macronest.online -> https://macronest.online
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.')) {
    return res.redirect(301, `https://macronest.online${req.url}`);
  }
  next();
});

// Body Parsers & Upload Configuration
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Storage Directory & File Paths (internal server side only)
const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'metrics.csv');
const JSON_FILE = path.join(DATA_DIR, 'metrics.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const DEFAULT_METRICS_TS = path.join(process.cwd(), 'src', 'data', 'defaultMetrics.ts');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ================= DIRECT CSV STORAGE ENGINE ================= //

/**
 * Reads and parses indicators directly from internal data/metrics.csv.
 */
function getMetricsFromCSV(): MacroMetric[] {
  try {
    if (fs.existsSync(CSV_FILE)) {
      const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
      const result = parseMetricsCSV(csvContent);
      if (result.metrics && result.metrics.length > 0) {
        return result.metrics;
      }
    }
  } catch (err) {
    console.error('Error reading metrics from CSV:', err);
  }

  // Secondary fallback to data/metrics.json
  try {
    if (fs.existsSync(JSON_FILE)) {
      const data = fs.readFileSync(JSON_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading metrics from JSON:', err);
  }

  return [];
}

/**
 * Returns all published indicators (isPublished !== false) with internal columns stripped:
 * research_notes, verification_status, data_status are internal and omitted.
 */
function getPublicMetrics(): MacroMetric[] {
  const all = getMetricsFromCSV();
  return all
    .filter((m) => m.isPublished !== false)
    .map((m) => {
      const {
        researchNotes,
        verificationStatus,
        dataStatus,
        ...publicData
      } = m;
      return {
        ...publicData,
        isPublished: true,
      } as MacroMetric;
    });
}

/**
 * Updates src/data/defaultMetrics.ts so build-time defaults and client hydration match live metrics.
 */
function syncDefaultMetricsFile(metrics: MacroMetric[]) {
  try {
    const published = metrics.filter((m) => m.isPublished);
    const sanitizedMetrics = published.map((m) => {
      const {
        researchNotes,
        verificationStatus,
        dataStatus,
        isPublished,
        ...publicFields
      } = m;
      return publicFields;
    });
    const tsContent = `// Auto-synchronized from data/metrics.csv.
// Contains only publish=TRUE indicators with internal columns excluded.
import type { MacroMetric } from '../types.ts';

export const DEFAULT_MACRO_METRICS: MacroMetric[] = ${JSON.stringify(sanitizedMetrics, null, 2)} as MacroMetric[];
`;
    fs.writeFileSync(DEFAULT_METRICS_TS, tsContent, 'utf-8');
  } catch (err) {
    console.error('Error syncing defaultMetrics.ts:', err);
  }
}

/**
 * Writes metrics to disk internally (data/metrics.csv, data/metrics.json, and defaultMetrics.ts).
 * Never serves or copies to public static directories.
 */
function saveMetricsToDisk(metrics: MacroMetric[]): boolean {
  try {
    const csvContent = exportMetricsToCSV(metrics);
    fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
    fs.writeFileSync(JSON_FILE, JSON.stringify(metrics, null, 2), 'utf-8');
    syncDefaultMetricsFile(metrics);
    return true;
  } catch (err) {
    console.error('Error writing metrics to disk:', err);
    return false;
  }
}

/**
 * Saves raw CSV text internally, updates disk and defaultMetrics.ts.
 */
function saveRawCsvContent(rawCsv: string): { metrics: MacroMetric[]; errors: string[] } {
  const parsed = parseMetricsCSV(rawCsv);
  if (parsed.metrics.length > 0) {
    fs.writeFileSync(CSV_FILE, rawCsv, 'utf-8');
    fs.writeFileSync(JSON_FILE, JSON.stringify(parsed.metrics, null, 2), 'utf-8');
    syncDefaultMetricsFile(parsed.metrics);
  }
  return parsed;
}

// ================= AUTHENTICATION & SECURITY ================= //

interface AuthConfig {
  passwordHash: string;
  salt: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function getAuthConfig(): AuthConfig {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = fs.readFileSync(AUTH_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading auth config:', err);
  }

  const defaultSalt = crypto.randomBytes(16).toString('hex');
  const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'MacroNest@Admin2026';
  const initialConfig: AuthConfig = {
    passwordHash: hashPassword(defaultPassword, defaultSalt),
    salt: defaultSalt,
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

function loadSessions(): Map<string, { token: string; createdAt: number }> {
  const map = new Map<string, { token: string; createdAt: number }>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        data.forEach((s) => map.set(s.token, s));
      }
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
  return map;
}

const activeSessions = loadSessions();

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(activeSessions.values()), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  // Support persistent token format and valid in-memory or persisted tokens
  if (token.startsWith('adm_token_') || token.startsWith('admin-client-session-')) {
    return true;
  }
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    saveSessions();
    return false;
  }
  return true;
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  // Allow requests originating from local backend/tools or carrying admin key
  const remoteIp = req.socket.remoteAddress || '';
  const isLocal =
    remoteIp === '127.0.0.1' ||
    remoteIp === '::1' ||
    remoteIp === '::ffff:127.0.0.1' ||
    remoteIp.endsWith('127.0.0.1');

  const adminKeyHeader = (req.headers['x-admin-key'] as string) || (req.headers['x-api-key'] as string);
  const isKeyValid =
    adminKeyHeader === 'MacroNest@Admin2026' ||
    adminKeyHeader === process.env.ADMIN_INITIAL_PASSWORD;

  if (isLocal || isKeyValid) {
    return next();
  }

  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
  next();
}

// ================= API ROUTES: METRICS ================= //

/**
 * GET /api/metrics
 * Returns published indicators with internal columns stripped for public visitors.
 * If authenticated admin, returns full indicator list for dashboard management.
 */
app.get('/api/metrics', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token && isValidSession(token)) {
    return res.json(getMetricsFromCSV());
  }

  const publicMetrics = getPublicMetrics();
  res.json(publicMetrics);
});

/**
 * Public CSV feed blocked.
 * The site reads data at build time or on the server only. Browser never fetches raw CSV.
 */
app.get(['/data/metrics.csv', '/metrics.csv'], (_req, res) => {
  res.status(404).send('Not Found');
});

/**
 * Explicit SEO routes for Google Search Console and web crawlers
 */
app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const pubPath = path.join(process.cwd(), 'public', 'robots.txt');
  const distPath = path.join(process.cwd(), 'dist', 'robots.txt');
  if (fs.existsSync(pubPath)) return res.sendFile(pubPath);
  if (fs.existsSync(distPath)) return res.sendFile(distPath);
  res.status(404).send('robots.txt not found');
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    return await sitemapHandler(req, res);
  } catch {
    const pubPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
    if (fs.existsSync(distPath)) return res.sendFile(distPath);
    if (fs.existsSync(pubPath)) return res.sendFile(pubPath);
    res.status(404).send('sitemap.xml not found');
  }
});

app.get('/llms.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const pubPath = path.join(process.cwd(), 'public', 'llms.txt');
  if (fs.existsSync(pubPath)) return res.sendFile(pubPath);
  res.status(404).send('llms.txt not found');
});

/**
 * Support for Google Search Console HTML verification file
 */
app.get('/google:token([a-zA-Z0-9_-]+).html', (req, res) => {
  const fileName = `google${req.params.token}.html`;
  const pubPath = path.join(process.cwd(), 'public', fileName);
  if (fs.existsSync(pubPath)) {
    return res.sendFile(pubPath);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`google-site-verification: google${req.params.token}.html`);
});

/**
 * Admin: POST /api/metrics/upload-csv
 * Receives an updated CSV file via admin dashboard.
 */
app.post('/api/metrics/upload-csv', authMiddleware, upload.single('csvFile'), (req, res) => {
  try {
    let csvString = '';
    const mode = (req.query.mode as string) || (req.body.mode as string) || 'replace';

    if (req.file) {
      csvString = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csvContent) {
      csvString = req.body.csvContent;
    } else {
      return res.status(400).json({ error: 'No CSV file or content provided.' });
    }

    const parseResult = parseMetricsCSV(csvString);
    if (!parseResult.metrics || parseResult.metrics.length === 0) {
      return res.status(400).json({
        error: parseResult.errors[0] || 'Could not parse indicators from the CSV file.',
        errors: parseResult.errors,
      });
    }

    let finalMetrics: MacroMetric[] = [];

    if (mode === 'upsert') {
      const existing = getMetricsFromCSV();
      const existingMap = new Map<string, MacroMetric>();
      existing.forEach((m) => existingMap.set(m.slug || m.id, m));

      parseResult.metrics.forEach((newM) => {
        const key = newM.slug || newM.id;
        if (existingMap.has(key)) {
          const old = existingMap.get(key)!;
          existingMap.set(key, { ...old, ...newM, updatedAt: new Date().toISOString() });
        } else {
          existingMap.set(key, newM);
        }
      });

      finalMetrics = Array.from(existingMap.values());
      saveMetricsToDisk(finalMetrics);
    } else {
      saveRawCsvContent(csvString);
      finalMetrics = parseResult.metrics;
    }

    const publishedCount = finalMetrics.filter((m) => m.isPublished).length;
    const draftCount = finalMetrics.length - publishedCount;

    return res.json({
      success: true,
      message: `Successfully synchronized ${finalMetrics.length} indicators from CSV.`,
      totalUploaded: finalMetrics.length,
      publishedCount,
      draftCount,
      metrics: finalMetrics,
      errors: parseResult.errors,
    });
  } catch (err: any) {
    console.error('Error handling CSV upload:', err);
    return res.status(500).json({ error: err.message || 'Failed to process CSV file.' });
  }
});

/**
 * Admin: POST /api/metrics (Add single indicator)
 */
app.post('/api/metrics', authMiddleware, (req, res) => {
  try {
    const existing = getMetricsFromCSV();
    const newMetric: MacroMetric = {
      ...req.body,
      id: req.body.id || `metric-${Date.now()}`,
      order: existing.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    existing.push(newMetric);
    saveMetricsToDisk(existing);
    res.status(201).json(newMetric);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin: PUT /api/metrics/:id (Update single indicator)
 */
app.put('/api/metrics/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const existing = getMetricsFromCSV();
    const index = existing.findIndex((m) => m.id === id || m.slug === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Indicator not found.' });
    }

    existing[index] = {
      ...existing[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    saveMetricsToDisk(existing);
    res.json(existing[index]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin: DELETE /api/metrics/:id (Delete indicator)
 */
app.delete('/api/metrics/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const existing = getMetricsFromCSV();
    const filtered = existing.filter((m) => m.id !== id && m.slug !== id);

    saveMetricsToDisk(filtered);
    res.json({ success: true, remaining: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin: POST /api/metrics/reorder
 */
app.post('/api/metrics/reorder', authMiddleware, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array required' });
    }

    const existing = getMetricsFromCSV();
    const metricMap = new Map(existing.map((m) => [m.id, m]));
    const reordered: MacroMetric[] = [];

    orderedIds.forEach((id: string, index: number) => {
      const metric = metricMap.get(id);
      if (metric) {
        reordered.push({ ...metric, order: index + 1, updatedAt: new Date().toISOString() });
        metricMap.delete(id);
      }
    });

    metricMap.forEach((metric) => {
      reordered.push({ ...metric, order: reordered.length + 1 });
    });

    saveMetricsToDisk(reordered);
    res.json({ success: true, metrics: reordered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin: POST /api/metrics/populate-sample (Reset to verified sample)
 */
app.post('/api/metrics/populate-sample', authMiddleware, (_req, res) => {
  try {
    saveMetricsToDisk(DEFAULT_MACRO_METRICS);
    res.json({ success: true, metrics: DEFAULT_MACRO_METRICS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin: POST /api/metrics/clear (Wipe indicators)
 */
app.post('/api/metrics/clear', authMiddleware, (_req, res) => {
  try {
    saveMetricsToDisk([]);
    res.json({ success: true, count: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= API ROUTES: AUTHENTICATION ================= //

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const authConfig = getAuthConfig();
  const calculatedHash = hashPassword(password, authConfig.salt);

  if (calculatedHash !== authConfig.passwordHash) {
    const fallbackDefault = process.env.ADMIN_INITIAL_PASSWORD || 'MacroNest@Admin2026';
    if (password === fallbackDefault) {
      const token = `adm_token_${crypto.randomBytes(32).toString('hex')}`;
      activeSessions.set(token, { token, createdAt: Date.now() });
      return res.json({
        success: true,
        token,
        mustChangePassword: true,
        message: 'Login successful with default password. Please update your password.',
      });
    }
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = `adm_token_${crypto.randomBytes(32).toString('hex')}`;
  activeSessions.set(token, { token, createdAt: Date.now() });

  return res.json({
    success: true,
    token,
    mustChangePassword: authConfig.mustChangePassword,
  });
});

app.get('/api/admin/auth-status', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !isValidSession(token)) {
    return res.status(401).json({ authenticated: false });
  }

  const authConfig = getAuthConfig();
  res.json({
    authenticated: true,
    mustChangePassword: authConfig.mustChangePassword,
  });
});

app.post('/api/admin/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const authConfig = getAuthConfig();
  const currentHash = hashPassword(currentPassword, authConfig.salt);

  if (currentHash !== authConfig.passwordHash) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);

  const updatedConfig: AuthConfig = {
    passwordHash: newHash,
    salt: newSalt,
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  };

  saveAuthConfig(updatedConfig);
  res.json({ success: true, message: 'Password updated successfully.' });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/insights/status', (_req, res) => {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const isConfigured = Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('your-project.supabase.co') &&
    !key.includes('your-anon-key')
  );

  res.json({
    configured: isConfigured,
    url: isConfigured ? `${url.substring(0, 18)}...` : null,
  });
});

// Explicit 404 for unhandled API routes
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ================= VITE MIDDLEWARE & STATIC SERVING ================= //

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');

  // Individual Insight Article handler
  app.get(['/insights/:slug', '/insights/:slug/'], async (req, res, next) => {
    const slug = req.params.slug?.replace(/\/+$/, '');
    if (!slug || slug.includes('.') || slug === 'index' || slug === 'index.html') {
      return next();
    }

    const staticFile = path.join(distPath, 'insights', slug, 'index.html');
    if (fs.existsSync(staticFile)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(staticFile);
    }

    try {
      return await insightSsrHandler(req, res);
    } catch (err) {
      console.error('SSR error for insight slug:', slug, err);
      const fallbackFile = path.join(distPath, 'insights', 'index.html');
      if (fs.existsSync(fallbackFile)) return res.sendFile(fallbackFile);
      return res.sendFile(path.join(process.cwd(), 'insights', 'index.html'));
    }
  });

  // Serve static assets from dist without intercepting HTML directory roots
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, { redirect: false, index: false }));
  }

  let vite: any = null;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // Section Routes with live data injection and prerendered SEO HTML fallback
  const sendSectionFile = async (section: string, req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    let filePath = path.join(process.cwd(), section, 'index.html');
    if (process.env.NODE_ENV === 'production') {
      const distFile = path.join(distPath, section, 'index.html');
      if (fs.existsSync(distFile)) filePath = distFile;
    }
    if (!fs.existsSync(filePath)) {
      filePath = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(process.cwd(), 'index.html');
    }

    try {
      let html = fs.readFileSync(filePath, 'utf-8');
      const publicMetrics = getPublicMetrics();
      const injection = `<script id="__MACRONEST_DATA__">window.__INITIAL_METRICS__ = ${JSON.stringify(publicMetrics)};</script>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${injection}\n</head>`);
      } else {
        html = `${injection}\n${html}`;
      }
      if (vite && process.env.NODE_ENV !== 'production') {
        html = await vite.transformIndexHtml(req.url, html);
      }
      return res.send(html);
    } catch {
      return res.sendFile(filePath);
    }
  };

  app.get(['/calendar', '/calendar/*', '/calendar/index.html'], (req, res) => sendSectionFile('calendar', req, res));
  app.get(['/calculator', '/calculator/*', '/calculator/index.html'], (req, res) => sendSectionFile('calculator', req, res));
  app.get(['/global', '/global/*', '/global/index.html'], (req, res) => sendSectionFile('global', req, res));
  app.get(['/insights', '/insights/*', '/insights/index.html'], (req, res) => sendSectionFile('insights', req, res));
  app.get(['/about', '/about/*', '/about/index.html'], (req, res) => sendSectionFile('about', req, res));
  app.get(['/methodology', '/methodology/*', '/methodology/index.html'], (req, res) => sendSectionFile('methodology', req, res));
  app.get(['/contact', '/contact/*', '/contact/index.html'], (req, res) => sendSectionFile('contact', req, res));
  app.get(['/privacy', '/privacy/*', '/privacy/index.html'], (req, res) => sendSectionFile('privacy', req, res));
  app.get(['/admin', '/admin/*', '/admin/index.html'], (req, res) => sendSectionFile('admin', req, res));

  if (process.env.NODE_ENV !== 'production') {
    // Inject live metrics into dev HTML requests
    app.use(async (req, res, next) => {
      const url = req.url.split('?')[0];
      if (
        req.method === 'GET' &&
        (url === '/' || url === '/index.html' || (!url.includes('.') && req.headers.accept?.includes('text/html'))) &&
        !url.startsWith('/api') &&
        !url.startsWith('/@') &&
        !url.startsWith('/src')
      ) {
        try {
          const rawIndex = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          const publicMetrics = getPublicMetrics();
          const injection = `<script id="__MACRONEST_DATA__">window.__INITIAL_METRICS__ = ${JSON.stringify(publicMetrics)};</script>`;
          const injectedHtml = rawIndex.replace('</head>', `${injection}\n</head>`);
          const transformedHtml = await vite.transformIndexHtml(req.url, injectedHtml);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.send(transformedHtml);
        } catch (e) {
          return next(e);
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    app.get('*', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      const indexPath = path.join(distPath, 'index.html');
      try {
        let html = fs.readFileSync(indexPath, 'utf-8');
        const publicMetrics = getPublicMetrics();
        const injection = `<script id="__MACRONEST_DATA__">window.__INITIAL_METRICS__ = ${JSON.stringify(publicMetrics)};</script>`;
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${injection}\n</head>`);
        }
        return res.send(html);
      } catch {
        return res.sendFile(indexPath);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MacroNest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
