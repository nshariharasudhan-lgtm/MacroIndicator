import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';

interface PrivacyViewProps {
  onNavigateHome?: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onNavigateHome }) => {
  return (
    <div id="privacy-page" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
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
        <span className="text-slate-800 dark:text-slate-200 font-semibold">Privacy Policy</span>
      </nav>

      {/* Header */}
      <header className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
          Transparency &amp; Privacy
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          MacroNest is dedicated to protecting visitor privacy. This policy outlines how information is collected, processed, and safeguarded when using macronest.online.
        </p>
      </header>

      {/* Core Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Zero Financial Tracking</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Calculations performed in the EMI and Fixed Deposit tools run completely in your client browser and are never transmitted to any server.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">No Personal Profiles</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            We do not sell, rent, or trade visitor personal data to third parties, advertising brokers, or financial lead aggregators.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Minimal Telemetry</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Standard anonymous web metrics via Google Analytics (gtag.js) are used solely to assess aggregate page visits and technical performance.
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <section className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
        <p>
          MacroNest collects aggregate, non-personally identifiable information automatically provided by web browsers (such as browser type, device category, referring page, and operating system). When submitting an inquiry through our contact form, you voluntarily provide your name and email address for communication purposes.
        </p>

        <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Calculator Usage &amp; Local Storage</h2>
        <p>
          Inputs entered into the RBI Repo Rate Loan and Fixed Deposit Calculator (including loan principal, interest rates, and deposit sums) are processed in memory inside your browser. We do not store or transmit your personal financial computations. Your preference for Day/Dark mode is saved locally in your browser’s <code>localStorage</code>.
        </p>

        <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Cookies &amp; Third-Party Services</h2>
        <p>
          We use Google Analytics to measure aggregate website usage trends. You can disable cookies at any time via your browser settings without impacting the availability of macroeconomic indicators or calculators on MacroNest.
        </p>

        <h2 className="text-base font-bold text-slate-900 dark:text-white">4. Updates &amp; Contact</h2>
        <p>
          This policy was last updated in September 2026. For questions regarding our data practices, please reach out via <code>contact@macronest.online</code>.
        </p>
      </section>
    </div>
  );
};
