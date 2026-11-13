# MANIAC — Product Design System

> **Canonical visual specification for Maniac.**  
> Version: 1.0 · Direction: Vercel-inspired monochrome · Scope: marketing site + workspace app

Maniac is a local-first knowledge workspace: a calm, precise environment for writing, organizing, connecting, and retrieving ideas. The interface should feel like a well-made instrument—quiet until needed, fast in use, and visually consistent across every surface.

This document is the source of truth for all future UI design and implementation. When this document conflicts with older visual guidance, follow this document. The modular-editor principles in `.agents/skills/modular-block-design/SKILL.md` remain useful for document flow, keyboard interaction, progressive disclosure, and block behavior; its pastel color system and visual examples are superseded here.

---

## 1. Brand direction

### 1.1 The visual idea

**Vercel-inspired, not Vercel-copied.** Use the restraint of a black-and-white developer product: pure monochrome surfaces, crisp typography, 1px hairline borders, clear geometry, and almost no decoration. Maniac must retain its own product character through its information architecture, document canvas, keyboard-first behavior, and local-first identity—not through gradients, glow, or ornamental chrome.

The interface should communicate:

- **Clarity:** content is the visual priority; application chrome stays quiet.
- **Precision:** aligned edges, consistent spacing, crisp borders, predictable controls.
- **Ownership:** no visual dependence on a network connection, theme service, or remote effect.
- **Speed:** immediate interaction, restrained motion, no expensive visual effects.
- **Depth through structure:** use spacing, typography, border contrast, and hierarchy—not color or shadows.

### 1.2 Non-negotiable visual rules

1. The product UI is **strictly monochrome**: black, white, and neutral greys only.
2. Dark mode is the default visual identity. Light mode and system preference may remain, but they must be the exact monochrome inverse—not a separate color theme.
3. Borders are predominantly **1px hairlines**. Prefer separators and outlined surfaces over stacked cards.
4. The primary action is a high-contrast black/white inversion. Never use blue, purple, orange, red, green, gradients, or a colored glow as a brand accent.
5. No glassmorphism, frosted panels, blur layers, neon effects, aurora gradients, colored shadows, or ambient glows.
6. No arbitrary rounded-pill controls. Use small, deliberate corner radii; reserve fully circular shapes for avatars and circular icon controls.
7. Never make every section a card. Use open canvas space and divider-led grouping.
8. Do not redesign or weaken functionality to achieve a visual result. Preserve the editor, keyboard workflows, local-first behavior, data model, accessibility, and performance.

### 1.3 What may retain color

The monochrome rule applies to **Maniac's interface**, not to the user's information. User-uploaded images, embedded media, profile photos, and externally sourced document content remain in their original colors. They must not be recolored, desaturated, or modified as part of a theme change.

Emoji and icons selected by a user may remain as content. Default product icons, decorative illustrations, graph nodes, controls, system states, and application-owned badges must use the monochrome system.

---

## 2. Color system

Use semantic tokens everywhere. Do not scatter raw hex values or RGBA values through component styles.

### 2.1 Dark theme — default

| Token | Value | Usage |
|---|---:|---|
| `--color-bg` | `#000000` | Main app and document canvas |
| `--color-surface-1` | `#000000` | Primary surface; avoid unnecessary surface separation |
| `--color-surface-2` | `#050505` | Sidebar, quiet structural areas |
| `--color-surface-3` | `#0A0A0A` | Hovered rows, secondary panels |
| `--color-surface-4` | `#111111` | Inputs, selected rows, compact controls |
| `--color-surface-popover` | `#090909` | Menus, command palette, popovers |
| `--color-overlay` | `rgba(0, 0, 0, 0.72)` | Modal backdrop |
| `--color-fg` | `#FAFAFA` | Primary text and icons |
| `--color-fg-secondary` | `#A1A1AA` | Supporting text |
| `--color-fg-tertiary` | `#71717A` | Metadata, placeholders, quiet icons |
| `--color-fg-muted` | `#52525B` | Disabled and lowest-priority text |
| `--color-border-subtle` | `#1A1A1A` | Hairline separators and low-emphasis edges |
| `--color-border` | `#262626` | Standard control and panel borders |
| `--color-border-strong` | `#3F3F46` | Hover, selected, and emphasized borders |
| `--color-border-focus` | `#A1A1AA` | Keyboard focus outline |
| `--color-selection` | `rgba(255, 255, 255, 0.16)` | Text selection and subtle selection fill |

### 2.2 Light theme — monochrome inverse

