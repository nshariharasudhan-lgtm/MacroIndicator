import fs from 'fs';
import path from 'path';
import { parseMetricsCSV } from '../src/utils/csvParser.ts';

const CSV_FILE = path.join(process.cwd(), 'data', 'metrics.csv');
const JSON_FILE = path.join(process.cwd(), 'data', 'metrics.json');
const DEFAULT_METRICS_TS = path.join(process.cwd(), 'src', 'data', 'defaultMetrics.ts');

if (!fs.existsSync(CSV_FILE)) {
  console.error(`Error: ${CSV_FILE} does not exist.`);
  process.exit(1);
}

const csvText = fs.readFileSync(CSV_FILE, 'utf-8');
const parsed = parseMetricsCSV(csvText);

// Filter published rows (or those where isPublished is not explicitly false)
const published = parsed.metrics.filter((m) => m.isPublished !== false);

// Sanitize: exclude internal notes for client default metrics
const sanitizedMetrics = published.map((m) => {
  const {
    researchNotes,
    verificationStatus,
    dataStatus,
    ...publicFields
  } = m;
  return {
    ...publicFields,
    isPublished: true,
  };
});

// Update src/data/defaultMetrics.ts
const tsContent = `// Auto-synchronized from data/metrics.csv at build time.
// Contains only publish=TRUE indicators with internal columns excluded.
import type { MacroMetric } from '../types.ts';

export const DEFAULT_MACRO_METRICS: MacroMetric[] = ${JSON.stringify(sanitizedMetrics, null, 2)} as MacroMetric[];
`;

fs.writeFileSync(DEFAULT_METRICS_TS, tsContent, 'utf-8');
fs.writeFileSync(JSON_FILE, JSON.stringify(parsed.metrics, null, 2), 'utf-8');

console.log(`Synchronized ${sanitizedMetrics.length} published metrics to ${DEFAULT_METRICS_TS} and ${JSON_FILE}`);
