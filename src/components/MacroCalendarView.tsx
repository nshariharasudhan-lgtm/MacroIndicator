import { FC, useState } from 'react';
import {
  CalendarDays,
  ExternalLink,
  Clock,
  CheckCircle,
  HelpCircle,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { INDIA_MACRO_CALENDAR_TEMPLATES } from '../data/macroCalendar.ts';

export const MacroCalendarView: FC = () => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'bimonthly_quarterly' | 'daily_weekly' | 'cadence'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const calendarFaqs = [
    {
      q: 'When does the RBI Monetary Policy Committee (MPC) announce repo rate decisions?',
      a: 'The RBI Monetary Policy Committee meets bimonthly (six times a year), typically in February, April, June, August, October, and December. The policy resolution, interest rate decisions, and growth/inflation projections are announced at 10:00 AM IST on the final day of the 3-day MPC meeting.',
    },
    {
      q: "On what day is India's Retail CPI Inflation data released?",
      a: "India's headline Consumer Price Index (CPI) retail inflation is published monthly by the National Statistical Office (NSO), Ministry of Statistics and Programme Implementation (MoSPI), usually on the 12th of every month at 5:30 PM IST (or the preceding working day if the 12th falls on a weekend or public holiday).",
    },
    {
      q: "When is India's quarterly GDP growth data published?",
      a: 'Quarterly Gross Domestic Product (GDP) and Gross Value Added (GVA) estimates are published by MoSPI on the last working day of May (Q4 Jan-Mar), August (Q1 Apr-Jun), November (Q2 Jul-Sep), and February (Q3 Oct-Dec).',
    },
    {
      q: 'Where and when is daily banking system liquidity data updated?',
      a: 'Net systemic banking liquidity (deficit or surplus) is published every evening around 5:00 PM IST by the Reserve Bank of India and the Clearing Corporation of India Limited (CCIL), tracking reverse repo, repo, MSF, and Standing Deposit Facility (SDF) net absorption and injection.',
    },
    {
      q: "How frequently are India's Foreign Exchange (Forex) Reserves announced?",
      a: 'The Reserve Bank of India releases official Foreign Exchange Reserves figures weekly in its Weekly Statistical Supplement (WSS) every Friday at 5:00 PM IST, covering total reserves ($bn), foreign currency assets (FCA), gold reserves, and Special Drawing Rights (SDRs).',
    },
  ];

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
              Public Schedule
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Official Indian Economic Releases
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            India Macro Data Release Calendar
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            A comprehensive reference schedule of official government and central bank economic prints.
            Dates reflect typical publishing windows and shift slightly month to month based on public holidays and statistical agency schedules.
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
            <span>Cadence Guide</span>
          </button>
        </div>
      </div>

      {/* Monthly Cycle Table */}
      {activeTab === 'monthly' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Cycle — What To Watch, and When
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
                  <th className="py-3.5 px-4 w-36">Window</th>
                  <th className="py-3.5 px-4">Report</th>
                  <th className="py-3.5 px-4 w-48">Official Source</th>
                  <th className="py-3.5 px-4 w-72">Key Figure to Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {item.window}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.report}</div>
                      {item.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>{item.source}</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{item.source}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {item.grabThisNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            * PMI is privately compiled (S&P Global), not government data — included because it is a widely monitored leading indicator with no direct government equivalent.
          </div>
        </div>
      )}

      {/* Bimonthly & Quarterly Table */}
      {activeTab === 'bimonthly_quarterly' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bimonthly & Quarterly — High-Impact Decisions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monetary Policy Committee releases, structural GDP prints, and fiscal deficit updates
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">4 Key Benchmarks</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-40">Frequency / Window</th>
                  <th className="py-3.5 px-4">Report</th>
                  <th className="py-3.5 px-4 w-48">Official Source</th>
                  <th className="py-3.5 px-4 w-72">Key Figure to Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bimonthlyQuarterlyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {item.window}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.report}</div>
                      {item.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>{item.source}</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{item.source}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {item.grabThisNumber}
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
                Daily & Weekly — Market Feeds & Liquidity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-frequency liquidity operations, forex updates, and institutional equity flows
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Fast Feed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-36">Frequency / Window</th>
                  <th className="py-3.5 px-4">Data Stream</th>
                  <th className="py-3.5 px-4 w-48">Official Source</th>
                  <th className="py-3.5 px-4 w-72">Key Figure to Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dailyWeeklyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {item.window}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.report}</div>
                      {item.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>{item.source}</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{item.source}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {item.grabThisNumber}
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
              Official Cadence Reference
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Standard release schedule overview for Indian economic statistical releases:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                Monthly Regular
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                CPI Inflation + GST Collections + Trade Data
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Released in the middle of each month by MoSPI, Ministry of Finance, and Ministry of Commerce.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
                Bimonthly Policy
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                RBI Monetary Policy Committee (MPC)
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Announced 6 times per fiscal year (Feb, Apr, Jun, Aug, Oct, Dec) by the RBI Governor.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                Quarterly Macro
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                GDP Estimates & Balance of Payments (CAD)
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Released on the last working day of May, Aug, Nov, and Feb by MoSPI and RBI.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                Weekly & Daily
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                Forex Reserves & Net Liquidity Operations
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Forex reserves every Friday evening; Banking liquidity deficit/surplus daily by RBI and CCIL.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Official macroeconomic publication dates are governed by the annual release calendars of the Reserve Bank of India (RBI) and the Ministry of Statistics and Programme Implementation (MoSPI).
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FREQUENTLY ASKED QUESTIONS (SEARCH INTENT / FAQPAGE SCHEMA ALIGNED) */}
      {/* ========================================================================= */}
      <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Frequently Asked Questions on India Economic Releases</span>
        </h2>

        <div className="space-y-3">
          {calendarFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-4 font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                )}
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
