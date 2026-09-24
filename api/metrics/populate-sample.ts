import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { exportMetricsToCSV } from '../../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../../src/data/defaultMetrics.ts';

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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sampleCsv = exportMetricsToCSV(DEFAULT_MACRO_METRICS);

  try {
    fs.writeFileSync('/tmp/metrics.csv', sampleCsv, 'utf-8');
    fs.writeFileSync('/tmp/metrics.json', JSON.stringify(DEFAULT_MACRO_METRICS, null, 2), 'utf-8');
  } catch {}

  const localCsv = path.join(process.cwd(), 'data', 'metrics.csv');
  try {
    if (fs.existsSync(localCsv)) {
      fs.writeFileSync(localCsv, sampleCsv, 'utf-8');
    }
  } catch {}

  return res.status(200).json({ success: true, metrics: DEFAULT_MACRO_METRICS });
}