| Token | Value | Usage |
|---|---:|---|
| `--color-bg` | `#FFFFFF` | Main app and document canvas |
| `--color-surface-1` | `#FFFFFF` | Primary surface |
| `--color-surface-2` | `#FAFAFA` | Sidebar and quiet structural areas |
| `--color-surface-3` | `#F4F4F5` | Hovered rows and secondary panels |
| `--color-surface-4` | `#EEEEF0` | Inputs and selected rows |
| `--color-surface-popover` | `#FFFFFF` | Menus, command palette, popovers |
| `--color-overlay` | `rgba(0, 0, 0, 0.32)` | Modal backdrop |
| `--color-fg` | `#09090B` | Primary text and icons |
| `--color-fg-secondary` | `#52525B` | Supporting text |
| `--color-fg-tertiary` | `#71717A` | Metadata and placeholders |
| `--color-fg-muted` | `#A1A1AA` | Disabled and lowest-priority text |
| `--color-border-subtle` | `#F0F0F0` | Low-emphasis separators |
| `--color-border` | `#E4E4E7` | Standard control and panel borders |
| `--color-border-strong` | `#A1A1AA` | Hover, selected, and emphasized borders |
| `--color-border-focus` | `#27272A` | Keyboard focus outline |
| `--color-selection` | `rgba(9, 9, 11, 0.10)` | Text selection and subtle selection fill |

### 2.3 Token implementation

Use this as the target token architecture in `src/index.css`. Exact names may be adapted to existing selectors, but keep a single semantic source of truth.

```css
:root {
  color-scheme: dark;

  --color-bg: #000000;
  --color-surface-1: #000000;
  --color-surface-2: #050505;
  --color-surface-3: #0A0A0A;
  --color-surface-4: #111111;
  --color-surface-popover: #090909;
  --color-overlay: rgba(0, 0, 0, 0.72);

  --color-fg: #FAFAFA;
  --color-fg-secondary: #A1A1AA;
  --color-fg-tertiary: #71717A;
  --color-fg-muted: #52525B;

  --color-border-subtle: #1A1A1A;
  --color-border: #262626;
  --color-border-strong: #3F3F46;
  --color-border-focus: #A1A1AA;
  --color-selection: rgba(255, 255, 255, 0.16);

  --color-primary-bg: #FAFAFA;
  --color-primary-fg: #09090B;
  --color-primary-bg-hover: #E4E4E7;
  --color-secondary-bg: transparent;
  --color-secondary-fg: #FAFAFA;

  --font-sans: "Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace;

  --text-2xs: 0.6875rem;
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-md: 0.9375rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-display: clamp(2.5rem, 6vw, 4.5rem);

  --leading-tight: 1.15;
  --leading-heading: 1.25;
  --leading-normal: 1.5;
  --leading-reading: 1.7;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;
  --radius-full: 9999px;

  --border-width: 1px;
  --shadow-popover: 0 8px 32px rgba(0, 0, 0, 0.42);
  --shadow-modal: 0 16px 64px rgba(0, 0, 0, 0.55);

  --duration-fast: 100ms;
  --duration-normal: 160ms;
  --duration-slow: 220ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  --sidebar-width: 248px;
  --editor-width: 720px;
  --editor-width-wide: 960px;
  --content-width: 1200px;
}

:root[data-theme="light"] {
  color-scheme: light;

  --color-bg: #FFFFFF;
  --color-surface-1: #FFFFFF;
  --color-surface-2: #FAFAFA;
  --color-surface-3: #F4F4F5;
  --color-surface-4: #EEEEF0;
  --color-surface-popover: #FFFFFF;
  --color-overlay: rgba(0, 0, 0, 0.32);

  --color-fg: #09090B;
  --color-fg-secondary: #52525B;
  --color-fg-tertiary: #71717A;
  --color-fg-muted: #A1A1AA;

  --color-border-subtle: #F0F0F0;
  --color-border: #E4E4E7;
  --color-border-strong: #A1A1AA;
  --color-border-focus: #27272A;
  --color-selection: rgba(9, 9, 11, 0.10);

  --color-primary-bg: #09090B;
  --color-primary-fg: #FFFFFF;
  --color-primary-bg-hover: #27272A;
  --color-secondary-bg: transparent;
  --color-secondary-fg: #09090B;

  --shadow-popover: 0 8px 28px rgba(0, 0, 0, 0.10);
  --shadow-modal: 0 16px 48px rgba(0, 0, 0, 0.16);
}
```

Implementation notes:

- Keep the existing persisted `dark | light | system` preference if desired. Both explicit themes must use only the tokens above.
- Remove the user-selectable accent color from the Appearance UI. Keep any legacy `accentColor` value in persisted settings temporarily if removing it would break older settings payloads; do not apply it to the interface.
- Remove or migrate all component references to legacy `--accent-*`, `--success`, `--warning`, `--error`, `--info`, and colored block tint tokens. Do not alias old colorful tokens to arbitrary new colors and leave the old system half-alive.
- The primary button must use `--color-primary-bg` and `--color-primary-fg`; it must not rely on a hard-coded white foreground that becomes unreadable in light mode.
- A 1px border is the default. Use `--color-border-subtle` for dividers, `--color-border` for controls, and `--color-border-strong` for hover/selected emphasis.

