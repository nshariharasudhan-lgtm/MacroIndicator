import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { exportMetricsToCSV } from '../../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../../src/data/defaultMetrics.ts';

interface ExtendedRequest extends IncomingMessage {
  query?: Record<string, string>;
}

export default function handler(
  req: ExtendedRequest,
  res: ServerResponse & { status: (code: number) => any; send: (data: any) => any; end: () => any }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="macro_indicators_template.csv"');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const candidatePaths = [
    '/tmp/metrics.csv',
    path.join(process.cwd(), 'data', 'metrics.csv'),
    path.join(process.cwd(), 'public', 'data', 'metrics.csv'),
    path.join(process.cwd(), 'public', 'metrics.csv'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (content.trim().length > 0) {
          return res.status(200).send(content);
        }
      }
    } catch {}
  }

  const fallbackCsv = exportMetricsToCSV(DEFAULT_MACRO_METRICS);
  return res.status(200).send(fallbackCsv);
}
