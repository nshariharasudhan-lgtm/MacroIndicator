import fs from 'fs';
import path from 'path';
import { parseMetricsCSV, exportMetricsToCSV } from '../../src/utils/csvParser.ts';
import { DEFAULT_MACRO_METRICS } from '../../src/data/defaultMetrics.ts';
import type { MacroMetric } from '../../src/types.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const candidateJsonPaths = [
    '/tmp/metrics.json',
    path.join(process.cwd(), 'data', 'metrics.json'),
    path.join(process.cwd(), 'dist', 'data', 'metrics.json'),
  ];

  const candidateCsvPaths = [
    '/tmp/metrics.csv',
    path.join(process.cwd(), 'data', 'metrics.csv'),
    path.join(process.cwd(), 'dist', 'data', 'metrics.csv'),
  ];

  const getLatestMetrics = (): MacroMetric[] => {
    // 1. Try JSON files first (faster & retains full types)
    for (const p of candidateJsonPaths) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    // 2. Try CSV files
    for (const p of candidateCsvPaths) {
      try {
        if (fs.existsSync(p)) {
          const csvText = fs.readFileSync(p, 'utf-8');
          const result = parseMetricsCSV(csvText);
          if (result.metrics && result.metrics.length > 0) {
            return result.metrics;
          }
        }
      } catch {}
    }

    // 3. Fallback to default verified metrics
    return DEFAULT_MACRO_METRICS;
  };

  if (req.method === 'GET') {
    const rawMetrics = getLatestMetrics();

    // Check if requester has admin authorization
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const adminKey = req.headers?.['x-admin-key'] || '';
    const hasAdminToken =
      (authHeader && authHeader.replace(/^Bearer\s+/i, '').trim().length > 5) ||
      adminKey === (process.env.ADMIN_KEY || 'macronest-admin-2026');

    if (hasAdminToken) {
      // Admin gets full metrics with internal research notes and draft status intact
      return res.status(200).json(rawMetrics);
    }

    // Public visitors get only published indicators with internal research notes stripped
    const publicMetrics = rawMetrics
      .filter((m) => m.isPublished !== false)
      .map((m) => {
        const { researchNotes, verificationStatus, dataStatus, ...publicData } = m;
        return {
          ...publicData,
          isPublished: true,
        };
      });

    return res.status(200).json(publicMetrics);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (!body && typeof req.on === 'function') {
      try {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        body = JSON.parse(Buffer.concat(buffers).toString());
      } catch {
        body = {};
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const current = getLatestMetrics();
    const newMetric: MacroMetric = {
      ...body,
      id: body.id || body.slug || `metric-${Date.now()}`,
      order: current.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublished: body.isPublished !== false,
    };

    current.push(newMetric);

    // Save to /tmp and disk
    try {
      const csvStr = exportMetricsToCSV(current);
      const jsonStr = JSON.stringify(current, null, 2);
      fs.writeFileSync('/tmp/metrics.csv', csvStr, 'utf-8');
      fs.writeFileSync('/tmp/metrics.json', jsonStr, 'utf-8');

      const localCsv = path.join(process.cwd(), 'data', 'metrics.csv');
      const localJson = path.join(process.cwd(), 'data', 'metrics.json');
      if (fs.existsSync(path.dirname(localCsv))) {
        fs.writeFileSync(localCsv, csvStr, 'utf-8');
        fs.writeFileSync(localJson, jsonStr, 'utf-8');
      }
    } catch {}

    return res.status(201).json(newMetric);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