---

## 3. Typography

### 3.1 Typeface

- **UI and prose:** Geist Sans, with Inter and the platform sans-serif stack as fallbacks.
- **Code, keyboard shortcuts, technical metadata:** Geist Mono, with JetBrains Mono and platform monospace fallbacks.
- Prefer self-hosted/bundled font assets so the local-first workspace does not depend on Google Fonts being reachable at runtime. Do not introduce a network-only font dependency.
- Do not use Plus Jakarta Sans as a second competing brand face. Keep typography to one sans family and one mono family.

### 3.2 Hierarchy

| Role | Size | Weight | Line height | Notes |
|---|---:|---:|---:|---|
| Marketing display | `clamp(40px, 6vw, 72px)` | 600–650 | 1.02–1.08 | Tight tracking; short line lengths |
| Page title | 36px | 600 | 1.15 | Main editor title |
| H1 | 30px | 600 | 1.2 | Document heading |
| H2 | 24px | 600 | 1.25 | Section heading |
| H3 | 20px | 600 | 1.3 | Subsection heading |
| Body / editor | 15–16px | 400 | 1.65–1.75 | Comfortable long-form reading |
| UI body | 13–14px | 400–500 | 1.45–1.5 | Sidebar, controls, menus |
| Metadata | 11–12px | 400–500 | 1.4 | Date, count, helper text |
| Code | 12.5–13.5px | 400 | 1.6 | No syntax theme colors; use neutral contrast |

### 3.3 Typography rules

- Use negative tracking only for large headings: approximately `-0.035em` for display, `-0.025em` for page titles, and `-0.01em` for compact UI labels.
- Do not use ultra-bold 800/900 weights as a default. Most interface text should be 400–500; headings 550–650.
- Use tabular numerals for dates, counts, storage metrics, durations, and table values.
- Avoid all-caps labels except tiny, low-emphasis section labels. Use letter spacing around `0.08em` when all caps is genuinely helpful.
- Do not shrink important controls below 12px. Do not use low-contrast grey for readable body copy.

---

## 4. Geometry, spacing, and borders

### 4.1 Spacing

Use a 4px base scale. Prefer 8, 12, 16, 24, 32, 40, 48, and 64px. Avoid one-off spacing values unless the geometry of a specific editor control requires them.

- Control internal padding: 8–12px.
- Related control gap: 6–8px.
- Form row gap: 16–20px.
- Section gap: 24–32px.
- Major page-section gap: 40–64px.
- Sidebar horizontal inset: 12–16px.
- Editor canvas side padding: 24–40px desktop; 16px mobile.

### 4.2 Radii

Use small radii to preserve the precise, technical feel:

- `3px`: tiny labels and compact keyboard hints.
- `4px`: small icon buttons and dense controls.
- `6px`: inputs, buttons, menu items, tabs.
- `8px`: popovers, panels, small cards that truly need a container.
- `10px`: dialogs and large floating surfaces.
- `9999px`: avatars and intentionally circular indicators only.

Do not use 14–24px radii for routine interface panels. Avoid pills for navigation, filters, status, and toolbar actions.

### 4.3 Hairline border doctrine

- Use `1px solid var(--color-border-subtle)` for region separators, table rules, sidebars, and quiet containers.
- Use `1px solid var(--color-border)` for inputs, buttons, outlined panels, menu boundaries, and selected controls.
- Use `1px solid var(--color-border-strong)` for hover and active emphasis.
- Do not outline every nested group. Borders should explain structure, not decorate it.
- Avoid double borders where adjacent elements meet. Use a single shared divider or `border-collapse`-style composition.
- Do not fake hairlines with shadows, gradients, inset highlights, or semi-transparent glows.
- Do not use thick colored left rails for active pages. Use monochrome background contrast, font weight, and a subtle neutral border.

### 4.4 Elevation

The hierarchy is primarily **flat**. A modal or menu may use a restrained neutral shadow to separate it from the canvas. Cards, dashboard tiles, buttons, and editor blocks should not have permanent drop shadows.

Avoid:

- Inset metallic highlights.
- Multi-layer black shadows on every control.
- Colored shadows or glow rings.
- Frosted-glass blur and large backdrop filters.
- Gradient panel backgrounds.

---

## 5. Core layout system

### 5.1 Workspace shell

