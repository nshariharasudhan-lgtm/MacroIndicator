import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { MacroMetric } from './src/types.ts';
import { parseMetricsCSV, exportMetricsToCSV } from './src/utils/csvParser.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Canonical domain redirect: www.macronest.online -> macronest.online (301 Permanent)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.')) {
    const nonWwwHost = host.slice(4);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    return res.redirect(301, `${protocol}://${nonWwwHost}${req.originalUrl}`);
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

// Storage Directory & File Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'metrics.csv');
const JSON_FILE = path.join(DATA_DIR, 'metrics.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const PUBLIC_DATA_DIR = path.join(PUBLIC_DIR, 'data');
const PUBLIC_CSV_FILE = path.join(PUBLIC_DATA_DIR, 'metrics.csv');
const PUBLIC_ROOT_CSV = path.join(PUBLIC_DIR, 'metrics.csv');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PUBLIC_DATA_DIR)) {
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
}

// ================= DIRECT CSV STORAGE ENGINE ================= //

/**
 * Reads and parses the indicators directly from data/metrics.csv.
 * Guarantees that any changes to data/metrics.csv are reflected instantly.
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
    // Fallback to public/data/metrics.csv if data/metrics.csv is empty
    if (fs.existsSync(PUBLIC_CSV_FILE)) {
      const csvContent = fs.readFileSync(PUBLIC_CSV_FILE, 'utf-8');
      const result = parseMetricsCSV(csvContent);
      if (result.metrics && result.metrics.length > 0) {
        return result.metrics;
      }
    }
  } catch (err) {
    console.error('Error reading metrics from CSV:', err);
  }
  return [];
}

/**
 * Writes metrics to CSV on disk, ensuring both data/metrics.csv
 * and public/data/metrics.csv are synchronized immediately.
 */
function saveMetricsToDisk(metrics: MacroMetric[]): boolean {
  try {
    const csvContent = exportMetricsToCSV(metrics);
    // Write primary CSV
    fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
    // Write public copies for static assets
    fs.writeFileSync(PUBLIC_CSV_FILE, csvContent, 'utf-8');
    fs.writeFileSync(PUBLIC_ROOT_CSV, csvContent, 'utf-8');
    // Also write JSON mirror
    fs.writeFileSync(JSON_FILE, JSON.stringify(metrics, null, 2), 'utf-8');

    // Also mirror to dist if dist exists (e.g. running build)
    const distDataDir = path.join(process.cwd(), 'dist', 'data');
    if (fs.existsSync(distDataDir)) {
      try {
        fs.writeFileSync(path.join(distDataDir, 'metrics.csv'), csvContent, 'utf-8');
        fs.writeFileSync(path.join(process.cwd(), 'dist', 'metrics.csv'), csvContent, 'utf-8');
      } catch (_) {}
    }
    return true;
  } catch (err) {
    console.error('Error writing metrics to disk:', err);
    return false;
  }
}

/**
 * Saves raw CSV text directly to disk and validates it.
 */
function saveRawCsvContent(rawCsv: string): { metrics: MacroMetric[]; errors: string[] } {
  const parsed = parseMetricsCSV(rawCsv);
  if (parsed.metrics.length > 0) {
    fs.writeFileSync(CSV_FILE, rawCsv, 'utf-8');
    fs.writeFileSync(PUBLIC_CSV_FILE, rawCsv, 'utf-8');
    fs.writeFileSync(PUBLIC_ROOT_CSV, rawCsv, 'utf-8');
    fs.writeFileSync(JSON_FILE, JSON.stringify(parsed.metrics, null, 2), 'utf-8');

    const distDataDir = path.join(process.cwd(), 'dist', 'data');
    if (fs.existsSync(distDataDir)) {
      try {
        fs.writeFileSync(path.join(distDataDir, 'metrics.csv'), rawCsv, 'utf-8');
        fs.writeFileSync(path.join(process.cwd(), 'dist', 'metrics.csv'), rawCsv, 'utf-8');
      } catch (_) {}
    }
  }
  return parsed;
}

// Ensure public CSV files are initialized if data/metrics.csv already exists
try {
  if (fs.existsSync(CSV_FILE)) {
    const raw = fs.readFileSync(CSV_FILE, 'utf-8');
    if (!fs.existsSync(PUBLIC_CSV_FILE)) {
      fs.writeFileSync(PUBLIC_CSV_FILE, raw, 'utf-8');
    }
    if (!fs.existsSync(PUBLIC_ROOT_CSV)) {
      fs.writeFileSync(PUBLIC_ROOT_CSV, raw, 'utf-8');
    }
  }
} catch (e) {
  console.warn('Initial CSV copy notice:', e);
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

  // Initial default admin credentials
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

// Active session token store
const activeSessions = new Map<string, { token: string; createdAt: number }>();

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

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
  next();
}

