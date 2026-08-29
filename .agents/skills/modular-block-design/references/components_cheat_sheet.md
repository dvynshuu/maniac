# Modular Block Component Implementation Cheat Sheet

Quick-reference patterns for building document-first, modular block components in React / HTML / CSS.

---

## 1. Page Header with Cover, Emoji & Controls

```jsx
export function ModularPageHeader({ title, icon = "⚡", coverUrl, onUpdateTitle }) {
  return (
    <header className="modular-header-group">
      {/* Cover Image Container */}
      <div className="modular-cover-wrapper">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="modular-cover-img" />
        ) : (
          <div className="modular-cover-gradient" />
        )}
        <div className="modular-cover-hover-controls">
          <button className="modular-cover-btn">Change cover</button>
          <button className="modular-cover-btn">Reposition</button>
        </div>
      </div>

      {/* Title & Icon Header */}
      <div className="modular-page-meta-container">
        <button className="modular-page-icon-trigger" aria-label="Change Icon">
          {icon}
        </button>
        <h1
          contentEditable
          suppressContentEditableWarning
          className="modular-page-title"
          placeholder="Untitled"
          onBlur={(e) => onUpdateTitle(e.currentTarget.innerText)}
        >
          {title}
        </h1>
      </div>
    </header>
  );
}
```

---

## 2. Interactive Callout Block

```jsx
export function ModularCallout({ icon = "💡", color = "gray", children }) {
  return (
    <div className={`modular-callout modular-callout--${color}`}>
      <span className="modular-callout-icon" role="img" aria-hidden="true">
        {icon}
      </span>
      <div className="modular-callout-body">
        {children}
      </div>
    </div>
  );
}
```

---

## 3. Smooth Animated Toggle List

```jsx
import { useState } from 'react';

export function ModularToggle({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`modular-toggle ${isOpen ? 'is-open' : ''}`}>
      <div 
        className="modular-toggle-header" 
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <svg 
          className="modular-toggle-chevron" 
          viewBox="0 0 16 16" 
          width="14" 
          height="14"
        >
          <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="modular-toggle-title">{title}</span>
      </div>
      {isOpen && (
        <div className="modular-toggle-content">
          {children}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Block Row with Hover Grip (`⋮⋮`) & Quick Insert (`+`)

```jsx
export function ModularBlockRow({ id, onAddBelow, onOpenMenu, children }) {
  return (
    <div className="modular-block-row group">
      {/* Left Gutter Floating Affordance */}
      <div className="modular-block-gutter">
        <button 
          className="modular-gutter-btn" 
          title="Click to add a block below"
          onClick={() => onAddBelow(id)}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
        </button>
        <button 
          className="modular-gutter-btn cursor-grab" 
          title="Drag to move or click to open menu"
          onClick={(e) => onOpenMenu(id, e)}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5"/><circle cx="11" cy="4" r="1.5"/>
            <circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/>
            <circle cx="5" cy="12" r="1.5"/><circle cx="11" cy="12" r="1.5"/>
          </svg>
        </button>
      </div>

      {/* Actual Block Content */}
      <div className="modular-block-payload">
        {children}
      </div>
    </div>
  );
}
```

---

## 5. Slash Command Dropdown Menu (`/`)

```jsx
export function ModularSlashMenu({ items, selectedIndex, onSelect, position }) {
  return (
    <div 
      className="modular-slash-menu"
      style={{ top: position.top, left: position.left }}
    >
      <div className="modular-slash-header">BASIC BLOCKS</div>
      <div className="modular-slash-list">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`modular-slash-item ${idx === selectedIndex ? 'is-active' : ''}`}
            onClick={() => onSelect(item)}
          >
            <div className="modular-slash-icon">{item.icon}</div>
            <div className="modular-slash-text">
              <span className="modular-slash-title">{item.title}</span>
              <span className="modular-slash-desc">{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```