The private workspace is a two-region application shell:

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│ Sidebar              │ Main workspace                               │
│ 248px                │ flexible                                     │
│                      │                                              │
│ Brand / workspace    │ Context bar / breadcrumbs / page actions    │
│ Search               ├──────────────────────────────────────────────┤
│ Navigation           │                                              │
│ Nested pages         │ Document canvas / dashboard / database       │
│                      │                                              │
│ Settings / profile   │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
```

- Sidebar width: 248px desktop; collapsed state remains fully supported.
- Main area takes the remaining viewport and owns its own scroll container.
- Avoid a permanent heavy top bar. Keep context controls in a compact 44–48px row when needed.
- Sidebar and main content meet at one 1px divider; they should not look like two floating cards.
- Use the same background for the root canvas and editor body. Separate areas only when necessary with a border or a slight neutral surface step.
- Maintain stable scroll behavior. Do not introduce nested scroll containers unless the component already requires them.

### 5.2 Sidebar

- Brand row at the top: monochrome Maniac mark and wordmark, no colored tile or gradient logo background.
- Search is a quiet outlined field/button with a visible shortcut hint.
- Section labels are small, muted, and restrained; avoid decorative uppercase headings everywhere.
- Navigation rows are compact, approximately 30–34px high, with 6px radius at most.
- Active row: `--color-surface-3` background, primary text, and optionally a 1px neutral border. No colored active rail.
- Nested pages use indentation and a subtle vertical hairline. Tree lines must not dominate the content.
- Page actions and drag affordances appear on hover, keyboard focus, or touch-mode disclosure.
- Sidebar footer has one top hairline and compact settings/profile actions.

### 5.3 Context bar and breadcrumbs

- Height: 44–48px.
- Use 12–13px muted text for ancestors and primary text for the current page.
- Icons are 14–16px, stroke-based, and monochrome.
- Keep actions right-aligned with 6–8px gaps. Use icon-only controls only with accessible labels/tooltips.
- Avoid decorative segmented trays. Tabs should be text-first with subtle background or underline state.

### 5.4 Editor canvas

- Standard reading width: 720px maximum.
- Wide mode: 960px maximum.
- Canvas must remain centered and visually quiet.
- Page title begins around 36px; document content begins with enough whitespace to establish a clear reading rhythm.
- Page icon, description, cover, breadcrumbs, backlinks, and metadata remain subordinate to the title and document.
- Covers are optional content, not a required hero treatment. The editor must still look complete with no cover image.
- Do not render a card behind the document body. The canvas is the surface.

### 5.5 Dashboard

- Keep the dashboard editorial and data-led, not a control-room or cyber-terminal dashboard.
- Use a clear page heading, one short supporting line, and a small number of meaningful information groups.
- Recent pages, pinned pages, activity, and system metrics should be organized with whitespace and divider-led sections.
- Use a card only when it groups a genuinely independent action or dataset. Cards use neutral backgrounds, 1px borders, and no permanent shadow.
- Avoid decorative charts, fake metrics, oversized icon tiles, and ornamental labels.

---

## 6. Component specifications

### 6.1 Buttons

**Primary button**

- Dark theme: near-white fill with near-black text.
- Light theme: near-black fill with white text.
- Height: 34–36px for standard controls; 40px for prominent marketing actions.
- Horizontal padding: 12–16px.
- Radius: 6px.
- Border: 1px solid transparent or a subtle neutral outline where needed.
- Weight: 500–600.
- Hover: slight neutral contrast shift only; no glow, gradient, or large lift.
- Active: reduce brightness or shift one surface step; do not use a springy bounce.

**Secondary button**

- Transparent or same-surface background.
- 1px border using `--color-border`.
- Text uses primary foreground.
- Hover uses the next neutral surface and `--color-border-strong`.

**Ghost / icon button**

- Transparent with no permanent border unless it belongs to a toolbar group.
- Hover reveals a subtle neutral surface.
- Minimum interactive target: 32px square; aim for 36px on touch layouts.
- Every icon-only button requires an accessible name.

Destructive actions remain monochrome. Convey danger through explicit wording, confirmation, and placement—not a red button.

### 6.2 Inputs and selects

- Standard height: 36–40px.
- Background: `--color-surface-1` or `--color-surface-2`.
- Border: 1px `--color-border`.
- Radius: 6px.
- Placeholder: `--color-fg-tertiary`, never the same contrast as disabled text.
- Focus: 1px `--color-border-focus` plus a visible 2px outer focus ring where required. Do not use a colored ring.
- Error state: neutral stronger border + adjacent error text + icon; never red.
- Disabled state: muted foreground, lower contrast, and a disabled cursor; retain legibility.
- Avoid oversized rounded search fields and filled input panels unless the component is a search surface by design.

### 6.3 Tabs and segmented controls

- Prefer a simple text tab row with 1px underline or a neutral active background.
- Use 12–14px labels with compact spacing.
- Active text is primary; inactive text is secondary.
- Do not color the active icon or use blue/orange active indicators.
- Do not use inset shadows or metallic segmented trays.

### 6.4 Menus, popovers, and tooltips

- Surface: `--color-surface-popover`.
- Border: 1px `--color-border`.
- Radius: 8px.
- Shadow: `--shadow-popover` only when needed to distinguish from adjacent content.
- Menu row height: 32–36px with 8–10px horizontal padding.
- Hover/active row: `--color-surface-3`.
- Dividers: 1px `--color-border-subtle` with clear spacing.
- Keyboard hints use the mono font, 11px, neutral border, and compact padding.
- Tooltips are small, monochrome, and delayed only enough to avoid flicker.

### 6.5 Modals and dialogs

- Overlay uses `--color-overlay`; no blur on the page behind it.
- Dialog surface uses `--color-surface-popover`, 1px border, 10px radius, and `--shadow-modal`.
- Header and footer are separated with hairlines; body remains open and scrollable.
- Keep the title and one-line description clear. Do not use large colored icon tiles.
- Destructive confirmation must clearly state what will be deleted or changed.
- Dialogs must support Escape, focus trapping, return focus, and small-screen full-width behavior.

### 6.6 Badges, tags, and status labels

- Use monochrome labels with border and/or neutral background; no colored chips.
- Keep them rectangular or lightly rounded (3–4px), not capsule pills.
- Metadata such as counts and dates should remain quiet.
- Status must include a readable word or icon; never rely on shade alone.
- Success, warning, error, and informational states all remain grayscale. Use icon shape, label, and message to differentiate meaning.

### 6.7 Toasts and notifications

- Neutral surface, 1px border, 6–8px radius.
- Use a concise title and optional supporting detail.
- Status icon is monochrome.
- Do not use colored left stripes, red/green backgrounds, or colorful progress bars.
- Notifications should not obscure essential editor controls.

### 6.8 Loading, empty, and error states

**Loading**

- Use static or softly animated monochrome skeletons (`#111111` to `#1A1A1A` in dark mode; neutral inverse in light mode).
- Keep skeleton geometry close to the final content. Do not use a bright moving shimmer.
- Use a small neutral spinner only when layout-specific skeletons are not possible.
- Never block the entire workspace with a branded loading animation for routine local reads.

