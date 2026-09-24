import type { IncomingMessage, ServerResponse } from 'http';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
}

export default async function handler(
  req: ExtendedRequest,
  res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; end: () => any }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token && token.length > 5) {
    return res.status(200).json({
      authenticated: true,
      mustChangePassword: false,
    });
  }

  return res.status(401).json({
    authenticated: false,
    error: 'Unauthorized: Invalid or expired session',
  });
}
