import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; end: () => any }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return res.status(200).json({ success: true });
}