**Empty**

- State what is empty, why it matters, and the next useful action.
- Use simple typography and one clear primary action.
- Avoid oversized illustrations, colorful empty-state art, or generic motivational copy.

**Error**

- State what failed in plain language, whether user data is safe, and what action is available.
- Provide retry or recovery controls where appropriate.
- Keep the presentation monochrome; do not hide errors behind low-contrast text.

### 6.9 Icons

- Use Lucide React consistently.
- Default stroke width: 1.75–2px; size 14–18px in controls, 20–24px for empty-state or feature context.
- Use `currentColor`; do not hard-code icon colors.
- Avoid mixing filled icon families, emoji, and outline icons in application chrome.
- User-selected emoji are content and may remain as selected.

---

## 7. Maniac-specific product surfaces

### 7.1 Block editor

The editor is the primary product surface. Its visual language must prioritize the writing experience over editor chrome.

- Keep the document canvas open and centered; no enclosing card.
- Paragraphs use 15–16px body text and 1.65–1.75 line height.
- Heading margins create hierarchy without excessive empty space.
- Block boundaries are invisible at rest. Drag handles, insert controls, and block menus appear on hover, keyboard focus, or active selection.
- The drag handle uses a neutral icon and remains easy to discover without permanently occupying the writing column.
- Active block selection uses a subtle neutral background or 1px border; never a blue outline.
- Slash command menus use the shared popover system, clear category labels, keyboard navigation, and a visible active row.
- Preserve Markdown shortcuts, slash commands, multi-select, drag-and-drop, nesting, and editor transaction behavior.
- Keep block spacing consistent. Avoid card-like styling for every callout, toggle, paragraph, or heading.

**Block treatments**

| Block type | Visual treatment |
|---|---|
| Paragraph | No border or background; document typography only |
| Heading | Typography and spacing create hierarchy |
| Bulleted / numbered list | Neutral markers and consistent indentation |
| Checklist | Monochrome checkbox with clear checked state; completed text may be muted but remains readable |
| Toggle | Small disclosure chevron; child content offset with a subtle hairline |
| Quote | 2px neutral left rule, no tinted background by default |
| Callout | Neutral surface and 1px border; monochrome icon; no color family |
| Code block | `#090909`-style neutral inset surface, 1px border, mono type; syntax highlighting must be grayscale |
| Divider | One 1px hairline with generous vertical rhythm |
| Image / embed | Content-first; preserve original media colors and aspect ratio |
| Table / database | Thin neutral grid lines; no colorful column headers or cell tints |
| Math | Neutral canvas and accessible contrast; preserve KaTeX rendering |

### 7.2 Rich text color and highlight controls

- The product UI must not expose colorful text palettes as part of the default Maniac theme.
- If color metadata already exists in saved documents, do not delete or rewrite it during the visual migration.
- Render legacy semantic colors as a small set of neutral treatments (primary, secondary, muted, underline, highlight background) until a future content-format migration is explicitly designed.
- Highlight fill uses a low-opacity neutral surface; text remains high contrast.
- Preserve imported Notion formatting in the data layer. The UI can normalize presentation without mutating source records.

