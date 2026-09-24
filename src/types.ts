export type Frequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'FORTNIGHTLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'MPC'
  | 'QUARTERLY'
  | 'HALF-YEARLY'
  | string;

export type Category =
  | 'MARKETS'
  | 'EXTERNAL'
  | 'MONETARY'
  | 'INFLATION'
  | 'REAL ECONOMY'
  | 'FISCAL'
  | 'EMPLOYMENT'
  | 'INDUSTRY'
  | 'COMMODITIES'
  | 'GLOBAL'
  | string;

/**
 * Determines whether an indicator belongs to the Global section or Domestic (India) section.
 * Flags category 'GLOBAL' or known global indicator slugs/prefixes.
 */
export function isGlobalIndicator(metric: Partial<MacroMetric> | undefined | null): boolean {
  if (!metric) return false;
  if ((metric.category || '').toUpperCase() === 'GLOBAL') return true;
  const slug = (metric.slug || metric.id || '').toLowerCase();
  if (
    slug.startsWith('us-') ||
    slug.startsWith('china-') ||
    slug.startsWith('ecb-') ||
    slug.startsWith('fed-') ||
    slug.startsWith('global-') ||
    slug === 'brent-crude' ||
    slug === 'gold-price' ||
    slug === 'us-dollar-index' ||
    slug === 'dollar-index'
  ) {
    return true;
  }
  return false;
}

export type MetricStatus =
  | 'Expansion'
  | 'Normal'
  | 'Contraction'
  | 'Caution'
  | 'Hawkish'
  | 'Dovish'
  | 'Neutral'
  | string;

export type DeltaType = 'positive' | 'negative' | 'neutral' | 'warning';

export type TrendDirection = 'up' | 'down' | 'flat' | 'na' | string;

export type TrendBadgeStyle = 'warning' | 'positive' | 'neutral' | string;

export type DataStatus = 'provisional' | 'final' | 'unknown' | string;

export type VerificationStatus = 'verified_official' | 'cross_checked' | 'needs_review' | string;

export interface MacroMetric {
  id: string; // derived from indicator_slug or id
  slug?: string; // indicator_slug
  title: string; // indicator_title
  frequency: Frequency; // release_frequency
  category: Category; // category
  status: MetricStatus; // stance_state or mapped status
  stanceState?: string; // stance_state (e.g., 'Above target midpoint', 'Strong revenue momentum')
  value: string; // main_metric_value
  unit: string; // unit_suffix
  previousValue?: string; // previous_value
  deltaValue: string; // delta_value
  deltaDisplay?: string; // delta_display (e.g., '+0.37 pp MoM', '+14.8% YoY')
  deltaType: DeltaType; // trend_badge_style or mapped
  trendDirection?: TrendDirection; // trend_direction ('up', 'down', 'flat', 'na')
  trendBadgeStyle?: TrendBadgeStyle; // trend_badge_style ('warning', 'positive', 'neutral')
  targetAnchor: string; // target_anchor
  summary: string; // narrative_commentary
  narrativeCommentary?: string; // narrative_commentary alias
  sourceName: string; // source_label
  sourceUrl: string; // source_url
  observationPeriod?: string; // observation_period (e.g., 'August 2026', 'Week ended 11 Sep 2026')
  releaseDate: string; // release_date (e.g., '2026-09-14')
  releaseWindow?: string; // typical_release_window
  typicalReleaseWindow?: string; // typical_release_window alias
  nextExpectedRelease?: string; // next_expected_release (e.g., '2026-10-12', 'Expected: 2026-10-14')
  dataStatus?: DataStatus; // data_status ('provisional', 'final', 'unknown')
  verificationStatus?: VerificationStatus; // verification_status ('verified_official', 'cross_checked', 'needs_review')
  researchNotes?: string; // research_notes
  isPublished: boolean; // publish (TRUE / FALSE)
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface MacroCalendarTemplate {
  id: string;
  cycle: 'monthly' | 'bimonthly_quarterly' | 'daily_weekly';
  window: string;
  report: string;
  source: string;
  sourceUrl: string;
  grabThisNumber: string;
  frequency: Frequency;
  category: Category;
  defaultUnit: string;
  defaultTargetAnchor: string;
  defaultStatus: MetricStatus;
  note?: string;
}

export interface InsightPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImageUrl?: string;
  authorName: string;
  authorRole?: string;
  readingTimeMinutes: number;
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  viewsCount?: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const INSIGHT_CATEGORIES = [
  'Monetary Policy',
  'Inflation & CPI',
  'Forex & External',
  'Fiscal & GST',
  'Growth & GDP',
  'Banking & Liquidity',
  'Markets & Yields',
  'Global Benchmarks',
  'Macro Explainer',
] as const;

