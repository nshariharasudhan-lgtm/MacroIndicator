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
  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').trim()
  );
  const headerMap = new Map<string, number>();
  headers.forEach((h, index) => {
    headerMap.set(h, index);
  });

  // Helper to match column by multiple alias names
  const findColIdx = (...aliases: string[]): number | undefined => {
    for (const alias of aliases) {
      const normalized = alias.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').trim();
      const idx = headerMap.get(normalized);
      if (idx !== undefined) return idx;
    }
    // Also try fuzzy substring matching if exact match not found
    for (const alias of aliases) {
      const normalized = alias.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').trim();
      for (const [key, idx] of headerMap.entries()) {
        if (key === normalized || key.includes(normalized) || normalized.includes(key)) {
          return idx;
        }
      }
    }
    return undefined;
  };

  const slugColIdx = findColIdx('indicator_slug', 'slug', 'id', 'indicator_id', 'code', 'key', 'identifier', 'symbol');
  const titleColIdx = findColIdx('indicator_title', 'title', 'indicator', 'indicator_name', 'name', 'metric', 'metric_name', 'macro_indicator', 'series', 'item', 'heading');

  // If neither slug nor title column was explicitly found, fallback to column 0 or 1 if rows exist
  let finalSlugIdx = slugColIdx;
  let finalTitleIdx = titleColIdx;
  if (finalSlugIdx === undefined && finalTitleIdx === undefined) {
    if (headers.length >= 2) {
      finalTitleIdx = 0;
      finalSlugIdx = 0;
    } else {
      errors.push('Could not find indicator or title column in CSV headers.');
      return { metrics: [], errors, totalRows: rows.length - 1 };
    }
  }

  const categoryColIdx = findColIdx('category', 'sector', 'domain', 'classification', 'segment', 'type', 'group');
  const frequencyColIdx = findColIdx('release_frequency', 'frequency', 'cadence', 'periodicity', 'interval');
  const stanceColIdx = findColIdx('stance_state', 'stance', 'state', 'status', 'market_stance', 'policy_stance');
  const releaseWindowColIdx = findColIdx('typical_release_window', 'release_window', 'typical_window', 'window', 'schedule', 'timing');
  const valueColIdx = findColIdx('main_metric_value', 'value', 'latest_value', 'current_value', 'latest', 'metric_value', 'level', 'reading', 'figure', 'val');
  const unitColIdx = findColIdx('unit_suffix', 'unit', 'units', 'denomination', 'measure', 'currency', 'scale');
  const prevValColIdx = findColIdx('previous_value', 'previous', 'prev_value', 'prev', 'prior_value', 'prior', 'last_value', 'last');
  const deltaValColIdx = findColIdx('delta_value', 'delta', 'change', 'change_value', 'variation', 'diff', 'net_change');
  const deltaDispColIdx = findColIdx('delta_display', 'change_display', 'delta_formatted', 'display_change', 'change_text');
  const trendDirColIdx = findColIdx('trend_direction', 'trend', 'direction', 'movement');
  const trendBadgeColIdx = findColIdx('trend_badge_style', 'badge_style', 'badge', 'style', 'color');
  const targetColIdx = findColIdx('target_anchor', 'target', 'anchor', 'benchmark', 'reference_anchor', 'policy_target');
  const narrativeColIdx = findColIdx('narrative_commentary', 'commentary', 'narrative', 'summary', 'description', 'notes', 'details', 'explanation');
  const sourceLabelColIdx = findColIdx('source_label', 'source_name', 'source', 'agency', 'publisher', 'institution', 'organization');
  const sourceUrlColIdx = findColIdx('source_url', 'url', 'link', 'source_link', 'web_link');
  const obsPeriodColIdx = findColIdx('observation_period', 'period', 'reference_period', 'period_observed', 'month_quarter', 'as_of', 'time_period');
  const releaseDateColIdx = findColIdx('release_date', 'released_on', 'published_date', 'publication_date', 'date', 'as_of_date');
  const nextReleaseColIdx = findColIdx('next_expected_release', 'next_release', 'next_release_date', 'expected_release', 'next_date', 'next_schedule');
  const dataStatusColIdx = findColIdx('data_status', 'data_quality', 'status_data', 'provisional_status');
  const verificationColIdx = findColIdx('verification_status', 'verification', 'verified');
  const researchNotesColIdx = findColIdx('research_notes', 'notes_internal', 'internal_notes');
  const publishColIdx = findColIdx('publish', 'is_published', 'published', 'live', 'active', 'visibility', 'status_publish');

  const getColByComputedIdx = (row: string[], idx: number | undefined): string => {
    if (idx !== undefined && idx < row.length) {
      return (row[idx] || '').trim();
    }
    return '';
  };

  const parsedMetrics: MacroMetric[] = [];
  const now = new Date().toISOString();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every((c) => c === '')) continue;

    const slugRaw = getColByComputedIdx(row, finalSlugIdx);
    const titleRaw = getColByComputedIdx(row, finalTitleIdx);

    if (!slugRaw && !titleRaw) {
      continue;
    }

    const title = titleRaw || slugRaw;
    const slug = slugRaw || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = slug || `metric-${r}`;

    const categoryRaw = getColByComputedIdx(row, categoryColIdx);
    const category = (categoryRaw || 'REAL ECONOMY').toUpperCase() as Category;

    const frequencyRaw = getColByComputedIdx(row, frequencyColIdx);
    const frequency = (frequencyRaw || 'MONTHLY').toUpperCase() as Frequency;

    const stanceState = getColByComputedIdx(row, stanceColIdx) || 'Normal';
    const status = deriveMetricStatus(stanceState);
    const releaseWindow = getColByComputedIdx(row, releaseWindowColIdx);
    const mainMetricValue = getColByComputedIdx(row, valueColIdx) || '—';
    const unitSuffix = getColByComputedIdx(row, unitColIdx);
    const previousValue = getColByComputedIdx(row, prevValColIdx);
    const deltaValue = getColByComputedIdx(row, deltaValColIdx);
    const deltaDisplay = getColByComputedIdx(row, deltaDispColIdx);
    const trendDirection = getColByComputedIdx(row, trendDirColIdx) || 'na';
    const trendBadgeStyle = getColByComputedIdx(row, trendBadgeColIdx) || 'neutral';
    const targetAnchor = getColByComputedIdx(row, targetColIdx);
    const narrativeCommentary = getColByComputedIdx(row, narrativeColIdx);
    const sourceLabel = getColByComputedIdx(row, sourceLabelColIdx) || 'Official Release';
    const sourceUrl = getColByComputedIdx(row, sourceUrlColIdx);
    const observationPeriod = getColByComputedIdx(row, obsPeriodColIdx);
    const releaseDate = getColByComputedIdx(row, releaseDateColIdx) || new Date().toISOString().split('T')[0];
    const nextExpectedRelease = getColByComputedIdx(row, nextReleaseColIdx);
    const dataStatus = getColByComputedIdx(row, dataStatusColIdx) || 'provisional';
    const verificationStatus = getColByComputedIdx(row, verificationColIdx) || 'verified_official';
    const researchNotes = getColByComputedIdx(row, researchNotesColIdx);

    // Published status: if explicitly FALSE / 0 / NO / DRAFT, then false. Otherwise TRUE.
    const publishVal = getColByComputedIdx(row, publishColIdx).toUpperCase();
    const isExplicitlyDraft =
      publishVal === 'FALSE' ||
      publishVal === '0' ||
      publishVal === 'NO' ||
      publishVal === 'DRAFT' ||
      publishVal === 'OFF';
    const isPublished = !isExplicitlyDraft;

    const deltaType = deriveDeltaType(trendBadgeStyle, trendDirection, deltaValue);

    const metric: MacroMetric = {
      id,
      slug,
      title,
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
