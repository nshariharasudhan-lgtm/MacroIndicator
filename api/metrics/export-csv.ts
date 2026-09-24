import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { exportMetricsToCSV } from '../../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../../src/data/defaultMetrics.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse & { status: (c: number) => any; send: (d: any) => any }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators_export.csv"');

  const candidatePaths = [
    '/tmp/metrics.csv',
    path.join(process.cwd(), 'data', 'metrics.csv'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf-8');
        if (text.length > 50) {
          return res.end(text);
        }
      }
    } catch {}
  }

  const csv = exportMetricsToCSV(DEFAULT_MACRO_METRICS);
  return res.end(csv);
}
