---
name: modular-block-design
description: >-
  Enforces document-first, modular block UI/UX design standards.
  Use this skill whenever designing, building, or styling block-based workspaces,
  document editors, callouts, collapsible toggles, multi-layout database views (boards, tables, galleries),
  slash command menus, page hero covers, typography palettes, and distraction-free productivity interfaces.
---

# Modular Block & Document-First Design System

This skill guides the creation of **document-first, modular block interfaces**. It defines the typographic scales, muted pastel color systems, block mechanics, progressive disclosure micro-interactions, database views, and distraction-free layout patterns that power modern, tactile, high-productivity workspaces.

> **Visual Architecture Notice:** Per `Maniac-DESIGN.md`, the product UI is **strictly monochrome** (black, white, and neutral greys only). Legacy pastel tints are superseded by architectural hairlines and neutral surface luminance steps.

---

## 1. Core Philosophy: The Modular Canvas Paradigm

A modular block interface is built upon four primary tenets:

1. **The Canvas is a Document**: Everything is an atomic block. Paragraphs, headings, callouts, databases, images, and embeds share a consistent modular DNA and drag-and-drop affordance.
2. **Distraction-Free Zen**: UI chrome (toolbars, drag grips, delete buttons) remains invisible by default and emerges smoothly on hover or keyboard intent (**Progressive Disclosure**).
3. **Strict Monochrome Precision**: Clean neutral luminance hierarchy (`--color-surface-1` through `--color-surface-4`), 1px hairline borders, and zero glassmorphic blurs or decorative glows.
4. **Keyboard-First Agility**: Every block type, formatting option, and navigation action provides instant keyboard triggers (`/` slash command, markdown shortcuts `>` / `#` / `[]`, arrow key navigation).

---

## 2. Color Architecture & Token System (Maniac Canonical Monochrome)

Maniac uses high-contrast monochrome tokens defined in `Maniac-DESIGN.md`:

| Token | Dark Mode (Default) | Light Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--color-bg` | `#000000` | `#FFFFFF` | Document canvas and root app |
| `--color-surface-1` | `#000000` | `#FFFFFF` | Primary surface |
| `--color-surface-2` | `#050505` | `#FAFAFA` | Quiet structural panels, callouts |
| `--color-surface-3` | `#0A0A0A` | `#F4F4F5` | Hovered rows, secondary items |
| `--color-surface-4` | `#111111` | `#EEEEF0` | Inputs, selected states |
| `--color-surface-popover` | `#090909` | `#FFFFFF` | Slash menu, command palette |
| `--color-fg` | `#FAFAFA` | `#09090B` | Primary text and icons |
| `--color-fg-secondary` | `#A1A1AA` | `#52525B` | Secondary text |
| `--color-border` | `#1A1A1A` | `#E4E4E7` | 1px hairline borders |
| `--color-border-strong` | `#3F3F46` | `#A1A1AA` | Active / focused borders |

### CSS Custom Properties Template

