import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

interface BackToTopProps {
  /** Threshold in pixels from top before showing button. Defaults to 280. */
  showThreshold?: number;
}

export const BackToTop: React.FC<BackToTopProps> = ({ showThreshold = 280 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    
    // Toggle visibility
    if (currentScrollY > showThreshold) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }

    // Calculate scroll progress percentage (0 - 100)
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight > 0) {
      const progress = Math.min(100, Math.max(0, Math.round((currentScrollY / docHeight) * 100)));
      setScrollProgress(progress);
    }
  }, [showThreshold]);

  useEffect(() => {
    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    // Optionally set focus to header or main for accessibility
    const headerEl = document.getElementById('app-header') || document.querySelector('header');
    if (headerEl) {
      headerEl.focus?.();
    }
  };

  if (!isVisible) return null;

  return (
    <aside aria-label="Scroll navigation">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={`Scroll back to top (${scrollProgress}% scrolled)`}
        title="Back to top"
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-1.5 pl-3 pr-3.5 py-2.5 rounded-full bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-lg shadow-slate-900/15 dark:shadow-black/30 backdrop-blur-md border border-slate-700/50 dark:border-slate-300 hover:bg-slate-800 dark:hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 animate-in fade-in slide-in-from-bottom-3"
      >
        <div className="relative flex items-center justify-center">
          <ArrowUp className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
        </div>
        <span className="text-xs font-semibold tracking-wide">Top</span>

        {/* Small subtle scroll percentage indicator */}
        <span
          className="text-[10px] font-mono opacity-60 ml-0.5 border-l border-white/20 dark:border-slate-900/20 pl-1.5 hidden sm:inline"
          aria-hidden="true"
        >
          {scrollProgress}%
        </span>
      </button>
    </aside>
  );
};
