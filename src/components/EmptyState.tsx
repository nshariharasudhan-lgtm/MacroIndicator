import { FC } from 'react';
import { BarChart3 } from 'lucide-react';

export const EmptyState: FC = () => {
  return (
    <div
      id="empty-state-container"
      className="max-w-xl mx-auto my-16 text-center p-8 sm:p-12 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 mb-5 shadow-inner">
        <BarChart3 className="w-7 h-7 text-slate-900 dark:text-white" />
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
        No Macro Indicators Published
      </h2>

      <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        Official macroeconomic data will appear here in alignment with RBI, MoSPI, and Ministry release schedules.
      </p>
    </div>
  );
};
