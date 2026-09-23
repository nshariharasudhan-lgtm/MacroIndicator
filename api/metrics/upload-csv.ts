import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { parseMetricsCSV } from '../../src/utils/csvParser.ts';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  // Try writing to available destinations (e.g. /tmp for serverless, and local disk if writable)
  const writeTargets = [
    '/tmp/metrics.csv',
    path.join(process.cwd(), 'data', 'metrics.csv'),
    path.join(process.cwd(), 'public', 'data', 'metrics.csv'),
    path.join(process.cwd(), 'public', 'metrics.csv'),
  ];

  for (const target of writeTargets) {
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(target, csvContent, 'utf-8');
    } catch {
      // Ignored if read-only filesystem
    }
  }

  const publishedCount = parsed.metrics.filter((m) => m.isPublished).length;
  const draftCount = parsed.metrics.length - publishedCount;

  return res.status(200).json({
    success: true,
    message: `Successfully synchronized ${parsed.metrics.length} indicators from CSV.`,
    totalUploaded: parsed.metrics.length,
    publishedCount,
    draftCount,
    metrics: parsed.metrics,
    errors: parsed.errors,
  });
}
