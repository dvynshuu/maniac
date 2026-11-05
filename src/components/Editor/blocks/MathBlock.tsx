import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { Sigma, Copy, Check, Eye, Edit3, X, Sparkles } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const LATEX_PRESETS = [
  { label: 'Fraction', snippet: '\\frac{a}{b}' },
  { label: 'Square Root', snippet: '\\sqrt{x}' },
  { label: 'Sum', snippet: '\\sum_{i=1}^{n} x_i' },
  { label: 'Integral', snippet: '\\int_{a}^{b} f(x) dx' },
  { label: 'Vector', snippet: '\\mathbf{v}' },
  { label: 'Matrix', snippet: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  { label: 'Alpha', snippet: '\\alpha' },
  { label: 'Beta', snippet: '\\beta' },
  { label: 'Theta', snippet: '\\theta' },
];

export default function MathBlock({ block }: { block: any }) {
  const [isEditing, setIsEditing] = useState(!block.content);
  const [formula, setFormula] = useState(block.content || '');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const livePreviewRef = useRef<HTMLDivElement | null>(null);
  
  const engine = useEditorEngine();
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  // Sync with block content changes
  useEffect(() => {
    if (block.content !== formula) {
      setFormula(block.content || '');
    }
  }, [block.content]);

  // Focus management
  useEffect(() => {
    if (focusBlockId === block.id) {
      setIsEditing(true);
    }
  }, [focusBlockId, block.id]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // Render static KaTeX when not editing
  useEffect(() => {
    if (!isEditing && previewRef.current) {
      try {
        katex.render(formula.trim() || '\\text{Click to edit LaTeX formula}', previewRef.current, {
          displayMode: true,
          throwOnError: false,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'LaTeX Syntax Error');
      }
    }
  }, [formula, isEditing]);

  // Render live KaTeX preview while editing
  useEffect(() => {
    if (isEditing && livePreviewRef.current) {
      try {
        katex.render(formula.trim() || '\\text{Formula preview will appear here}', livePreviewRef.current, {
          displayMode: true,
          throwOnError: false,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Syntax error');
      }
    }
  }, [formula, isEditing]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (formula !== block.content) {
      engine.updateBlock(block.id, { content: formula });
    }
  }, [formula, block.content, block.id, engine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setFormula(block.content || '');
      setIsEditing(false);
    } else if (e.key === 'Backspace' && formula === '') {
      e.preventDefault();
      engine.convertType(block.id, 'text');
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    if (!textareaRef.current) {
      setFormula(prev => prev + ' ' + snippet);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const nextText = formula.substring(0, start) + snippet + formula.substring(end);
    setFormula(nextText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + snippet.length;
      }
    }, 0);
  };

  const handleCopyFormula = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignored */ }
  };

  return (
    <div className="block-math-station" contentEditable={false} suppressContentEditableWarning>
      {isEditing ? (
        <div className="block-math-editor-tray">
          <div className="math-editor-header">
            <div className="math-header-left">
              <Sigma size={14} className="text-primary" />
              <span className="math-header-title">LaTeX Mathematical Notation</span>
            </div>
            <div className="math-header-actions">
              <button 
                type="button"
                className="math-header-btn save"
                onClick={handleSave}
                title="Finish editing (Ctrl+Enter)"
              >
                <Check size={12} />
                <span>Done</span>
                <kbd className="math-kbd">⌘↵</kbd>
              </button>
            </div>
          </div>

          {/* Quick Syntax Insertion Chips */}
          <div className="math-preset-chips">
            {LATEX_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="math-preset-chip"
                onClick={() => handleInsertSnippet(preset.snippet)}
                title={`Insert ${preset.snippet}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Multiline Formula Textarea */}
          <div className="math-textarea-wrap">
            <textarea
              ref={textareaRef}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter LaTeX formula, e.g. \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} ..."
              rows={Math.max(2, (formula.split('\n') || []).length)}
              className="math-input-textarea"
              spellCheck={false}
            />
          </div>

          {/* Live KaTeX Render Preview Strip */}
          <div className="math-live-preview-box">
            <div className="math-live-label">
              <Eye size={11} />
              <span>LIVE RENDER</span>
            </div>
            <div ref={livePreviewRef} className="math-live-render-display" />
          </div>

          {error && (
            <div className="math-error-banner">
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        /* Rendered Formula Card */
        <div 
          className="math-preview-card"
          onClick={() => setIsEditing(true)}
          role="button"
          tabIndex={0}
          title="Click to edit formula"
        >
          <div className="math-card-badge">
            <Sigma size={12} />
            <span>LATEX</span>
          </div>

          <div ref={previewRef} className="math-card-rendered-content" />

          <div className="math-card-hover-actions">
            <button 
              type="button" 
              className="math-hover-btn" 
              onClick={handleCopyFormula}
              title="Copy LaTeX source"
            >
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button 
              type="button" 
              className="math-hover-btn"
              onClick={() => setIsEditing(true)}
              title="Edit equation"
            >
              <Edit3 size={12} />
              <span>Edit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
