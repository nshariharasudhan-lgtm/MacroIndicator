import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { parseMetricsCSV, exportMetricsToCSV } from '../../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../../src/data/defaultMetrics.ts';
import type { MacroMetric } from '../../src/types.ts';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
}

export default async function handler(
  req: ExtendedRequest,
  res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; end: () => any }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (!body && typeof req.on === 'function') {
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      body = JSON.parse(Buffer.concat(buffers).toString());
    } catch {
      body = {};
    }
  }

  const orderedIds: string[] = body?.orderedIds || [];
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array required' });
  }

  const candidatePaths = ['/tmp/metrics.csv', path.join(process.cwd(), 'data', 'metrics.csv')];
  let currentMetrics: MacroMetric[] = [];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf-8');
        const parsed = parseMetricsCSV(text);
        if (parsed.metrics && parsed.metrics.length > 0) {
          currentMetrics = parsed.metrics;
          break;
        }
      }
    } catch {}
  }

  if (currentMetrics.length === 0) {
    currentMetrics = [...DEFAULT_MACRO_METRICS];
  }

  const metricMap = new Map(currentMetrics.map((m) => [m.id, m]));
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

  try {
    const csvStr = exportMetricsToCSV(reordered);
    fs.writeFileSync('/tmp/metrics.csv', csvStr, 'utf-8');
    fs.writeFileSync(path.join(process.cwd(), 'data', 'metrics.csv'), csvStr, 'utf-8');
  } catch {}

  return res.status(200).json({ success: true, metrics: reordered });
}
