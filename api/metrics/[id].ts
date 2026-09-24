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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract id from query (Vercel routes [id].ts pass query.id) or url
  const id =
    req.query?.id ||
    req.url?.split('?')[0].split('/').filter(Boolean).pop() ||
    '';

  const candidatePaths = [
    '/tmp/metrics.csv',
    path.join(process.cwd(), 'data', 'metrics.csv'),
  ];

  let currentMetrics: MacroMetric[] = [];
  let found = false;

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf-8');
        const parsed = parseMetricsCSV(text);
        if (parsed.metrics && parsed.metrics.length > 0) {
          currentMetrics = parsed.metrics;
          found = true;
          break;
        }
      }
    } catch {}
  }

  if (!found) {
    currentMetrics = [...DEFAULT_MACRO_METRICS];
  }

  const index = currentMetrics.findIndex((m) => m.id === id || m.slug === id);

  if (req.method === 'PUT') {
    let body = req.body;
    if (!body && typeof req.on === 'function') {
      try {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        body = JSON.parse(Buffer.concat(buffers).toString());
      } catch {
        body = {};
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    if (index === -1) {
      return res.status(404).json({ error: 'Indicator not found' });
    }

    currentMetrics[index] = {
      ...currentMetrics[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Save to /tmp and data/metrics.csv if writable
    try {
      const csvStr = exportMetricsToCSV(currentMetrics);
      const jsonStr = JSON.stringify(currentMetrics, null, 2);
      fs.writeFileSync('/tmp/metrics.csv', csvStr, 'utf-8');
      fs.writeFileSync('/tmp/metrics.json', jsonStr, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), 'data', 'metrics.csv'), csvStr, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), 'data', 'metrics.json'), jsonStr, 'utf-8');
    } catch {}

    return res.status(200).json(currentMetrics[index]);
  }

  if (req.method === 'DELETE') {
    if (index === -1) {
      return res.status(404).json({ error: 'Indicator not found' });
    }

    const filtered = currentMetrics.filter((m) => m.id !== id && m.slug !== id);
    try {
      const csvStr = exportMetricsToCSV(filtered);
      const jsonStr = JSON.stringify(filtered, null, 2);
      fs.writeFileSync('/tmp/metrics.csv', csvStr, 'utf-8');
      fs.writeFileSync('/tmp/metrics.json', jsonStr, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), 'data', 'metrics.csv'), csvStr, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), 'data', 'metrics.json'), jsonStr, 'utf-8');
    } catch {}

    return res.status(200).json({ success: true, remaining: filtered.length });
  }

  if (req.method === 'GET') {
    if (index === -1) {
      return res.status(404).json({ error: 'Indicator not found' });
    }
    return res.status(200).json(currentMetrics[index]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
