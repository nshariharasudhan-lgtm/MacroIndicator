import type { MacroMetric, DeltaType, Frequency, Category, MetricStatus } from '../types.ts';

/**
 * Robust RFC 4180 compliant CSV parser that handles commas, quotes,
 * and newlines inside quoted fields.
 */
export function parseCSVToRows(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
  if (!cleanText) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else {
        currentCell += char;
        i++;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

/**
 * Maps trend badge style & direction to system DeltaType
 */
function deriveDeltaType(badgeStyle?: string, direction?: string, deltaVal?: string): DeltaType {
  const b = (badgeStyle || '').toLowerCase().trim();
  const d = (direction || '').toLowerCase().trim();
  const val = (deltaVal || '').trim();

  if (b === 'warning') return 'warning';
  if (b === 'positive') return 'positive';
  if (b === 'negative') return 'negative';
  if (b === 'neutral') return 'neutral';

  if (d === 'up') return val.startsWith('-') ? 'negative' : 'positive';
  if (d === 'down') return val.startsWith('+') ? 'positive' : 'negative';
  if (d === 'flat' || d === 'na') return 'neutral';

  if (val.startsWith('+')) return 'positive';
  if (val.startsWith('-')) return 'negative';
  return 'neutral';
}

/**
 * Maps stance state to default MetricStatus if not directly matching standard
 */
function deriveMetricStatus(stance?: string): MetricStatus {
  if (!stance) return 'Normal';
  const s = stance.toLowerCase();
  if (s.includes('expansion') || s.includes('momentum') || s.includes('strong')) return 'Expansion';
  if (s.includes('slowest') || s.includes('contraction') || s.includes('fall')) return 'Contraction';
  if (s.includes('caution') || s.includes('elevated') || s.includes('warning') || s.includes('pressure')) return 'Caution';
  if (s.includes('pause') || s.includes('neutral') || s.includes('hold')) return 'Neutral';
  if (s.includes('hawkish') || s.includes('hike')) return 'Hawkish';
  if (s.includes('dovish') || s.includes('cut')) return 'Dovish';
  return stance;
}

/**
 * Parses CSV text into an array of MacroMetric objects matching the user's specific schema:
 * indicator_slug,indicator_title,category,release_frequency,stance_state,
 * typical_release_window,main_metric_value,unit_suffix,previous_value,
 * delta_value,delta_display,trend_direction,trend_badge_style,target_anchor,
 * narrative_commentary,source_label,source_url,observation_period,release_date,
 * next_expected_release,data_status,verification_status,research_notes,publish
 */
export function parseMetricsCSV(csvText: string): {
  metrics: MacroMetric[];
  errors: string[];
  totalRows: number;
} {
  const errors: string[] = [];
  const rows = parseCSVToRows(csvText);

  if (rows.length < 2) {
    return {
      metrics: [],
      errors: ['CSV file is empty or missing data rows.'],
      totalRows: 0,
    };
  }

  // Header row normalization (lowercase + underscores)
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').trim());
  const headerMap = new Map<string, number>();
  headers.forEach((h, index) => {
    headerMap.set(h, index);
  });

  // Verify critical columns
  const slugIdx = headerMap.get('indicator_slug') ?? headerMap.get('slug') ?? headerMap.get('id');
  const titleIdx = headerMap.get('indicator_title') ?? headerMap.get('title');

  if (slugIdx === undefined && titleIdx === undefined) {
    errors.push('Could not find indicator_slug or indicator_title column in CSV headers.');
    return { metrics: [], errors, totalRows: rows.length - 1 };
  }

  const getCol = (row: string[], colName: string, fallbackIdx?: number): string => {
    const idx = headerMap.get(colName) ?? fallbackIdx;
    if (idx !== undefined && idx < row.length) {
      return row[idx].trim();
    }
    return '';
  };

  const parsedMetrics: MacroMetric[] = [];
  const now = new Date().toISOString();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every((c) => c === '')) continue;

    const slug = getCol(row, 'indicator_slug') || getCol(row, 'slug') || getCol(row, 'id');
    const title = getCol(row, 'indicator_title') || getCol(row, 'title');

    if (!slug && !title) {
      errors.push(`Row ${r + 1}: Skipped row because both indicator_slug and indicator_title are missing.`);
      continue;
    }

    const id = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = (getCol(row, 'category') || 'REAL ECONOMY').toUpperCase() as Category;
    const frequency = (getCol(row, 'release_frequency') || getCol(row, 'frequency') || 'MONTHLY').toUpperCase() as Frequency;
    const stanceState = getCol(row, 'stance_state') || getCol(row, 'status') || 'Normal';
    const status = deriveMetricStatus(stanceState);
    const releaseWindow = getCol(row, 'typical_release_window') || getCol(row, 'release_window');
    const mainMetricValue = getCol(row, 'main_metric_value') || getCol(row, 'value') || '—';
    const unitSuffix = getCol(row, 'unit_suffix') || getCol(row, 'unit');
    const previousValue = getCol(row, 'previous_value');
    const deltaValue = getCol(row, 'delta_value');
    const deltaDisplay = getCol(row, 'delta_display');
    const trendDirection = getCol(row, 'trend_direction') || 'na';
    const trendBadgeStyle = getCol(row, 'trend_badge_style') || 'neutral';
    const targetAnchor = getCol(row, 'target_anchor');
    const narrativeCommentary = getCol(row, 'narrative_commentary') || getCol(row, 'summary');
    const sourceLabel = getCol(row, 'source_label') || getCol(row, 'source_name') || 'Official Release';
    const sourceUrl = getCol(row, 'source_url');
    const observationPeriod = getCol(row, 'observation_period');
    const releaseDate = getCol(row, 'release_date') || new Date().toISOString().split('T')[0];
    const nextExpectedRelease = getCol(row, 'next_expected_release');
    const dataStatus = getCol(row, 'data_status') || 'provisional';
    const verificationStatus = getCol(row, 'verification_status') || 'verified_official';
    const researchNotes = getCol(row, 'research_notes');
    const publishRaw = (getCol(row, 'publish') || 'TRUE').toUpperCase();
    const isPublished = publishRaw === 'TRUE' || publishRaw === '1' || publishRaw === 'YES' || publishRaw === 'T';

    const deltaType = deriveDeltaType(trendBadgeStyle, trendDirection, deltaValue);

    const metric: MacroMetric = {
      id,
      slug: slug || id,
      title: title || slug,
      category,
      frequency,
      status,
      stanceState,
      value: mainMetricValue,
      unit: unitSuffix,
      previousValue,
      deltaValue,
      deltaDisplay: deltaDisplay || (deltaValue ? `${deltaValue} ${unitSuffix}` : ''),
      deltaType,
      trendDirection,
      trendBadgeStyle,
      targetAnchor,
      summary: narrativeCommentary,
      narrativeCommentary,
      sourceName: sourceLabel,
      sourceUrl,
      observationPeriod,
      releaseDate,
      releaseWindow,
      typicalReleaseWindow: releaseWindow,
      nextExpectedRelease,
      dataStatus,
      verificationStatus,
      researchNotes,
      isPublished,
      order: parsedMetrics.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    parsedMetrics.push(metric);
  }

  return {
    metrics: parsedMetrics,
    errors,
    totalRows: rows.length - 1,
  };
}

/**
 * Converts MacroMetric[] to the exact CSV format matching the specification
 */
export function exportMetricsToCSV(metrics: MacroMetric[]): string {
  const headers = [
    'indicator_slug',
    'indicator_title',
    'category',
    'release_frequency',
    'stance_state',
    'typical_release_window',
    'main_metric_value',
    'unit_suffix',
    'previous_value',
    'delta_value',
    'delta_display',
    'trend_direction',
    'trend_badge_style',
    'target_anchor',
    'narrative_commentary',
    'source_label',
    'source_url',
    'observation_period',
    'release_date',
    'next_expected_release',
    'data_status',
    'verification_status',
    'research_notes',
    'publish',
  ];

  const escapeCell = (val: string | number | boolean | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = metrics.map((m) => [
    escapeCell(m.slug || m.id),
    escapeCell(m.title),
    escapeCell(m.category),
    escapeCell(m.frequency),
    escapeCell(m.stanceState || m.status),
    escapeCell(m.releaseWindow || m.typicalReleaseWindow || ''),
    escapeCell(m.value === '—' ? '' : m.value),
    escapeCell(m.unit),
    escapeCell(m.previousValue || ''),
    escapeCell(m.deltaValue || ''),
    escapeCell(m.deltaDisplay || ''),
    escapeCell(m.trendDirection || 'na'),
    escapeCell(m.trendBadgeStyle || (m.deltaType === 'warning' ? 'warning' : m.deltaType === 'positive' ? 'positive' : 'neutral')),
    escapeCell(m.targetAnchor || ''),
    escapeCell(m.summary || m.narrativeCommentary || ''),
    escapeCell(m.sourceName || ''),
    escapeCell(m.sourceUrl || ''),
    escapeCell(m.observationPeriod || ''),
    escapeCell(m.releaseDate || ''),
    escapeCell(m.nextExpectedRelease || ''),
    escapeCell(m.dataStatus || 'provisional'),
    escapeCell(m.verificationStatus || 'verified_official'),
    escapeCell(m.researchNotes || ''),
    escapeCell(m.isPublished ? 'TRUE' : 'FALSE'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
