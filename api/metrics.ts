import fs from 'fs';
import path from 'path';
import { parseMetricsCSV } from '../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../src/data/defaultMetrics.ts';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check possible paths for updated metrics CSV (including /tmp for serverless uploads)
  const candidatePaths = [
    '/tmp/metrics.csv',
    path.join(process.cwd(), 'data', 'metrics.csv'),
    path.join(process.cwd(), 'public', 'data', 'metrics.csv'),
    path.join(process.cwd(), 'public', 'metrics.csv'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const csvText = fs.readFileSync(p, 'utf-8');
        const result = parseMetricsCSV(csvText);
        if (result.metrics && result.metrics.length > 0) {
          return res.status(200).json(result.metrics);
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return res.status(200).json(DEFAULT_MACRO_METRICS);
}