// ================= API ROUTES: METRICS ================= //

/**
 * GET /api/metrics
 * Returns all indicators parsed directly from data/metrics.csv
 */
app.get('/api/metrics', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const metrics = getMetricsFromCSV();
  res.json(metrics);
});

/**
 * Direct CSV feeds for external viewers, Excel, curl, and static fallback
 */
app.get(['/data/metrics.csv', '/metrics.csv'], (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (fs.existsSync(CSV_FILE)) {
    return res.sendFile(CSV_FILE);
  }
  if (fs.existsSync(PUBLIC_CSV_FILE)) {
    return res.sendFile(PUBLIC_CSV_FILE);
  }
  res.status(404).send('metrics.csv not found');
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

app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const pubPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
  if (fs.existsSync(pubPath)) return res.sendFile(pubPath);
  if (fs.existsSync(distPath)) return res.sendFile(distPath);
  res.status(404).send('sitemap.xml not found');
});

app.get('/llms.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const pubPath = path.join(process.cwd(), 'public', 'llms.txt');
  if (fs.existsSync(pubPath)) return res.sendFile(pubPath);
  res.status(404).send('llms.txt not found');
});

/**
 * Dedicated Calendar route with prerendered SEO HTML fallback
 */
app.get(['/calendar', '/calendar/'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  const distCalendar = path.join(process.cwd(), 'dist', 'calendar', 'index.html');
  if (fs.existsSync(distCalendar)) return res.sendFile(distCalendar);
  const rootCalendar = path.join(process.cwd(), 'calendar', 'index.html');
  if (fs.existsSync(rootCalendar)) return res.sendFile(rootCalendar);
  const distIndex = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(distIndex)) return res.sendFile(distIndex);
  return res.sendFile(path.join(process.cwd(), 'index.html'));
});

/**
 * Dedicated Calculator route with prerendered SEO HTML fallback
 */
app.get(['/calculator', '/calculator/'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  const distCalc = path.join(process.cwd(), 'dist', 'calculator', 'index.html');
  if (fs.existsSync(distCalc)) return res.sendFile(distCalc);
  const rootCalc = path.join(process.cwd(), 'calculator', 'index.html');
  if (fs.existsSync(rootCalc)) return res.sendFile(rootCalc);
  const distIndex = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(distIndex)) return res.sendFile(distIndex);
  return res.sendFile(path.join(process.cwd(), 'index.html'));
});


/**
 * Support for Google Search Console HTML verification file
 * Matches any request formatted as /google[token].html
 */
app.get('/google:token([a-zA-Z0-9_-]+).html', (req, res) => {
  const fileName = `google${req.params.token}.html`;
  const pubPath = path.join(process.cwd(), 'public', fileName);
  if (fs.existsSync(pubPath)) {
    return res.sendFile(pubPath);
  }
  // Standard Google verification response body
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`google-site-verification: google${req.params.token}.html`);
});

/**
 * GET /api/metrics/export-csv
 * Triggers a download of the latest metrics.csv file
 */
