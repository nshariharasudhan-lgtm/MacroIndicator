import { FC } from 'react';

interface MacroNestLogoProps {
  className?: string;
  variant?: 'auto' | 'light' | 'dark';
}

/**
 * Full vector MacroNest.online Brand Logo
 * Includes exact typography, color separation (.online in olive/sage green),
 * and the flanking "KNOWLEDGE TODAY / A BRIGHTER TOMORROW" motto rules.
 */
export const MacroNestLogo: FC<MacroNestLogoProps> = ({
  className = 'h-10 w-auto',
  variant = 'auto',
}) => {
  // Color palette for light vs dark mode
  const isAuto = variant === 'auto';
  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 560 135"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-label="MacroNest.online — Knowledge Today, A Brighter Tomorrow"
        role="img"
      >
        {/* Main Wordmark */}
        <text
          x="10"
          y="66"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="68"
          fontWeight="800"
          letterSpacing="-1.5"
        >
          <tspan
            fill={
              isDark
                ? '#FFFFFF'
                : isAuto
                ? 'currentColor'
                : '#113824'
            }
            className={
              isAuto
                ? 'fill-[#113824] dark:fill-white transition-colors'
                : undefined
            }
          >
            MacroNest
          </tspan>
          <tspan
            fill={
              isDark
                ? '#86EFAC'
                : isAuto
                ? 'currentColor'
                : '#547838'
            }
            fontWeight="600"
            className={
              isAuto
                ? 'fill-[#547838] dark:fill-emerald-400 transition-colors'
                : undefined
            }
          >
            .online
          </tspan>
        </text>

        {/* Tagline Row 1: Left Rule + KNOWLEDGE TODAY + Right Rule */}
        <line
          x1="16"
          y1="94"
          x2="132"
          y2="94"
          stroke={
            isDark
              ? '#94A3B8'
              : isAuto
              ? 'currentColor'
              : '#4B3F36'
          }
          strokeWidth="1.75"
          strokeLinecap="round"
          className={
            isAuto
              ? 'stroke-[#4B3F36] dark:stroke-slate-400 transition-colors'
              : undefined
          }
        />
        <text
          x="278"
          y="99"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="14.5"
          fontWeight="600"
          letterSpacing="4.8"
          fill={
            isDark
              ? '#CBD5E1'
              : isAuto
              ? 'currentColor'
              : '#4B3F36'
          }
          className={
            isAuto
              ? 'fill-[#4B3F36] dark:fill-slate-300 transition-colors'
              : undefined
          }
        >
          KNOWLEDGE TODAY
        </text>
        <line
          x1="424"
          y1="94"
          x2="540"
          y2="94"
          stroke={
            isDark
              ? '#94A3B8'
              : isAuto
              ? 'currentColor'
              : '#4B3F36'
          }
          strokeWidth="1.75"
          strokeLinecap="round"
          className={
            isAuto
              ? 'stroke-[#4B3F36] dark:stroke-slate-400 transition-colors'
              : undefined
          }
        />

        {/* Tagline Row 2: A BRIGHTER TOMORROW */}
        <text
          x="278"
          y="122"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="13.5"
          fontWeight="600"
          letterSpacing="6.8"
          fill={
            isDark
              ? '#94A3B8'
              : isAuto
              ? 'currentColor'
              : '#4B3F36'
          }
          className={
            isAuto
              ? 'fill-[#4B3F36] dark:fill-slate-400 transition-colors'
              : undefined
          }
        >
          A BRIGHTER TOMORROW
        </text>
      </svg>
    </div>
  );
};