### 7.3 Database views

- Table view is a clean spreadsheet-like surface with 1px horizontal and vertical hairlines.
- Avoid a heavy outer box and avoid thick cell borders. Use a slightly stronger border for the header row and row hover.
- Column headers use 11–12px medium text, neutral iconography, and compact controls.
- Selected rows use a neutral background; selection checkboxes are black/white.
- Board columns are separated by hairlines; cards use one thin border and no permanent shadow.
- Gallery cards must not become colorful tiles. Image content retains its color; card metadata remains neutral.
- Select, multi-select, status, and priority properties use monochrome labels and shapes. Keep the underlying values unchanged.
- Menus, property editors, date pickers, and cell editors follow the shared input and popover patterns.

### 7.4 Trackers and calendar

- Tables and daily grids use a neutral surface, 1px rules, and typography-first hierarchy.
- Completion state uses a checkmark, filled neutral dot, or border contrast—not green.
- Heatmaps use 4–5 neutral luminance steps. Do not use the red-to-green scale.
- Calendar today state uses a monochrome outline or small black/white marker.
- Recurring, due, and overdue states use text + icon + shape, never hue.

### 7.5 Knowledge graph

- Nodes use neutral fills or outlines. Use luminance and size to communicate importance.
- Edges use thin neutral lines; selected edges/nodes increase contrast, not color.
- Hover and focus states must remain distinguishable in both themes.
- Labels use primary/secondary text based on hierarchy.
- Keep the graph background flat. Do not add colored clusters, animated particles, gradients, or glowing nodes.

### 7.6 Search and command palette

- Search should feel instant and central, with a clear input, compact result rows, and visible keyboard navigation.
- Use section labels to distinguish pages, blocks, and commands.
- Result title is primary; snippet and path are secondary.
- Matched text uses bold or a neutral selection fill—not a bright highlight color.
- Selected result row uses `--color-surface-3` and a stronger hairline.
- Keep `Cmd/Ctrl + K` visible as a compact keyboard hint.

### 7.7 Settings and security surfaces

- Settings should be organized as a compact left navigation and a readable content panel.
- Remove accent-color selection from the UI. Appearance should expose only Dark, Light, or System if theme switching is retained, plus supported font size, reduced motion, and relevant accessibility preferences.
- Keep the local-first and encryption indicators factual and neutral. Avoid green "secure" badges or decorative lock glows.
- Preserve all security, backup, restore, import, export, and encryption flows.

---

## 8. Marketing and public pages

The same visual system applies to all public routes: `/`, `/notion-alternative`, `/obsidian-alternative`, `/active-recall-notes`, `/templates`, `/templates/:slug`, `/share`, and the 404 experience.

- Use a black or white canvas, monochrome type, and hairline separators.
- Marketing hero: one clear headline, one restrained supporting paragraph, one primary action, one secondary action. Keep the content readable and avoid visual clutter.
- Prefer product screenshots, real UI previews, and clear diagrams over abstract gradients or glowing orbs.
- Navigation is compact and uses a 1px bottom divider. A lightly translucent sticky header may be used only if it does not require blur; a near-opaque neutral surface is preferred.
- Primary CTA follows the same black/white inversion as the app.
- Feature sections use whitespace, numbered labels, and dividers. Do not create a grid of identical colored cards.
- Comparison tables use neutral row dividers and restrained emphasis.
- Template previews may show the user's document content, including its imagery, but application chrome remains monochrome.
- Keep SEO copy, semantic HTML, metadata, and routes intact. The rebrand is not permission to remove content or simplify search landing pages into a single page.
- Update static HTML/prerender fallbacks and `public/404.html` so first paint has the same theme and does not flash an outdated orange/blue theme.

---

## 9. Motion and interaction

Maniac should feel responsive, not animated for animation's sake.

- Standard hover/focus transition: 100–160ms.
- Menus and popovers: 140–180ms opacity/transform, with no large travel distance.
- Modal entry/exit: 160–220ms subtle opacity and 4–8px translation.
- Avoid spring/bounce motion, perpetual ambient movement, animated gradients, and decorative particle systems.
- Hover should primarily change text contrast, neutral surface, and border contrast.
- Pressed controls may shift by 1px or change surface contrast; no dramatic button lift.
- Dragging feedback should be clear and stable: outline the drop target, use a neutral insertion line, and avoid glowing shadows.
- Respect `prefers-reduced-motion` and the existing user reduced-motion preference. Motion must never be required to understand a state.

### Focus and keyboard behavior

- Every interactive element must have a visible `:focus-visible` treatment.
- Use a 2px outline in the theme's focus color with a small offset; never use the browser-default colored blue ring.
- Maintain keyboard operation for menus, dialogs, tabs, editors, database cells, and drag/drop alternatives.
- Hover-only actions must also become visible on keyboard focus and remain accessible on touch devices.
- Preserve established shortcuts and do not introduce conflicting global key bindings.