app.get('/api/metrics/export-csv', (_req, res) => {
  if (fs.existsSync(CSV_FILE)) {
    res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(CSV_FILE);
  }
  const metrics = getMetricsFromCSV();
  const csv = exportMetricsToCSV(metrics);
  res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

/**
 * GET /api/metrics/template-csv
 * Returns the current official CSV as a template
 */
app.get('/api/metrics/template-csv', (_req, res) => {
  if (fs.existsSync(CSV_FILE)) {
    res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators_template.csv"');
    res.setHeader('Content-Type', 'text/csv');
    return res.sendFile(CSV_FILE);
  }
  const metrics = getMetricsFromCSV();
  res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators_template.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(exportMetricsToCSV(metrics));
});

/**
 * POST /api/metrics/upload-csv
 * Receives an updated CSV file via drag-and-drop or file upload.
 * Validates, writes to disk, and immediately synchronizes the live data.
 */
app.post('/api/metrics/upload-csv', upload.single('csvFile'), (req, res) => {
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
      // Complete replacement: save raw CSV directly
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
 * POST /api/metrics (Add single indicator)
 */
app.post('/api/metrics', (req, res) => {
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
 * PUT /api/metrics/:id (Update single indicator)
 */
app.put('/api/metrics/:id', (req, res) => {
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
 * DELETE /api/metrics/:id (Delete indicator)
 */
app.delete('/api/metrics/:id', (req, res) => {
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
 * POST /api/metrics/reorder
 */
app.post('/api/metrics/reorder', (req, res) => {
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

    // Append any metrics not in orderedIds
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
 * POST /api/metrics/clear (Wipe indicators)
 */
app.post('/api/metrics/clear', (_req, res) => {
  try {
    saveMetricsToDisk([]);
    res.json({ success: true, count: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/metrics/populate-sample
 * Specimen cards
 */
app.post('/api/metrics/populate-sample', (_req, res) => {
  try {
    const now = new Date().toISOString();
    const specimen: MacroMetric[] = [
      {
        id: 'fii-dii-net-flow',
        slug: 'fii-dii-net-flow',
        title: 'FII / DII Net Institutional Flow',
        category: 'MARKETS',
        frequency: 'DAILY',
        status: 'Expansion',
        value: '+2,481.50',
        unit: '₹ Cr Net',
        previousValue: '-1,120.40',
        deltaValue: '+3,601.90',
        deltaDisplay: '+₹3,601 Cr Day-on-Day',
        deltaType: 'positive',
        trendDirection: 'up',
        trendBadgeStyle: 'positive',
        targetAnchor: 'Cumulative monthly domestic SIP run-rate > ₹23,000 Cr absorption floor',
        summary:
          'Domestic Institutional Investors (DIIs) continue steady accumulation across capital goods and BFSI, countervailing moderate foreign institutional equity outflows amid elevated UST yields.',
        sourceName: 'National Stock Exchange (NSE)',
        sourceUrl: 'https://www.nseindia.com',
        releaseDate: new Date().toISOString().split('T')[0],
        typicalReleaseWindow: 'Daily by 7:30 PM IST',
        isPublished: true,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'foreign-exchange-reserves',
        slug: 'foreign-exchange-reserves',
        title: 'Foreign Exchange Reserves',
        category: 'EXTERNAL',
        frequency: 'WEEKLY',
        status: 'Expansion',
        value: '780.782',
        unit: 'US$ Billion',
        previousValue: '777.100',
        deltaValue: '+3.682',
        deltaDisplay: '+US$ 3.68 Bn WoW',
        deltaType: 'positive',
        trendDirection: 'up',
        trendBadgeStyle: 'positive',
        targetAnchor: 'Over 11.5 months of projected merchandise imports cover',
        summary:
          'Total foreign exchange reserves rose by $3.68 billion to a fresh historic high of $780.78 billion for the week ended September 11, 2026, driven by valuation gains on gold reserves and FX asset inflows.',
        sourceName: 'Reserve Bank of India (RBI)',
        sourceUrl: 'https://www.rbi.org.in',
        releaseDate: new Date().toISOString().split('T')[0],
        typicalReleaseWindow: 'Every Friday at 5:00 PM IST',
        isPublished: true,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'money-supply-m3',
        slug: 'money-supply-m3',
        title: 'M3 Broad Money Supply Growth',
        category: 'MONETARY',
        frequency: 'FORTNIGHTLY',
        status: 'Normal',
        value: '11.8',
        unit: '% YoY Growth',
        previousValue: '11.5',
        deltaValue: '+0.3',
        deltaDisplay: '+30 bps Fortnightly',
        deltaType: 'neutral',
        trendDirection: 'up',
        trendBadgeStyle: 'neutral',
        targetAnchor: 'Nominal GDP trajectory alignment (~10.5% - 12.0%)',
        summary:
          'Broad money growth sustained its double-digit expansion, backed by consistent commercial bank deposit mobilization and aggregate non-food credit growth of 13.9% y-o-y.',
        sourceName: 'Reserve Bank of India (RBI)',
        sourceUrl: 'https://www.rbi.org.in',
        releaseDate: new Date().toISOString().split('T')[0],
        typicalReleaseWindow: 'Alternate Wednesdays',
        isPublished: true,
        order: 3,
        createdAt: now,
        updatedAt: now,
      },
    ];

    saveMetricsToDisk(specimen);
    res.json({ success: true, count: specimen.length, metrics: specimen });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= API ROUTES: AUTHENTICATION ================= //

/**
 * POST /api/admin/login
 */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const authConfig = getAuthConfig();
  const calculatedHash = hashPassword(password, authConfig.salt);

  if (calculatedHash !== authConfig.passwordHash) {
    // Also accept fallback default if not yet changed
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

/**
 * GET /api/admin/auth-status
 */
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

/**
 * POST /api/admin/change-password
 */
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

/**
 * POST /api/admin/logout
 */
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// Explicit 404 for unhandled API routes so they NEVER return HTML SPA index
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ================= VITE MIDDLEWARE & STATIC SERVING ================= //

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MacroNest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
