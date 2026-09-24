import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { parseMetricsCSV, exportMetricsToCSV } from '../../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../../src/data/defaultMetrics.ts';
import type { MacroMetric } from '../../src/types.ts';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
}

export default async function handler(
  req: ExtendedRequest,
  res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; end: () => any }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body if stream
  let bodyData = req.body;
  if (!bodyData && typeof req.on === 'function') {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString();
      bodyData = JSON.parse(raw);
    } catch {
      bodyData = {};
    }
  }

  const csvContent = bodyData?.csvContent;
  const mode = req.query?.mode || bodyData?.mode || 'replace';

  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({ error: 'No CSV content provided.' });
  }

  const parsed = parseMetricsCSV(csvContent);
  if (!parsed.metrics || parsed.metrics.length === 0) {
    return res.status(400).json({
      error: parsed.errors[0] || 'Could not parse indicators from the CSV content.',
      errors: parsed.errors,
    });
  }

  let finalMetrics: MacroMetric[] = parsed.metrics;

  if (mode === 'upsert') {
    // Read existing
    let existing: MacroMetric[] = [];
    const candidatePaths = [
      '/tmp/metrics.json',
      '/tmp/metrics.csv',
      path.join(process.cwd(), 'data', 'metrics.csv'),
    ];
    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          if (p.endsWith('.json')) {
            existing = JSON.parse(fs.readFileSync(p, 'utf-8'));
          } else {
            existing = parseMetricsCSV(fs.readFileSync(p, 'utf-8')).metrics;
          }
          if (existing.length > 0) break;
        }
      } catch {}
    }
    if (existing.length === 0) {
      existing = [...DEFAULT_MACRO_METRICS];
    }

    const existingMap = new Map<string, MacroMetric>();
    existing.forEach((m) => existingMap.set(m.slug || m.id, m));

    parsed.metrics.forEach((newM) => {
      const key = newM.slug || newM.id;
      if (existingMap.has(key)) {
        const old = existingMap.get(key)!;
        existingMap.set(key, { ...old, ...newM, updatedAt: new Date().toISOString() });
      } else {
        existingMap.set(key, newM);
      }
    });

    finalMetrics = Array.from(existingMap.values());
  }

  const finalCsv = exportMetricsToCSV(finalMetrics);
  const finalJson = JSON.stringify(finalMetrics, null, 2);

  // Write to /tmp (serverless lambda storage)
  try {
    fs.writeFileSync('/tmp/metrics.csv', finalCsv, 'utf-8');
    fs.writeFileSync('/tmp/metrics.json', finalJson, 'utf-8');
  } catch {}

  // Write to local disk if writable
  const diskTargets = [
    path.join(process.cwd(), 'data', 'metrics.csv'),
    path.join(process.cwd(), 'data', 'metrics.json'),
    path.join(process.cwd(), 'dist', 'data', 'metrics.csv'),
    path.join(process.cwd(), 'dist', 'data', 'metrics.json'),
  ];

  for (const target of diskTargets) {
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (target.endsWith('.json')) {
        fs.writeFileSync(target, finalJson, 'utf-8');
      } else {
        fs.writeFileSync(target, finalCsv, 'utf-8');
      }
    } catch {}
  }

  const publishedCount = finalMetrics.filter((m) => m.isPublished !== false).length;
  const draftCount = finalMetrics.length - publishedCount;

  return res.status(200).json({
    success: true,
    message: `Successfully synchronized ${finalMetrics.length} indicators from CSV.`,
    totalUploaded: finalMetrics.length,
    publishedCount,
    draftCount,
    metrics: finalMetrics,
    errors: parsed.errors,
  });
}
