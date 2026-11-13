import { useId } from 'react';

/**
 * ManiacLogo — The fractured monolith mark.
 *
 * Monochrome architectural "M" constructed from angular facets,
 * sliced with high-precision geometry. Zero color glows or gradients.
 * Pure high-contrast technical mark matching the Vercel-inspired monochrome aesthetic.
 *
 * Sizes: 'xs' (20), 'sm' (28), 'md' (36), 'lg' (48), 'xl' (72), 'hero' (120)
 */
export default function ManiacLogo({ size = 'md', animate = false, className = '' }) {
  const sizes = { xs: 20, sm: 28, md: 36, lg: 48, xl: 72, hero: 120 };
  const px = sizes[size] || sizes.md;
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`maniac-logo ${animate ? 'maniac-logo--animated' : ''} ${className}`}
      role="img"
      aria-label="Maniac logo"
    >
      <defs>
        {/* Primary structural facet: high-contrast monochrome gradient */}
        <linearGradient id={`${uid}g1`} x1="10" y1="110" x2="110" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-fg, #FAFAFA)" stopOpacity="0.88" />
          <stop offset="60%" stopColor="var(--color-fg, #FAFAFA)" stopOpacity="0.96" />
          <stop offset="100%" stopColor="var(--color-fg, #FAFAFA)" stopOpacity="1" />
        </linearGradient>

        {/* Lighter face gradient for inner facets — bevel depth */}
        <linearGradient id={`${uid}g2`} x1="30" y1="100" x2="90" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-fg, #FAFAFA)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-fg, #FAFAFA)" stopOpacity="0.75" />
        </linearGradient>

        {/* Shadow face — darker contrast facet */}
        <linearGradient id={`${uid}g3`} x1="60" y1="100" x2="60" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-border-strong, #3F3F46)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-border-focus, #A1A1AA)" stopOpacity="0.75" />
        </linearGradient>

        {/* Precision diagonal scar slash */}
        <linearGradient id={`${uid}sc`} x1="15" y1="90" x2="105" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-bg, #000000)" />
          <stop offset="50%" stopColor="var(--color-surface-4, #111111)" />
          <stop offset="100%" stopColor="var(--color-bg, #000000)" />
        </linearGradient>

        {/* Inner scar core — razor edge hairline */}
        <linearGradient id={`${uid}sc2`} x1="15" y1="90" x2="105" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-border-focus, #A1A1AA)" />
          <stop offset="50%" stopColor="var(--color-fg, #FAFAFA)" />
          <stop offset="100%" stopColor="var(--color-border-focus, #A1A1AA)" />
        </linearGradient>
      </defs>

      {/* ====== OUTER M STRUCTURE ====== */}

      {/* Left pillar — slightly tapered, heavy base */}
      <polygon
        points="12,102 12,22 18,18 28,16 30,98"
        fill={`url(#${uid}g1)`}
      />
      {/* Left pillar inner face — lighter bevel */}
      <polygon
        points="18,18 28,16 30,98 24,100 18,24"
        fill={`url(#${uid}g2)`}
        opacity="0.4"
      />

      {/* Left ascending arm */}
      <polygon
        points="28,16 36,10 60,54 50,62"
        fill={`url(#${uid}g1)`}
      />
      {/* Left arm inner facet */}
      <polygon
        points="32,14 36,10 60,54 56,56"
        fill={`url(#${uid}g2)`}
        opacity="0.35"
      />

      {/* Center V notch — the valley */}
      <polygon
        points="50,62 60,54 70,58 60,68"
        fill={`url(#${uid}g3)`}
        opacity="0.9"
      />
      {/* V notch core */}
      <polygon
        points="54,60 60,54 66,58 60,64"
        fill={`url(#${uid}sc)`}
        opacity="0.5"
      />

      {/* Right ascending arm */}
      <polygon
        points="60,54 70,58 84,12 92,10"
        fill={`url(#${uid}g1)`}
      />
      {/* Right arm inner facet */}
      <polygon
        points="64,56 70,58 84,12 88,11"
        fill={`url(#${uid}g2)`}
        opacity="0.35"
      />

      {/* Right pillar */}
      <polygon
        points="84,12 92,10 108,18 108,102 90,98"
        fill={`url(#${uid}g1)`}
      />
      {/* Right pillar inner bevel */}
      <polygon
        points="96,16 108,18 108,102 102,100 102,22"
        fill={`url(#${uid}g2)`}
        opacity="0.3"
      />

      {/* ====== BASE PLINTH ====== */}
      <rect
        x="10" y="98"
        width="100" height="8"
        rx="2"
        fill={`url(#${uid}g1)`}
        opacity="0.75"
      />
      {/* Plinth highlight strip */}
      <rect
        x="10" y="98"
        width="100" height="2.5"
        rx="1"
        fill={`url(#${uid}g2)`}
        opacity="0.3"
      />

      {/* ====== FACETING LINES — internal hairline geometry ====== */}
      <line x1="20" y1="30" x2="26" y2="90" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.5" opacity="0.25" />
      <line x1="100" y1="30" x2="96" y2="90" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.5" opacity="0.25" />
      <line x1="40" y1="24" x2="56" y2="56" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.5" opacity="0.2" />
      <line x1="80" y1="24" x2="66" y2="56" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.5" opacity="0.2" />

      {/* ====== THE SCAR — diagonal razor gash ====== */}
      <line
        x1="16" y1="86" x2="104" y2="34"
        stroke={`url(#${uid}sc)`}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
        className="maniac-scar"
      />
      {/* High-contrast inner hairline core */}
      <line
        x1="18" y1="85" x2="103" y2="35"
        stroke={`url(#${uid}sc2)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
        className="maniac-scar-core"
      />

      {/* ====== SPLINTERING — hairline fractures radiating from the scar ====== */}
      <line x1="72" y1="48" x2="80" y2="38" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
      <line x1="80" y1="38" x2="84" y2="34" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.6" opacity="0.4" strokeLinecap="round" />
      <line x1="52" y1="66" x2="44" y2="58" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.7" opacity="0.45" strokeLinecap="round" />
      <line x1="36" y1="78" x2="30" y2="84" stroke="var(--color-border-focus, #A1A1AA)" strokeWidth="0.7" opacity="0.4" strokeLinecap="round" />

      {/* ====== DEBRIS SHARDS ====== */}
      <polygon
        points="86,30 94,24 90,36"
        fill="var(--color-fg, #FAFAFA)"
        opacity="0.6"
        className="maniac-debris maniac-debris-1"
      />
      <polygon
        points="76,40 82,36 80,44 74,42"
        fill="var(--color-fg, #FAFAFA)"
        opacity="0.5"
        className="maniac-debris maniac-debris-2"
      />
      <polygon
        points="62,52 66,48 64,56"
        fill="var(--color-fg, #FAFAFA)"
        opacity="0.45"
        className="maniac-debris maniac-debris-3"
      />
      <polygon
        points="34,74 38,70 36,78"
        fill="var(--color-fg, #FAFAFA)"
        opacity="0.4"
        className="maniac-debris maniac-debris-4"
      />
      <polygon
        points="44,70 48,66 46,72"
        fill="var(--color-fg, #FAFAFA)"
        opacity="0.35"
        className="maniac-debris maniac-debris-5"
      />

      {/* ====== SPARK PARTICLES ====== */}
      <circle cx="30" cy="80" r="1" fill="var(--color-fg, #FAFAFA)" opacity="0.5" className="maniac-spark maniac-spark-1" />
      <circle cx="48" cy="68" r="0.8" fill="var(--color-fg, #FAFAFA)" opacity="0.45" className="maniac-spark maniac-spark-2" />
      <circle cx="66" cy="56" r="1.2" fill="var(--color-fg, #FAFAFA)" opacity="0.5" className="maniac-spark maniac-spark-3" />
      <circle cx="84" cy="44" r="0.7" fill="var(--color-fg, #FAFAFA)" opacity="0.4" className="maniac-spark maniac-spark-4" />
      <circle cx="96" cy="38" r="0.9" fill="var(--color-fg, #FAFAFA)" opacity="0.4" className="maniac-spark maniac-spark-5" />

      {/* ====== EDGE HIGHLIGHT — crisp top hairline ====== */}
      <polyline
        points="12,22 18,18 36,10 60,54"
        fill="none"
        stroke="var(--color-border-focus, #A1A1AA)"
        strokeWidth="0.8"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <polyline
        points="60,54 92,10 108,18"
        fill="none"
        stroke="var(--color-border-focus, #A1A1AA)"
        strokeWidth="0.8"
        strokeLinejoin="round"
        opacity="0.3"
      />
    </svg>
  );
}

/**
 * ManiacWordmark — "MANIAC" with the logo mark beside it.
 * Used in dashboard headers and larger brand contexts.
 */
export function ManiacWordmark({ size = 'md', showLogo = true }) {
  const fontSizes = { sm: 14, md: 18, lg: 24, xl: 32 };
  const fs = fontSizes[size] || fontSizes.md;
  const logoSizes = { sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' };

  return (
    <div className="maniac-wordmark" style={{ display: 'flex', alignItems: 'center', gap: `${fs * 0.5}px` }}>
      {showLogo && <ManiacLogo size={logoSizes[size] || 'sm'} />}
      <span
        className="maniac-wordmark-text"
        style={{
          fontSize: `${fs}px`,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--color-fg, #FAFAFA)',
          lineHeight: 1,
        }}
      >
        MANIAC
      </span>
    </div>
  );
}
