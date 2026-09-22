import { FC, useState } from 'react';
import {
  CalendarDays,
  ExternalLink,
  PlusCircle,
  Clock,
  CheckCircle,
  HelpCircle,
  CalendarCheck,
} from 'lucide-react';
import { INDIA_MACRO_CALENDAR_TEMPLATES } from '../data/macroCalendar.ts';
import { MacroCalendarTemplate } from '../types.ts';

interface MacroCalendarViewProps {
  onSelectTemplateToCreate: (template: MacroCalendarTemplate) => void;
}

export const MacroCalendarView: FC<MacroCalendarViewProps> = ({
  onSelectTemplateToCreate,
}) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'bimonthly_quarterly' | 'daily_weekly' | 'cadence'>('monthly');

  const monthlyItems = INDIA_MACRO_CALENDAR_TEMPLATES.filter((t) => t.cycle === 'monthly');
  const bimonthlyQuarterlyItems = INDIA_MACRO_CALENDAR_TEMPLATES.filter((t) => t.cycle === 'bimonthly_quarterly');
  const dailyWeeklyItems = INDIA_MACRO_CALENDAR_TEMPLATES.filter((t) => t.cycle === 'daily_weekly');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Calendar Header Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              Checklist Specification
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              India Macro Data Calendar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            India Macro Data Calendar
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            A monthly checklist of public/government releases to feed your dashboard · build once, reuse every cycle.
            Dates are typical release windows and shift slightly month to month — always confirm against the source's own release calendar before publishing.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monthly'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Monthly Cycle ({monthlyItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bimonthly_quarterly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bimonthly_quarterly'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Bimonthly & Quarterly ({bimonthlyQuarterlyItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('daily_weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'daily_weekly'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Daily & Weekly Feed ({dailyWeeklyItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cadence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cadence'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Recommended Cadence</span>
          </button>
        </div>
      </div>

      {/* Monthly Cycle Table */}
      {activeTab === 'monthly' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Cycle — What To Pull, and When
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Regular economic milestones published at predictable monthly windows
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">9 Core Indicators</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-28">Window</th>
                  <th className="py-3 px-4">Report</th>
                  <th className="py-3 px-4">Official Source</th>
                  <th className="py-3 px-4">Grab this number</th>
                  <th className="py-3 px-4 text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {item.window}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.report}</div>
                      {item.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{item.source}</span>
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{item.source}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {item.grabThisNumber}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTemplateToCreate(item)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            * PMI is privately compiled (S&P Global), not government data — included because it's a widely used leading indicator with no direct govt equivalent.
          </div>
        </div>
      )}

      {/* Bimonthly & Quarterly Table */}
      {activeTab === 'bimonthly_quarterly' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bimonthly & Quarterly — The Bigger Refreshes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-impact policy decisions and structural macro aggregates
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">4 Key Benchmarks</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-36">Frequency</th>
                  <th className="py-3 px-4">Report</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Grab this number</th>
                  <th className="py-3 px-4 text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bimonthlyQuarterlyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {item.window}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.report}</div>
                      {item.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{item.source}</span>
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{item.source}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {item.grabThisNumber}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTemplateToCreate(item)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily & Weekly Table */}
      {activeTab === 'daily_weekly' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Daily & Weekly — For a Faster-Moving Feed
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optional high-frequency layer for markets today and capital flows
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Fast Feed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-28">Frequency</th>
                  <th className="py-3 px-4">Data Stream</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Grab this number</th>
                  <th className="py-3 px-4 text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dailyWeeklyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {item.window}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.report}</div>
                      {item.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{item.source}</span>
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{item.source}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {item.grabThisNumber}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTemplateToCreate(item)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cadence Strategy */}
      {activeTab === 'cadence' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recommended Starting Cadence
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Don't try to run all of this at once. A realistic v1 publishing rhythm:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                Monthly Issue
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                CPI + GST Collections + Bank Credit Growth
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                The three easiest to source and most-asked-about numbers. Establishes steady publishing discipline.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
                Bimonthly Special
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                RBI MPC Decision Day
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Repo rate and stance announcement is your highest-attention, most shareable macroeconomic moment.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                Quarterly Deep-Dive
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                GDP Release
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Use the Monetary Policy Report for narrative context, like the dashboard sample already built.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                Hold Off On
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                Daily Data (Equities, Forex Spot, G-Sec)
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Until you have a real audience — it requires near-real-time automation to be worth publishing.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Built as a companion to the sample "India in Numbers" dashboard. Always verify exact release dates against each source's own calendar (RBI and MoSPI both publish annual release calendars) before treating a date here as fixed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
