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

  try {
    const csvPath = path.join(process.cwd(), 'data', 'metrics.csv');
    if (fs.existsSync(csvPath)) {
      const csvText = fs.readFileSync(csvPath, 'utf-8');
      const result = parseMetricsCSV(csvText);
      if (result.metrics && result.metrics.length > 0) {
        return res.status(200).json(result.metrics);
      }
    }
  } catch (err) {
    console.warn('Could not read from data/metrics.csv on serverless host, using default metrics');
  }

  return res.status(200).json(DEFAULT_MACRO_METRICS);
}