```css
:root {
  /* Typography */
  --block-font-sans: "Geist Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --block-font-mono: "JetBrains Mono", "SFMono-Regular", Menlo, monospace;

  /* Surfaces & Borders */
  --block-bg-page: var(--color-bg);
  --block-bg-sidebar: var(--color-surface-2);
  --block-bg-hover: var(--color-surface-3);
  --block-bg-active: var(--color-surface-4);
  --block-border-subtle: var(--color-border);
  --block-border-strong: var(--color-border-strong);
}
```
  --block-border-strong: rgba(255, 255, 255, 0.16);

  /* Shadows */
  --block-shadow-popover: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4);
  --block-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.2);

  /* Dimensions & Spacing */
  --block-max-content-width: 720px;
  --block-max-content-wide: 960px;
  --block-indent: 24px;
  --block-radius-sm: 3px;
  --block-radius-md: 6px;
  --block-radius-lg: 10px;
}
```

---

## 3. Typography Hierarchy & Page Layout Geometry

### Document Scale
- **Page Title**: `36px–40px`, `font-weight: 700`, `line-height: 1.2`, `letter-spacing: -0.025em`.
- **Heading 1 (`H1`)**: `1.875em` (~`30px`), `font-weight: 600`, `margin-top: 1.8em`, `margin-bottom: 0.25em`.
- **Heading 2 (`H2`)**: `1.5em` (~`24px`), `font-weight: 600`, `margin-top: 1.4em`, `margin-bottom: 0.2em`.
- **Heading 3 (`H3`)**: `1.25em` (~`20px`), `font-weight: 600`, `margin-top: 1.0em`, `margin-bottom: 0.15em`.
- **Body Text (`P`)**: `16px`, `line-height: 1.55`, `color: inherit`, `padding: 3px 2px`.
- **Small / Meta Caption**: `12px–13px`, `color: var(--block-color-gray)`.

### Page Structure & Canvas Layout
```
+-------------------------------------------------------------+
| Top Bar (Breadcrumbs > Page Title | Share | Star | More ...) |
+-------------------------------------------------------------+
| Hero Page Cover (Height: 200px-280px, Object-fit: cover)    |
|   [Change Cover] [Reposition] (visible on hover)            |
+-------------------------------------------------------------+
|   [😀 Emoji / Page Icon] (Overlaps cover by -40px)          |
|                                                             |
|   Page Title (editable inline)                              |
|   + Add description / Add property                          |
|                                                             |
|   +-------------------------------------------------------+ |
|   | Document Column (Centered, Max-Width: 720px or 100%)  | |
|   |                                                       | |
|   | ⋮⋮ + [Text / Callout / Toggle / Database / etc.]      | |
|   +-------------------------------------------------------+ |
+-------------------------------------------------------------+
```

---

## 4. Modular Block Blueprints

### 1. Callout Block (`.block-callout`)
A rounded box with an icon on the left, housing formatted content.
```css
.modular-callout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 16px 16px 16px 12px;
  border-radius: var(--block-radius-md);
  background: var(--block-bg-hover);
  border: 1px solid var(--block-border-subtle);
  margin: 6px 0;
  transition: background 120ms ease;
}
.modular-callout-icon {
  font-size: 20px;
  line-height: 1.2;
  user-select: none;
  flex-shrink: 0;
}
.modular-callout-content {
  flex: 1;
  min-width: 0;
  line-height: 1.55;
}
```

### 2. Collapsible Toggle List (`.block-toggle`)
A collapsible disclosure triangle with an indented block container.
```css
.modular-toggle {
  display: flex;
  flex-direction: column;
  margin: 2px 0;
}
.modular-toggle-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 2px;
  cursor: pointer;
  border-radius: var(--block-radius-sm);
}
.modular-toggle-header:hover {
  background: var(--block-bg-hover);
}
.modular-toggle-triangle {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--block-color-gray);
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  transform: rotate(0deg);
}
.modular-toggle.is-open > .modular-toggle-header .modular-toggle-triangle {
  transform: rotate(90deg);
}
.modular-toggle-body {
  margin-left: var(--block-indent);
  border-left: 1px solid var(--block-border-subtle);
  padding-left: 8px;
}
```

### 3. Quote Block (`.block-quote`)
Clean vertical left border accent with subtle indentation.
```css
.modular-quote {
  font-size: 1.15em;
  border-left: 3px solid currentColor;
  padding: 4px 0 4px 14px;
  margin: 6px 0;
  line-height: 1.5;
  font-style: normal;
}
```

### 4. Code Block with Language Badge & Copy Trigger
```css
.modular-code-block {
  position: relative;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--block-border-subtle);
  border-radius: var(--block-radius-md);
  padding: 28px 16px 14px 16px;
  font-family: var(--block-font-mono);
  font-size: 13.5px;
  overflow-x: auto;
}
.modular-code-header {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 120ms ease;
}
.modular-code-block:hover .modular-code-header {
  opacity: 1;
}
```

### 5. Block Hover Handles (`⋮⋮` and `+`)
On hover of any block row, reveal the 6-dot drag grip and quick-insert plus button in the left gutter:
```css
.modular-block-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 2px 0;
}
.modular-block-actions {
  position: absolute;
  left: -28px;
  top: 3px;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 100ms ease;
  user-select: none;
}
.modular-block-row:hover > .modular-block-actions {
  opacity: 1;
}
.modular-handle-btn {
  width: 18px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--block-color-gray);
  border-radius: var(--block-radius-sm);
  cursor: grab;
}
.modular-handle-btn:hover {
  background: var(--block-bg-hover);
  color: inherit;
}
```

---

## 5. Multi-View Database Standards

Modular databases switch seamlessly between 4 essential view layouts:

### 1. Table View
- **Header Row**: Property name + type icon (Aa Text, # Number, 🏷️ Select, 📅 Date, 👤 Person, ☑️ Checkbox).
- **Cells**: Hairline cell borders (`1px solid var(--block-border-subtle)`), single-click edit, drag column reorder, and bottom `+ New row` calculation summary footer.

### 2. Board View (Kanban)
- Columns grouped by `Status` or `Select` property with colored pills.
- Floating cards with smooth elevation hover (`transform: translateY(-1px)`, `box-shadow: var(--block-shadow-card)`).
- Quick inline `+ New` button at bottom of each stack.

### 3. Gallery View
- Card grid (`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`).
- Top 50% of card contains cover/preview image, bottom 50% contains title & badge tags.

### 4. List View
- Minimalist horizontal rows separated by hairline dividers.
- Page icon + title on the left, meta tags & date pills aligned to the right.

---

## 6. Floating Command Menus & Keyboard Modals

### Slash Command Menu (`/`)
- Positioned directly below the active cursor line.
- Grouped sections: **Basic Blocks** (Text, H1-H3, To-do list, Bulleted list, Numbered list, Toggle, Quote, Divider, Callout), **Media** (Image, Code, File), **Database** (Table, Board, Gallery).
- Keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).

### Floating Selection Formatting Toolbar
- Appears floating above highlighted text (`top: -38px`).
- Neutral popover styling with 1px hairline border (`var(--color-border)`).
- Action buttons: **B** (Bold), *I* (Italic), <u>U</u> (Underline), ~~S~~ (Strikethrough), `<>` (Code), 🔗 (Link), Subtle Highlight.

---

## 7. Design Verification Checklist

Before shipping any modular document or block component, verify:

- [ ] **Distraction-Free Chrome**: Are action buttons hidden until hover/focus?
- [ ] **Strict Monochrome Palette**: Are surfaces, borders, and badges using canonical monochrome tokens (`var(--color-bg)`, `var(--color-surface-2..4)`)?
- [ ] **Hairline Precision**: Are borders 1px hairlines (`var(--color-border)`) without glassmorphic blurs or drop shadows?
- [ ] **Drag & Drop Affordance**: Does the 6-dot grip (`⋮⋮`) appear quietly in neutral grayscale on block hover?
- [ ] **Emoji / Icon Alignment**: Are icons crisp and properly aligned with text baselines?
- [ ] **Content-First Width**: Is reading width comfortably constrained to `720px` by default with a wide-mode toggle?
- [ ] **Keyboard Fluidity**: Can users navigate, format, and create blocks without touching the mouse?
- [ ] **Dark & Light Mode Parity**: Does the interface invert cleanly without muddy contrast?