---

## 10. Accessibility and responsive behavior

### 10.1 Accessibility

- Target WCAG 2.2 AA contrast for all meaningful text and controls.
- Primary body text must not rely on `--color-fg-tertiary` or `--color-fg-muted`.
- Do not communicate selected, success, warning, error, or disabled state by color alone.
- Keep touch targets at least 32px, with 36–44px preferred for frequent mobile actions.
- Provide accessible labels for icon-only actions, dialogs, tooltips, and custom inputs.
- Preserve semantic headings, landmarks, labels, table headers, and focus order.
- Check both dark and light modes for contrast and focus visibility.

### 10.2 Responsive behavior

- **Above 1200px:** full sidebar + centered 720px editor or 960px wide mode.
- **768–1200px:** retain the two-region layout where it fits; reduce outer padding and use wide editor width carefully.
- **Below 768px:** sidebar becomes an overlay/drawer; editor uses full width with 16px side padding; dialogs become near-full-screen; toolbars wrap or move into overflow menus.
- Database tables may scroll horizontally, but the page itself should not overflow horizontally.
- Ensure the command palette, context menus, date picker, and editor selection toolbar remain within the viewport.
- Do not hide essential commands on mobile; make them discoverable through a clearly named overflow control.

---

## 11. Implementation contract for this repository

### 11.1 Project architecture to preserve

Maniac currently uses React 19 + Vite + TypeScript, vanilla CSS, Zustand, Dexie/IndexedDB, TipTap, React Router, Lucide React, and custom editor/core services. The rebrand is a styling and interaction-consistency effort—not a framework migration.

Preserve:

- IndexedDB/Dexie persistence and local-first operation.
- Zustand stores and existing state transitions.
- Block schema, editor engine, command bus, transaction and normalization behavior.
- TipTap extensions, slash commands, drag-and-drop, virtualization, and nested pages.
- Database, tracker, graph, calendar, active-recall, archive, import/export, backup, and security functionality.
- Current routing, public SEO pages, prerendering, metadata, and service worker behavior.
- Existing saved page data, legacy color metadata, and user-provided assets.

Do not replace working components with static mockups. Do not make UI-only changes that accidentally reset persisted user settings or alter stored content.

### 11.2 Primary implementation surfaces

| Area | Files to audit and update |
|---|---|
| Global tokens, typography, controls, layout | `src/index.css` |
| Theme application | `src/components/Layout/WorkspaceApp.tsx`, `src/stores/settingsStore.ts` |
| Main app shell | `src/components/Layout/AppLayout.tsx`, `src/components/Layout/Sidebar.tsx`, `src/components/Layout/SidebarPageItem.tsx`, `src/components/Layout/Breadcrumb.tsx` |
| Editor | `src/components/Editor/PageEditor.tsx`, `src/components/Editor/BlockRenderer.tsx`, `src/components/Editor/SlashMenu.tsx`, `src/components/Editor/SelectionToolbar.tsx`, `src/components/Editor/PageOptionsMenu.tsx`, `src/components/Editor/BacklinksPanel.tsx`, `src/components/Editor/ActiveRecallPanel.tsx` |
| Dashboard and graph | `src/components/Dashboard/Dashboard.tsx`, `src/components/Dashboard/Dashboard.css`, `src/components/Dashboard/GraphView.tsx`, popovers and dashboard modals |
| Databases | `src/components/Database/*` and related selectors in `src/index.css` |
| Trackers | `src/components/Tracker/*` and related selectors in `src/index.css` |
| Settings and dialogs | `src/components/Settings/*`, `src/components/Common/Modal.tsx`, `src/components/Common/ContextMenu.tsx`, `src/components/Common/ToastContainer.tsx` |
| Command palette | `src/components/CommandPalette/CommandPalette.tsx` and related selectors |
| Public pages | `src/pages/*.tsx`, `src/pages/*.css`, `src/notionStyles.css`, `src/notionImport.css` |
| First paint and fallbacks | `index.html`, `public/404.html`, relevant prerender markup in `scripts/prerender.js` |

`src/index.css` is extensive and contains legacy selectors. Audit the full file rather than only the token section. Search for raw color values, gradients, accent token names, colored heatmap/cell classes, and theme-specific overrides.

### 11.3 Required migration sequence

