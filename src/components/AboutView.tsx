import React from 'react';
import { ShieldCheck, Database, Award, ArrowLeft, ExternalLink } from 'lucide-react';

interface AboutViewProps {
  onNavigateHome?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigateHome }) => {
  return (
    <div id="about-page" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
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
        <span className="text-slate-800 dark:text-slate-200 font-semibold">About MacroNest</span>
      </nav>

      {/* Header */}
      <header className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          Platform Overview
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          About MacroNest
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          MacroNest is an independent macroeconomic data monitoring platform designed to provide transparent, accessible, and structured tracking of Indian and global economic indicators.
        </p>
      </header>

      {/* Mission & Purpose */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Economic indicators shape borrowing costs, investment returns, inflation expectations, and business decisions across India. However, official data is frequently fragmented across disparate government portals, PDF press notes, and technical gazettes. MacroNest compiles and structures this information into a unified, high-frequency dashboard, accompanied by practical simulation tools like the RBI Repo Rate Loan &amp; Savings Calculator.
        </p>
      </section>

      {/* Data Compilation Sources */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Official Sources &amp; Coverage</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Data on MacroNest is compiled strictly from published releases of statutory agencies, central banks, and authorized public authorities:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Reserve Bank of India (RBI)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Monetary Policy Committee (MPC) repo rates, Weekly Statistical Supplement (WSS) forex reserves, Balance of Payments (BoP), and banking system liquidity.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>MoSPI (National Statistical Office)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Consumer Price Index (CPI) retail inflation, quarterly Gross Domestic Product (GDP/GVA), Index of Industrial Production (IIP), and PLFS employment data.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Ministry of Finance &amp; GSTN</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Gross and net monthly Goods and Services Tax (GST) revenue collections and Controller General of Accounts (CGA) fiscal deficit data.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>International Benchmarks</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              US Federal Reserve (FOMC), US Bureau of Labor Statistics (CPI, Nonfarm Payrolls), European Central Bank (ECB), and ICE commodity benchmarks.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Independence & Statutory Disclaimer */}
      <section className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
        <h2 className="text-base font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Statutory Disclaimer &amp; Independence</span>
        </h2>
        <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
          MacroNest is an independent research publication and data aggregation service. MacroNest is not affiliated with, authorized by, endorsed by, or in any way officially connected with the Reserve Bank of India (RBI), the Ministry of Statistics and Programme Implementation (MoSPI), or the Government of India.
        </p>
        <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-semibold">
          All material, figures, and calculations provided on this website are for general informational, educational, and research purposes only and do not constitute financial, investment, legal, or tax advice.
        </p>
      </section>
    </div>
  );
};
