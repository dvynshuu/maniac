# Maniac Design & Aesthetics Rule

Always enforce Maniac's bespoke, high-craft design standards to prevent UI from degrading into generic AI SaaS templates:

1. **Brand Identity**:
   - Maniac is a dark-first, cyber-minimalist, local-first OS.
   - Utilize Ember/Scarlet gradients (`--accent-scar`, `--accent-ember`) and cosmic deep blacks (`--bg-primary: #050508`).
   - Avoid generic single-color flat backgrounds, generic template cards, or standard cookie-cutter purple pills.

2. **Design Tokens Over Inline CSS**:
   - Never write hardcoded hex codes or arbitrary inline style blocks in JSX components.
   - Always define semantic CSS classes in `src/index.css` (or dedicated component stylesheets) using design tokens (`var(--border-subtle)`, `var(--bg-elevated)`, etc.).

3. **Tactile Interaction & Micro-Physics**:
   - Interactive elements must have crisp hover, active, and custom `:focus-visible` states with smooth easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Interactive buttons must provide micro-feedback (`transform: translateY(-1px)`, subtle glow spread).

4. **Loading & Empty States**:
   - Always render animated `.skeleton` shimmer placeholders instead of jarring blank areas or basic "Loading..." strings.
   - Empty states must be encouraging, visual, and provide an immediate primary call-to-action button.
