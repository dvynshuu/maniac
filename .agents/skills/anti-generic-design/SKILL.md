---
name: anti-generic-design
description: >-
  Enforces bespoke, high-craft, anti-generic UI/UX design standards for Maniac.
  Use this skill whenever designing, modifying, or refactoring user interfaces, CSS,
  layouts, interactions, animations, color schemes, or visual components in Maniac.
---

# Anti-Generic Design Skill & Manifesto (Maniac OS)

This skill provides design directives and concrete implementation patterns to ensure Maniac maintains a distinct, world-class, bespoke digital workspace feel per the canonical specification in `Maniac-DESIGN.md`.

---

## 1. The Anti-Generic SaaS Hall of Shame (What to NEVER Build)

When developing UI in Maniac, strictly avoid these AI/SaaS clichés:

| Cliché | Why It's Bad | What to Do in Maniac Instead |
| :--- | :--- | :--- |
| **Monotonous Colored Gradients / Aurora Glows** | Screams generic AI assistant template | Strict high-contrast monochrome palette (`#000000`, `#FAFAFA`, neutral greys) |
| **Unconsidered 100px Rounded Pills Everywhere** | Clutters interface and looks juvenile | Deliberate small technical radii (`3px` for badges, `4px` for icons, `6px` for buttons/inputs) |
| **Frosted Glass / Blurry Backgrounds** | Degrades contrast and harms readability | Crisp solid surfaces and 1px hairline dividers (`--color-border-subtle`, `--color-border`) |
| **Fake Cards Everywhere** | Breaks document reading flow | Open canvas space and divider-led structural grouping |
| **Colored Status Chips & Glowing Dots** | Ambiguous for accessibility | Text-first status labels with stroke icons and monochrome contrast steps |
| **Dead Empty States** | "No data found." kills momentum | Typography-first empty state with one high-contrast black/white primary action |

---

## 2. Maniac's Core Design DNA

### Palette & Depth Architecture
- **Canonical Canvas**: `#000000` (pure dark canvas) / `#FFFFFF` (exact light mode inverse)
- **Surfaces**: `--color-surface-1` through `--color-surface-4` (`#000000`, `#050505`, `#0A0A0A`, `#111111`)
- **Text Hierarchy**: `--color-fg` (`#FAFAFA`), `--color-fg-secondary` (`#A1A1AA`), `--color-fg-tertiary` (`#71717A`), `--color-fg-muted` (`#52525B`)
- **Hairlines**: 1px solid `--color-border-subtle` (`#1A1A1A`) and `--color-border` (`#262626`)
- **Primary Action**: Strict black/white inversion (`--color-primary-bg: #FAFAFA`, `--color-primary-fg: #09090B`)

### Motion & Micro-Physics
```css
--duration-fast: 100ms;
--duration-normal: 160ms;
--duration-slow: 220ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
```
- Restrained transitions (100–160ms). No spring/bounce motion, perpetual ambient movement, or decorative glow filters.

---

## 3. UI Component Checklist

Before shipping any component or view, verify:

1. **Tokens Over Inline**: No hardcoded `style={{ backgroundColor: '...' }}` or arbitrary hex values. Always bind to CSS custom properties.
2. **Keyboard Focus**: Does every interactive trigger have a customized `:focus-visible` ring (2px `var(--color-border-focus)`)?
3. **Light/Dark Parity**: Test both dark and light modes. Ensure borders and text contrasts remain razor-sharp.
4. **Loading States**: If data is loading or decrypting, render a neutral `.skeleton` shimmer shape rather than blank canvas or generic spinners.
5. **Progressive Disclosure**: Keep default views clean and distraction-free. Reveal actions gracefully on hover or focus.

---

## 4. Execution Workflow

When implementing UI features:
1. Reference [src/index.css](file:///c:/CodeBase/Projects/maniac/src/index.css) design tokens.
2. Draft modular CSS classes adhering to Maniac's token hierarchy.
3. Test hover, active, focus, disabled, and responsive states.
4. Verify build with `npm run build` and `npm test`.
