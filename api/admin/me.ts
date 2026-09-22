import type { IncomingMessage, ServerResponse } from 'http';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
}

export default async function handler(req: ExtendedRequest, res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; end: () => any }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && authHeader.length > 10) {
    return res.status(200).json({
      authenticated: true,
      user: { role: 'admin' },
      mustChangePassword: false,
    });
  }

  return res.status(401).json({
    authenticated: false,
    error: 'Unauthorized administrator session',
  });
}
