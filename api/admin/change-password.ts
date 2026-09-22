import type { IncomingMessage, ServerResponse } from 'http';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
}

export default async function handler(req: ExtendedRequest, res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; end: () => any }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
  });
}