1. **Inventory:** capture the existing screens and list legacy color values, gradients, shadows, blur, radii, and theme overrides. Do not edit data or stores during the inventory.
2. **Token foundation:** introduce the monochrome semantic tokens in `src/index.css`; verify dark and light inversions before migrating individual components.
3. **Theme plumbing:** remove the dynamic accent-color application from `WorkspaceApp.tsx`; remove the accent picker from Settings while preserving old persisted settings safely.
4. **Global primitives:** migrate buttons, inputs, selects, tabs, menus, popovers, dialogs, tooltips, badges, skeletons, and focus rings.
5. **App chrome:** migrate sidebar, breadcrumbs, context bar, dashboard, settings, and command palette.
6. **Core content:** migrate editor blocks, selection/drag states, databases, trackers, graph, calendar, and active-recall views.
7. **Public surfaces:** migrate the landing page, comparison pages, templates, shared preview, 404, and static/prerender fallbacks.
8. **Legacy color normalization:** make imported/user-authored semantic tints render neutrally without rewriting their stored values.
9. **Responsive and accessibility pass:** test desktop, tablet, mobile, keyboard-only, reduced-motion, and both themes.
10. **Regression verification:** run production build, typecheck, and tests; compare core workflows before/after the visual migration.

### 11.4 Repository-wide color audit

During implementation, search for and remove or neutralize:

- `--accent-primary`, `--accent-secondary`, `--accent-tertiary`, `--accent-ember`, `--accent-scar`, `--accent-gradient`.
- `--success`, `--warning`, `--error`, `--info` and their colored tint variants.
- `block-color-*`, `block-bg-tint-*`, `.callout-tint-*`, `.cell-bg-*`, and colored heatmap classes.
- Hard-coded blue, indigo, purple, orange, red, green, pink, and yellow values in CSS/JSX.
- Linear/radial gradients used as UI decoration or branded accents.
- Colored icon styles, colored status dots, colored active rails, and accent-color inline styles.
- Old theme colors in `index.html`, prerendered markup, and `public/404.html`.

Do not blindly replace every color in the repository. User-uploaded media, brand-independent content images, syntax content, and third-party document content require contextual review. All **application-owned UI chrome** must be monochrome.

### 11.5 Code quality rules

- Use semantic CSS variables; do not add new hard-coded colors to JSX or component CSS.
- Keep global tokens in `src/index.css`; keep component layout rules in the component's existing stylesheet.
- Do not add inline styles for visual values when a reusable class/token is appropriate.
- Avoid `!important` as a shortcut. Resolve specificity and remove obsolete rules instead.
- Remove dead CSS and obsolete accent classes after all consumers have migrated.
- Do not introduce Tailwind, a component library, or a new styling runtime for this rebrand.
- Keep the current vanilla CSS approach and reuse existing React components.
- Avoid broad rewrites of the 10k-line global stylesheet without a component-level regression plan.

---

## 12. Quality gates and acceptance criteria

The rebrand is complete only when all of the following are true:

### Visual consistency

- [ ] Dark theme is genuinely black/white/grey, not blue-black with colored accents.
- [ ] Light theme is a clean monochrome inverse.
- [ ] Every application-owned button, icon, status, badge, graph, table state, tracker, and editor affordance is monochrome.
- [ ] Hairline borders are consistent and do not double up between adjacent surfaces.
- [ ] No unnecessary card stacks, gradient surfaces, glassmorphism, neon, or colored glows remain.
- [ ] Typography and spacing feel consistent across editor, dashboard, settings, dialogs, and public pages.
- [ ] No white-on-white or black-on-black button states occur in either theme.

### Functional integrity

- [ ] Create, rename, move, nest, archive, restore, and delete pages.
- [ ] Write, format, select, move, nest, and delete editor blocks.
- [ ] Slash menu, Markdown shortcuts, command palette, keyboard navigation, and drag/drop still work.
- [ ] Database views, property editing, filtering/sorting, and cell interactions still work.
- [ ] Trackers, calendar, heatmap, graph, active recall, and archives still work.
- [ ] Settings, theme switching, import/export, backup/restore, lock/unlock, and encryption flows still work.
- [ ] Local-first functionality works offline; no visual asset or font is required from a remote server at runtime.
- [ ] Existing user content, saved color metadata, and uploaded images remain intact.

### Technical verification

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes, including prerendering.
- [ ] No console errors or React key/accessibility warnings are introduced.
- [ ] No horizontal overflow on common desktop, tablet, and mobile widths.
- [ ] Reduced-motion preference is respected.
- [ ] Focus remains visible in both themes.

---

## 13. The final visual test

Before approving any screen, ask:

1. Is the user's content more visually important than the interface around it?
2. Could this section lose a card, shadow, icon tile, or border without losing clarity?
3. Is every visible color either neutral UI chrome or actual user content?
4. Does the hierarchy still work if the screen is viewed in grayscale?
5. Are the borders doing structural work rather than adding decoration?
6. Does the screen feel coherent with the rest of Maniac—not like a separately designed plugin?
7. Does the interaction remain obvious and usable with keyboard, touch, reduced motion, and both themes?

**Design north star:** a near-black or pure-white canvas, carefully weighted type, hairline separators, compact controls, almost no shadow, and a writing experience that gets out of the user's way. The interface should feel unmistakably Maniac through its behavior and structure—not through color.
