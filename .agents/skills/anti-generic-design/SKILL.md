---
name: anti-generic-design
description: >-
  Enforces bespoke, high-craft, anti-generic UI/UX design standards for Maniac.
  Use this skill whenever designing, modifying, or refactoring user interfaces, CSS,
  layouts, interactions, animations, color schemes, or visual components in Maniac.
---

# Anti-Generic Design Skill & Manifesto (Maniac OS)

This skill provides design directives and concrete implementation patterns to ensure Maniac maintains a distinct, world-class, bespoke digital workspace feel and never falls into generic AI-generated SaaS clichés.

---

## 1. The Anti-Generic SaaS Hall of Shame (What to NEVER Build)

When developing UI in Maniac, strictly avoid these AI/SaaS clichés:

| Cliché | Why It's Bad | What to Do in Maniac Instead |
| :--- | :--- | :--- |
| **Flat Gray Cards with Generic Borders** | Looks like a bootstrap/tailwind starter template | Multi-layer glass elevation, subtle directional lighting (`--border-subtle`, `--bg-elevated`, backdrop blur) |
| **Monotonous Electric Purple Pills Everywhere** | Screams "generic AI assistant template" | Use Maniac's signature **Ember / Scar** accents (`--accent-scar`, `--accent-ember`) balanced with deep midnight void tones |
| **Lifeless Typography** | Default font rendering with standard tracking looks cheap | Tight tracking on headings (`letter-spacing: -0.03em`), geometric font hierarchy (Plus Jakarta Sans + JetBrains Mono) |
| **Jarring Pop-in / Hard Cuts** | Makes software feel robotic and abrupt | Smooth physics-based transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), shimmer skeletons, fade slides |
| **Dead Empty States** | "No data found." kills momentum and user delight | Actionable empty states with contextual icons, inspiring micro-copy, and instant creation triggers |
| **Static Buttons with Flat Colors** | Zero tactile feedback makes UI feel unresponsive | Micro-lift (`translateY(-1px)`), glow spread, responsive icon animations, and custom `:focus-visible` rings |

---

## 2. Maniac's Core Design DNA

### Palette & Depth Architecture
- **Primary Void**: `#050508` (deep cosmic black, not washed-out #1e1e1e)
- **Secondary Shell**: `#0A0A0F` (sidebar and structural backdrop)
- **Elevated Glass**: `#16161E` with `backdrop-filter: blur(24px) saturate(1.4)`
- **Accents**: 
  - *Scarlet Ember Gradient*: `linear-gradient(135deg, #f97316 0%, #ef4444 50%, #f43f5e 100%)`
  - *Indigo Primary*: `#3b82f6` with soft glow falloff
- **Borders**: Directional opacity (`rgba(255, 255, 255, 0.04)` to `rgba(255, 255, 255, 0.12)`)

### Motion & Micro-Physics
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-default: 250ms cubic-bezier(0.16, 1, 0.3, 1);
--transition-bounce: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
```
- Hover states must always feel **springy, responsive, and tactile**.
- Never animate width/height when opacity/transform can achieve the effect at 60fps.

---

## 3. UI Component Checklist

Before shipping any component or view, verify:

1. **Tokens Over Inline**: No hardcoded `style={{ backgroundColor: '...' }}` or arbitrary hex values. Always bind to CSS custom properties.
2. **Keyboard Focus**: Does every interactive trigger have a customized, beautiful `:focus-visible` ring?
3. **Light/Dark Parity**: Test both dark and light modes. Ensure borders and text contrasts remain razor-sharp.
4. **Loading States**: If data is loading or decrypting, render a `.skeleton` shimmer shape rather than blank canvas or generic spinners.
5. **Progressive Disclosure**: Keep default views clean and distraction-free. Reveal power controls and actions gracefully on hover or focus.

---

## 4. Execution Workflow

When implementing UI features:
1. Reference [src/index.css](file:///c:/CodeBase/Projects/maniac/src/index.css) design tokens.
2. Draft modular CSS classes adhering to Maniac's token hierarchy.
3. Test hover, active, focus, disabled, and responsive states.
4. Verify build with `npm run build`.
