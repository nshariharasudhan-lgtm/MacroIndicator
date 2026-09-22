import { FC, useState, useEffect } from 'react';
import { X, Sparkles, Eye } from 'lucide-react';
import {
  MacroMetric,
  Frequency,
  Category,
  MetricStatus,
  DeltaType,
} from '../types.ts';
import { INDIA_MACRO_CALENDAR_TEMPLATES } from '../data/macroCalendar.ts';
import { MetricCard } from './MetricCard.tsx';

interface MetricEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metricData: Partial<MacroMetric>) => void;
  initialData?: MacroMetric | null;
}

export const MetricEditorModal: FC<MetricEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<MacroMetric>>({
    title: '',
    frequency: 'MONTHLY',
    category: 'REAL ECONOMY',
    status: 'Normal',
    value: '',
    unit: '',
    deltaValue: '',
    deltaType: 'neutral',
    targetAnchor: '',
    summary: '',
    sourceName: '',
    sourceUrl: '',
    releaseDate: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    releaseWindow: '',
    isPublished: true,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    setValidationError('');
    if (initialData) {
      setFormData(initialData);
      setSelectedTemplateId('');
    } else {
      setFormData({
        title: '',
        frequency: 'MONTHLY',
        category: 'REAL ECONOMY',
        status: 'Normal',
        value: '',
        unit: '',
        deltaValue: '',
        deltaType: 'neutral',
        targetAnchor: '',
        summary: '',
        sourceName: '',
        sourceUrl: '',
        releaseDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        releaseWindow: '',
        isPublished: true,
      });
      setSelectedTemplateId('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = INDIA_MACRO_CALENDAR_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        title: template.report,
        frequency: template.frequency,
        category: template.category,
        status: template.defaultStatus,
        unit: template.defaultUnit,
        targetAnchor: template.defaultTargetAnchor,
        sourceName: template.source,
        sourceUrl: template.sourceUrl,
        releaseWindow: template.window,
        summary: template.note || '',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.value?.trim()) {
      setValidationError('Please provide both an Indicator Title and a Metric Value to save.');
      return;
    }
    setValidationError('');
    onSave(formData);
  };

  // Preview metric dummy object for card preview
  const previewMetric: MacroMetric = {
    id: initialData?.id || 'preview-temp',
    title: formData.title || 'Indicator Title Preview',
    frequency: formData.frequency || 'MONTHLY',
    category: formData.category || 'REAL ECONOMY',
    status: formData.status || 'Normal',
    value: formData.value || '0.00',
    unit: formData.unit || 'unit',
    deltaValue: formData.deltaValue || '',
    deltaType: formData.deltaType || 'neutral',
    targetAnchor: formData.targetAnchor || 'Target reference baseline',
    summary: formData.summary || 'Summary and commentary narrative will appear here.',
    sourceName: formData.sourceName || 'Source Organization',
    sourceUrl: formData.sourceUrl || '',
    releaseDate: formData.releaseDate || 'Current date',
    releaseWindow: formData.releaseWindow || '',
    isPublished: formData.isPublished ?? true,
    order: initialData?.order || 1,
    createdAt: initialData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {initialData ? 'Edit Macro Metric' : 'Add New Macro Metric'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure parameters, targets, and release sources for this display card
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
            <button
              id="btn-close-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {validationError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between animate-fade-in">
              <span>{validationError}</span>
              <button
                type="button"
                onClick={() => setValidationError('')}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Pre-fill from India Macro Data Calendar */}
          {!initialData && (
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
              <label
                htmlFor="template-select"
                className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1.5 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Pre-fill from India Macro Data Calendar Specification</span>
              </label>
              <select
                id="template-select"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Choose from Calendar Specification (e.g. GST, CPI, Forex, GDP) --</option>
                <optgroup label="Monthly Cycle Releases">
                  {INDIA_MACRO_CALENDAR_TEMPLATES.filter((t) => t.cycle === 'monthly').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.window} · {t.report} ({t.source})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bimonthly & Quarterly Releases">
                  {INDIA_MACRO_CALENDAR_TEMPLATES.filter((t) => t.cycle === 'bimonthly_quarterly').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.window} · {t.report} ({t.source})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Daily & Weekly Feed">
                  {INDIA_MACRO_CALENDAR_TEMPLATES.filter((t) => t.cycle === 'daily_weekly').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.window} · {t.report} ({t.source})
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-400">
                Selecting a template auto-populates source agency, cadence, category, and target guidance so you only have to enter the release figure.
              </p>
            </div>
          )}

          {/* Live Preview Card */}
          {showPreview && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                <span>Display Card Preview</span>
                <span className="text-[10px] lowercase text-slate-400">matches screenshot specification</span>
              </div>
              <div className="max-w-md mx-auto">
                <MetricCard metric={previewMetric} />
              </div>
            </div>
          )}

          {/* Core Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="field-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Indicator Title *
              </label>
              <input
                id="field-title"
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Net Institutional Equity Flow (FII + DII)"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category Pill *
              </label>
              <select
                id="field-category"
                value={formData.category || 'REAL ECONOMY'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                <option value="MARKETS">MARKETS</option>
                <option value="EXTERNAL">EXTERNAL</option>
                <option value="MONETARY">MONETARY</option>
                <option value="INFLATION">INFLATION</option>
                <option value="REAL ECONOMY">REAL ECONOMY</option>
                <option value="FISCAL">FISCAL</option>
                <option value="INDUSTRY">INDUSTRY</option>
                <option value="COMMODITIES">COMMODITIES</option>
              </select>
            </div>
          </div>

          {/* Cadence and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-frequency" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Release Frequency *
              </label>
              <select
                id="field-frequency"
                value={formData.frequency || 'MONTHLY'}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Frequency })}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                <option value="DAILY">DAILY (Blue pill)</option>
                <option value="WEEKLY">WEEKLY (Purple pill)</option>
                <option value="MONTHLY">MONTHLY (Amber pill)</option>
                <option value="BIMONTHLY">BIMONTHLY (Teal pill)</option>
                <option value="QUARTERLY">QUARTERLY (Indigo pill)</option>
                <option value="HALF-YEARLY">HALF-YEARLY (Slate pill)</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stance / State Badge *
              </label>
              <select
                id="field-status"
                value={formData.status || 'Normal'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MetricStatus })}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                <option value="Expansion">↗ Expansion (Emerald green)</option>
                <option value="Normal">✓ Normal (Neutral slate)</option>
                <option value="Contraction">↘ Contraction (Rose red)</option>
                <option value="Caution">⚠ Caution (Amber)</option>
                <option value="Hawkish">⚡ Hawkish (Red)</option>
                <option value="Dovish">🕊 Dovish (Sky blue)</option>
                <option value="Neutral">⏸ Neutral (Muted)</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-release-window" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Typical Release Window
              </label>
              <input
                id="field-release-window"
                type="text"
                value={formData.releaseWindow || ''}
                onChange={(e) => setFormData({ ...formData, releaseWindow: e.target.value })}
                placeholder="e.g. 1st – 3rd of month / Every Friday"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Numbers: Value, Unit, Delta */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <label htmlFor="field-value" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Main Metric Value *
              </label>
              <input
                id="field-value"
                type="text"
                required
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g. 2,340 or 689.24"
                className="w-full text-base font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field-unit" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit / Suffix
              </label>
              <input
                id="field-unit"
                type="text"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. ₹ crore net / $ billion / % y-o-y"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field-delta-value" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Delta / Trend
              </label>
              <input
                id="field-delta-value"
                type="text"
                value={formData.deltaValue || ''}
                onChange={(e) => setFormData({ ...formData, deltaValue: e.target.value })}
                placeholder="e.g. +480% / +5.26% / +0.3 bps"
                className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field-delta-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trend Badge Style
              </label>
              <select
                id="field-delta-type"
                value={formData.deltaType || 'neutral'}
                onChange={(e) => setFormData({ ...formData, deltaType: e.target.value as DeltaType })}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                <option value="positive">Green (Positive / Expansion)</option>
                <option value="negative">Red (Negative / Downturn)</option>
                <option value="neutral">Slate (Neutral)</option>
              </select>
            </div>
          </div>

          {/* Target / Anchor Line */}
          <div>
            <label htmlFor="field-target-anchor" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target / Anchor
            </label>
            <input
              id="field-target-anchor"
              type="text"
              value={formData.targetAnchor || ''}
              onChange={(e) => setFormData({ ...formData, targetAnchor: e.target.value })}
              placeholder="e.g. Positive absorption / Historic Record High (>11 mo imports) / Broad Money expansion"
              className="w-full text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          {/* Narrative Summary */}
          <div>
            <label htmlFor="field-summary" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Narrative Commentary / Breakdown
            </label>
            <textarea
              id="field-summary"
              rows={3}
              value={formData.summary || ''}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="e.g. DIIs net buyers of +₹2,840 Cr; FIIs net sellers of -₹500 Cr. Net domestic liquidity remains ample."
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          {/* Source Attribution and Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-source-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source Label *
              </label>
              <input
                id="field-source-name"
                type="text"
                required
                value={formData.sourceName || ''}
                onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                placeholder="e.g. NSDL — fpi.nsdl.co.in or RBI"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field-source-url" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source URL (optional link)
              </label>
              <input
                id="field-source-url"
                type="url"
                value={formData.sourceUrl || ''}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                placeholder="https://wss.rbi.org.in"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field-release-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Release Date / Period *
              </label>
              <input
                id="field-release-date"
                type="text"
                required
                value={formData.releaseDate || ''}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                placeholder="e.g. Sep 12, 2026 / Week ended Sep 05, 2026"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Publishing state */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished ?? true}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Publish on public live dashboard
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-submit-metric"
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                {initialData ? 'Update Indicator' : 'Save & Publish Indicator'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
