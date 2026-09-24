import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

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

  try {
    fs.writeFileSync('/tmp/metrics.csv', '', 'utf-8');
    fs.writeFileSync('/tmp/metrics.json', '[]', 'utf-8');
  } catch {}

  const localCsv = path.join(process.cwd(), 'data', 'metrics.csv');
  try {
    if (fs.existsSync(localCsv)) {
      fs.writeFileSync(localCsv, '', 'utf-8');
    }
  } catch {}

  return res.status(200).json({ success: true, count: 0 });
}
