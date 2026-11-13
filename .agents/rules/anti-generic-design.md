# Maniac Design & Aesthetics Rule

Always enforce Maniac's canonical Vercel-inspired monochrome design standards (per Maniac-DESIGN.md) to prevent UI from degrading into generic AI SaaS templates:

1. **Brand Identity**:
   - Maniac is a dark-first, precision monochrome, local-first OS.
   - Strictly black, white, and neutral greys only. Dark mode canvas is pure `#000000`, with exact light mode inverse (`#FFFFFF`).
   - Never use blue, purple, orange, red, green, gradients, or a colored glow as brand accents.
   - Avoid generic template cards, multi-layer glassmorphism, or unconsidered 100px pills.

2. **Design Tokens Over Inline CSS**:
   - Never write hardcoded hex codes or arbitrary inline style blocks in JSX components.
   - Always bind to canonical CSS tokens defined in `src/index.css`: `--color-bg`, `--color-surface-1` through `4`, `--color-border`, `--color-fg`, etc.

3. **Hairline Borders & Tactile Micro-Physics**:
   - Default borders are predominantly 1px hairlines (`var(--color-border-subtle)` for dividers, `var(--color-border)` for controls).
   - Interactive elements must have crisp hover, active, and custom `:focus-visible` outlines (2px `var(--color-border-focus)`).
   - Restrained transitions (100–160ms `cubic-bezier(0.2, 0, 0, 1)`). No spring/bounce motion or glowing shadows.

4. **Loading & Empty States**:
   - Render static or softly animated monochrome `.skeleton` shimmer placeholders (`#111111` to `#1A1A1A` in dark; neutral inverse in light) instead of blank areas or bright moving shimmers.
   - Empty states must be encouraging, typography-first, and provide a single clear primary action button.
