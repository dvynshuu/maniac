# Modular Block Design Rule

When building or styling document editors, workspace blocks, database views, or note-taking interfaces:

1. **Document-First Canvas & Typography**:
   - Treat the workspace as an editorial document with a centered `720px` column (`960px` for wide mode).
   - Use clean typographic hierarchy: Document Title (36px–40px, bold), H1 (30px), H2 (24px), H3 (20px), Body (15–16px, 1.55 line height).

2. **10-Tone Muted Pastel Tints**:
   - Use 10 standard semantic colors (Default, Gray, Brown, Orange, Yellow, Green, Blue, Purple, Pink, Red).
   - Use 10%–15% opacity translucent background tints with delicate matching hairline borders (`rgba(255, 255, 255, 0.08)` dark / `rgba(55, 53, 47, 0.09)` light) for badges, callouts, and selection states. Never use harsh, saturated opaque cards.

3. **Progressive Disclosure & Affordances**:
   - Keep chrome distraction-free. Action triggers (6-dot drag handles `⋮⋮`, `+` insert buttons, block delete/duplicate actions) appear smoothly on row hover.
   - Support keyboard-driven workflows (`/` slash command menu, markdown auto-formatting `>` for toggles, `[]` for checkboxes, `---` for dividers).

4. **Detailed Skill Reference**:
   - For full design tokens, blueprints, and React component patterns, reference the skill at [.agents/skills/modular-block-design/SKILL.md](file:///c:/CodeBase/Projects/maniac/.agents/skills/modular-block-design/SKILL.md).
