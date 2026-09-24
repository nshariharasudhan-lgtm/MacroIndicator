import { FC } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Feather,
  Minus,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react';
import { MacroMetric, Frequency, MetricStatus, DeltaType } from '../types.ts';

interface MetricCardProps {
  metric: MacroMetric;
  isAdmin?: boolean;
  onEdit?: (metric: MacroMetric) => void;
  onDelete?: (id: string) => void;
}

export const MetricCard: FC<MetricCardProps> = ({
  metric,
  isAdmin = false,
  onEdit,
  onDelete,
}) => {
  // Frequency badge styling
  const renderFrequencyBadge = (freq: Frequency) => {
    const f = (freq || '').toUpperCase();
    switch (f) {
      case 'DAILY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            DAILY
          </span>
        );
      case 'WEEKLY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            WEEKLY
          </span>
        );
      case 'FORTNIGHTLY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300">
            FORTNIGHTLY
          </span>
        );
      case 'MONTHLY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            MONTHLY
          </span>
        );
      case 'MPC':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
            MPC
          </span>
        );
      case 'FOMC':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            FOMC
          </span>
        );
      case 'ECB MEETING':
      case 'ECB':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
            ECB MEETING
          </span>
        );
      case 'BIMONTHLY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200">
            BIMONTHLY
          </span>
        );
      case 'QUARTERLY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
            QUARTERLY
          </span>
        );
      case 'HALF-YEARLY':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            HALF-YEARLY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md tracking-wider border border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {freq}
          </span>
        );
    }
  };

  // Status or Stance badge styling
  const renderStatusBadge = (status: MetricStatus, stance?: string) => {
    const displayText = stance || status;
    const badgeStyle = metric.trendBadgeStyle || '';

    if (badgeStyle === 'warning' || status === 'Caution' || status === 'Hawkish') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200 flex items-center gap-1 shrink-0 max-w-[200px] truncate" title={displayText}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="truncate">{displayText}</span>
        </span>
      );
    }

    if (badgeStyle === 'positive' || status === 'Expansion') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-200 flex items-center gap-1 shrink-0 max-w-[200px] truncate" title={displayText}>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{displayText}</span>
        </span>
      );
    }

    if (status === 'Contraction') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/50 dark:text-rose-200 flex items-center gap-1 shrink-0 max-w-[200px] truncate" title={displayText}>
          <TrendingDown className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" />
          <span className="truncate">{displayText}</span>
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 flex items-center gap-1 shrink-0 max-w-[200px] truncate" title={displayText}>
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
        <span className="truncate">{displayText}</span>
      </span>
    );
  };

  // Delta badge styling
  const renderDeltaBadge = () => {
    const display = metric.deltaDisplay || metric.deltaValue;
    if (!display || display.trim() === '') return null;

    const style = metric.trendBadgeStyle || metric.deltaType;
    const isWarning = style === 'warning';
    const isPositive = style === 'positive';
    const isNegative = style === 'negative';

    if (isWarning) {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>{display}</span>
        </span>
      );
    }

    if (isPositive) {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 shrink-0">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{display}</span>
        </span>
      );
    }

    if (isNegative) {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 shrink-0">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{display}</span>
        </span>
      );
    }

    return (
      <span className="px-2.5 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 border border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 shrink-0">
        <span>{display}</span>
      </span>
    );
  };

  return (
    <article
      id={`metric-card-${metric.id}`}
      className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/90 bg-white dark:bg-slate-900 shadow-xs hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 ease-out p-6 flex flex-col justify-between will-change-transform"
    >
      {/* Top Meta Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {renderFrequencyBadge(metric.frequency)}
            <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {metric.category}
            </span>
            {!metric.isPublished && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
                Draft
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge(metric.status, metric.stanceState)}
            {isAdmin && (
              <div className="flex items-center gap-1 ml-1 opacity-90 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    id={`btn-edit-metric-${metric.id}`}
                    onClick={() => onEdit(metric)}
                    title="Edit Indicator"
                    aria-label={`Edit ${metric.title}`}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    id={`btn-delete-metric-${metric.id}`}
                    onClick={() => onDelete(metric.id)}
                    title="Delete Indicator"
                    aria-label={`Delete ${metric.title}`}
                    className="p-1 rounded-md text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[1.18rem] font-bold text-amber-950 dark:text-amber-100 tracking-tight leading-snug">
          {metric.title}
        </h2>

        {/* Observation Period & Data Status Badge */}
        {metric.observationPeriod && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span>Period:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{metric.observationPeriod}</span>
            {metric.dataStatus && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider ${
                metric.dataStatus === 'final'
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
              }`}>
                {metric.dataStatus}
              </span>
            )}
          </div>
        )}

        {/* Big Value + Unit and Delta Badge */}
        <div className="mt-3 flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight font-sans">
              {metric.value && metric.value.trim() !== '' ? metric.value : '—'}
            </span>
            {metric.unit && (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {metric.unit}
              </span>
            )}
          </div>

          {renderDeltaBadge()}
        </div>

        {/* Target / Anchor Line */}
        {metric.targetAnchor && (
          <div className="mt-3 text-xs leading-normal">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Target/Anchor: </span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">
              {metric.targetAnchor}
            </span>
          </div>
        )}

        {/* Summary Narrative */}
        {metric.summary && (
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 min-h-[36px]">
            {metric.summary}
          </p>
        )}
      </div>

      {/* Footer Row */}
      <footer className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 gap-2 flex-wrap">
        <div className="flex items-center gap-1 truncate max-w-[65%]">
          <span>Source:</span>
          {metric.sourceUrl ? (
            <a
              href={metric.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 hover:underline flex items-center gap-0.5 truncate"
              title={metric.sourceUrl}
            >
              <span className="truncate">{metric.sourceName}</span>
              <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
            </a>
          ) : (
            <strong className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {metric.sourceName}
            </strong>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-slate-600 dark:text-slate-300 font-medium">
          {metric.nextExpectedRelease && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-200 font-semibold" title="Next Expected Release">
              Next: {metric.nextExpectedRelease}
            </span>
          )}
          <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{metric.releaseDate}</span>
          </div>
        </div>
      </footer>
    </article>
  );
};
