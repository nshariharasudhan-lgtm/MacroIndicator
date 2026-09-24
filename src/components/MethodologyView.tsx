import React from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw, Layers, FileCheck } from 'lucide-react';

interface MethodologyViewProps {
  onNavigateHome?: () => void;
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ onNavigateHome }) => {
  return (
    <div id="methodology-page" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={onNavigateHome}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <span>/</span>
        <span className="text-slate-800 dark:text-slate-200 font-semibold">Data Methodology</span>
      </nav>

      {/* Header */}
      <header className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
          Standards &amp; Verification
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Data Methodology &amp; Governance
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          Learn how MacroNest ingests, verifies, structures, and updates macroeconomic indicators, policy rate anchors, and release schedules.
        </p>
      </header>

      {/* Core Principles */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Compilation Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Primary Source Ingestion</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every data point is compiled directly from statutory press releases, official notifications, and verified central bank bulletins (RBI, MoSPI, GSTN, Office of the Economic Adviser).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Provisional vs Final Handling</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Government economic series (such as CPI, WPI, IIP, and GDP) frequently undergo subsequent revisions. MacroNest explicitly documents the reference period, provisional status, and prior-period baseline.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Zero Synthetic Projections</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We never invent, estimate, or interpolate unreleased numbers. If an official agency has not published a print or the data cannot be confirmed, the indicator status reflects the last verified release.
            </p>
          </div>
        </div>
      </section>

      {/* Cadence & Cycles */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Release Cadence Protocols</h2>
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily &amp; Weekly Feeds</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                RBI USD/INR reference rates and sovereign bond yields are updated each trading business day. RBI Weekly Statistical Supplement (Forex Reserves) prints are ingested every Friday upon central bank release (~5:00 PM IST).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Releases</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                GST revenue collections arrive on the 1st–3rd; HSBC Manufacturing &amp; Services PMIs arrive on the 1st and 3rd business days; CPI Inflation is issued on the 12th at 4:00 PM IST (or the next working day); WPI Inflation on the 14th; Merchandise Trade on the 15th; and IIP on the final working day of each month.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bimonthly &amp; Quarterly Decisions</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                The RBI Monetary Policy Committee meets bimonthly (six times annually). Quarterly GDP estimates are released by MoSPI on the last working day of May, August, November, and February. Balance of Payments (BoP) and Current Account Deficit figures are published by the RBI quarterly with ~85–90 days lag.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Formulas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Calculator Formulas &amp; EBLR Rules</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The Repo Rate EMI and Savings Calculator models official Reserve Bank of India lending and deposit mechanisms:
        </p>
        <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <li>
            <strong>External Benchmark Lending Rate (EBLR):</strong> Mandated for all floating-rate retail loans issued since 1 October 2019. Lenders reset interest rates at least once every three months matching policy rate changes.
          </li>
          <li>
            <strong>MCLR Distinction:</strong> Loans sanctioned prior to 1 October 2019 under Marginal Cost of Funds based Lending Rate (MCLR) or Base Rate regimes reset on predetermined contractual anniversary dates (often 12 months) and do not automatically reset immediately with repo cuts.
          </li>
          <li>
            <strong>Fixed Deposit Quarterly Compounding:</strong> Standard Indian banking formula: <code>A = P * (1 + r/4)^(4*t)</code>. Senior citizen rates incorporate the prevailing +50 bps institutional premium.
          </li>
          <li>
            <strong>Real Rate of Return:</strong> Computed as <code>Real Yield = Nominal Interest Rate - MoSPI Headline CPI Inflation</code>.
          </li>
        </ul>
      </section>
    </div>
  );
};
