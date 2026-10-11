import { useId } from 'react';

/**
 * ManiacLogo — The fractured monolith mark.
 *
 * A heavyweight "M" constructed from angular facets, then slashed diagonally
 * with a glowing scar. Debris flies from the wound. Inner faceting gives
 * depth like a gemstone cross-section. The base is a heavy plinth.
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
        {/* Primary structural gradient — deep blue to violet, bottom-left to top-right */}
        <linearGradient id={`${uid}g1`} x1="10" y1="110" x2="110" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="30%" stopColor="#2E5BFF" />
          <stop offset="65%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        {/* Lighter face gradient for inner facets — creates depth/bevel illusion */}
        <linearGradient id={`${uid}g2`} x1="30" y1="100" x2="90" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Shadow face — darker variant for recessed facets */}
        <linearGradient id={`${uid}g3`} x1="60" y1="100" x2="60" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        {/* Scar slash gradient — hot ember trail */}
        <linearGradient id={`${uid}sc`} x1="15" y1="90" x2="105" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="40%" stopColor="#EF4444" />
          <stop offset="70%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>

        {/* Inner scar core — white-hot center */}
        <linearGradient id={`${uid}sc2`} x1="15" y1="90" x2="105" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        {/* Glow filter for the scar */}
        <filter id={`${uid}glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b1" />
          <feGaussianBlur stdDeviation="6" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle outer glow for the whole mark */}
        <filter id={`${uid}amb`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Clip for the upper shard separation */}
        <clipPath id={`${uid}clip`}>
          <rect x="0" y="0" width="120" height="120" />
        </clipPath>
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
      {/* V notch hot core — tiny ember at the center */}
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

      {/* ====== FACETING LINES — internal geometry for depth ====== */}
      {/* These thin lines simulate crystal-cut inner edges */}
      <line x1="20" y1="30" x2="26" y2="90" stroke="#818CF8" strokeWidth="0.5" opacity="0.2" />
      <line x1="100" y1="30" x2="96" y2="90" stroke="#818CF8" strokeWidth="0.5" opacity="0.2" />
      <line x1="40" y1="24" x2="56" y2="56" stroke="#818CF8" strokeWidth="0.5" opacity="0.15" />
      <line x1="80" y1="24" x2="66" y2="56" stroke="#818CF8" strokeWidth="0.5" opacity="0.15" />

      {/* ====== THE SCAR — diagonal gash ====== */}
      {/* Outer glow layer */}
      <line
        x1="16" y1="86" x2="104" y2="34"
        stroke={`url(#${uid}sc)`}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.3"
        className="maniac-scar-outer"
      />
      {/* Main scar body */}
      <line
        x1="16" y1="86" x2="104" y2="34"
        stroke={`url(#${uid}sc)`}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
        filter={`url(#${uid}glow)`}
        className="maniac-scar"
      />
      {/* White-hot inner core */}
      <line
        x1="18" y1="85" x2="103" y2="35"
        stroke={`url(#${uid}sc2)`}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
        className="maniac-scar-core"
      />

      {/* ====== SPLINTERING — cracks radiating from the scar ====== */}
      {/* Upper crack */}
      <line x1="72" y1="48" x2="80" y2="38" stroke="#F97316" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      <line x1="80" y1="38" x2="84" y2="34" stroke="#EF4444" strokeWidth="0.7" opacity="0.3" strokeLinecap="round" />
      {/* Mid crack */}
      <line x1="52" y1="66" x2="44" y2="58" stroke="#F97316" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
      {/* Lower crack */}
      <line x1="36" y1="78" x2="30" y2="84" stroke="#A855F7" strokeWidth="0.8" opacity="0.3" strokeLinecap="round" />

      {/* ====== DEBRIS SHARDS — flying off the scar ====== */}
      {/* Large shard — top right */}
      <polygon
        points="86,30 94,24 90,36"
        fill="#F97316"
        opacity="0.65"
        className="maniac-debris maniac-debris-1"
      />
      {/* Medium shard — upper mid */}
      <polygon
        points="76,40 82,36 80,44 74,42"
        fill="#EF4444"
        opacity="0.5"
        className="maniac-debris maniac-debris-2"
      />
      {/* Small shard — mid */}
      <polygon
        points="62,52 66,48 64,56"
        fill="#FB923C"
        opacity="0.45"
        className="maniac-debris maniac-debris-3"
      />
      {/* Tiny shard — lower left */}
      <polygon
        points="34,74 38,70 36,78"
        fill="#A855F7"
        opacity="0.4"
        className="maniac-debris maniac-debris-4"
      />
      {/* Micro shard — bottom */}
      <polygon
        points="44,70 48,66 46,72"
        fill="#6366F1"
        opacity="0.35"
        className="maniac-debris maniac-debris-5"
      />

      {/* ====== SPARK PARTICLES — tiny dots along the scar ====== */}
      <circle cx="30" cy="80" r="1" fill="#FDE68A" opacity="0.6" className="maniac-spark maniac-spark-1" />
      <circle cx="48" cy="68" r="0.8" fill="#FBBF24" opacity="0.5" className="maniac-spark maniac-spark-2" />
      <circle cx="66" cy="56" r="1.2" fill="#FDE68A" opacity="0.55" className="maniac-spark maniac-spark-3" />
      <circle cx="84" cy="44" r="0.7" fill="#FB923C" opacity="0.5" className="maniac-spark maniac-spark-4" />
      <circle cx="96" cy="38" r="0.9" fill="#FDE68A" opacity="0.45" className="maniac-spark maniac-spark-5" />

      {/* ====== EDGE HIGHLIGHT — top edges catch ambient light ====== */}
      <polyline
        points="12,22 18,18 36,10 60,54"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polyline
        points="60,54 92,10 108,18"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.8"
        strokeLinejoin="round"
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
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #f3f3f4 0%, rgba(243,243,244,0.65) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
        }}
      >
        MANIAC
      </span>
    </div>
  );
}
