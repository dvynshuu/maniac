import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileArchive, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown, Loader2, Database, FileText, Image, ArrowRight, Sparkles } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { usePageStore } from '../../stores/pageStore';
import { db } from '../../db/database';
import { parseNotionExport, getImportSummary } from '../../utils/notionParser';

const STEPS = ['upload', 'preview', 'importing', 'complete'];

export default function NotionImportModal() {
  const isOpen = useUIStore(s => s.notionImportModalOpen);
  const closeModal = useUIStore(s => s.closeNotionImport);

  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [progress, setProgress] = useState({ phase: '', percent: 0, detail: '' });
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setSummary(null);
    setProgress({ phase: '', percent: 0, detail: '' });
    setError(null);
  };

  const handleClose = () => {
    reset();
    closeModal();
  };

  const handleFile = useCallback(async (f) => {
    if (!f || !f.name.endsWith('.zip')) {
      setError('Please select a .zip file exported from Notion.');
      return;
    }
    setFile(f);
    setError(null);
    setStep('preview');
    setProgress({ phase: 'parsing', percent: 0, detail: 'Parsing export...' });

    try {
      const data = await parseNotionExport(f, (p) => setProgress(p));
      setParsedData(data);
      setSummary(getImportSummary(data));
    } catch (err) {
      setError(err.message || 'Failed to parse Notion export.');
      setStep('upload');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!parsedData) return;
    setStep('importing');
    setProgress({ phase: 'writing', percent: 0, detail: 'Writing pages...' });

    try {
      const { pages, blocks, databaseRows, databaseCells, blobs } = parsedData;

      // Write pages
      if (pages.length > 0) {
        setProgress({ phase: 'writing', percent: 10, detail: `Writing ${pages.length} pages...` });
        await db.pages.bulkPut(pages);
      }

      // Write blocks
      if (blocks.length > 0) {
        setProgress({ phase: 'writing', percent: 30, detail: `Writing ${blocks.length} blocks...` });
        // Batch in chunks to avoid blocking
        const chunkSize = 200;
        for (let i = 0; i < blocks.length; i += chunkSize) {
          const chunk = blocks.slice(i, i + chunkSize);
          await db.blocks.bulkPut(chunk);
          setProgress({ phase: 'writing', percent: 30 + Math.floor((i / blocks.length) * 30), detail: `Blocks: ${Math.min(i + chunkSize, blocks.length)}/${blocks.length}` });
        }
      }

      // Write database rows
      if (databaseRows.length > 0) {
        setProgress({ phase: 'writing', percent: 65, detail: `Writing ${databaseRows.length} database rows...` });
        await db.database_rows.bulkPut(databaseRows);
      }

      // Write database cells
      if (databaseCells.length > 0) {
        setProgress({ phase: 'writing', percent: 75, detail: `Writing ${databaseCells.length} database cells...` });
        const chunkSize = 500;
        for (let i = 0; i < databaseCells.length; i += chunkSize) {
          const chunk = databaseCells.slice(i, i + chunkSize);
          await db.database_cells.bulkPut(chunk);
        }
      }

      // Write blobs
      if (blobs.length > 0) {
        setProgress({ phase: 'writing', percent: 85, detail: `Storing ${blobs.length} images...` });
        await db.blobs.bulkPut(blobs);
      }

      // Reload pages in store
      setProgress({ phase: 'finalizing', percent: 95, detail: 'Refreshing workspace...' });
      await usePageStore.getState().loadPages();

      setProgress({ phase: 'complete', percent: 100, detail: 'Import complete!' });
      setStep('complete');
      useUIStore.getState().addToast(`Successfully imported ${pages.length} pages from Notion!`, 'success');
    } catch (err) {
      setError('Import failed: ' + (err.message || 'Unknown error'));
      setStep('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notion-import-overlay" onClick={handleClose}>
      <div className="notion-import-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-import-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="notion-import-icon-wrapper">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="notion-import-title">Import from Notion</h2>
              <p className="notion-import-subtitle">Migrate your entire workspace seamlessly</p>
            </div>
          </div>
          <button className="notion-import-close" onClick={handleClose}><X size={18} /></button>
        </div>

        {/* Step indicator */}
        <div className="notion-import-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`notion-import-step ${step === s ? 'active' : ''} ${STEPS.indexOf(step) > i ? 'done' : ''}`}>
              <div className="notion-import-step-dot">
                {STEPS.indexOf(step) > i ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
              </div>
              <span className="notion-import-step-label">{s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview' : s === 'importing' ? 'Import' : 'Done'}</span>
              {i < STEPS.length - 1 && <div className="notion-import-step-line" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="notion-import-body">
          {error && (
            <div className="notion-import-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button onClick={() => setError(null)}><X size={14} /></button>
            </div>
          )}

          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div
              className={`notion-import-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
              <div className="notion-import-dropzone-icon">
                <FileArchive size={40} />
              </div>
              <p className="notion-import-dropzone-title">Drop your Notion export here</p>
              <p className="notion-import-dropzone-sub">or click to browse for a <strong>.zip</strong> file</p>
              <div className="notion-import-dropzone-hint">
                <span>Supports HTML and Markdown+CSV exports</span>
              </div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && !summary && (
            <div className="notion-import-loading">
              <Loader2 size={32} className="notion-import-spinner" />
              <p>{progress.detail || 'Parsing...'}</p>
              <div className="notion-import-progress-bar">
                <div className="notion-import-progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}

          {step === 'preview' && summary && (
            <div className="notion-import-preview">
              <div className="notion-import-stats">
                <StatCard icon={<FileText size={20} />} label="Pages" value={summary.totalPages} color="var(--accent-primary)" />
                <StatCard icon={<ChevronRight size={20} />} label="Blocks" value={summary.totalBlocks} color="#a78bfa" />
                <StatCard icon={<Database size={20} />} label="Databases" value={summary.totalDatabases} color="#f472b6" />
                <StatCard icon={<Image size={20} />} label="Images" value={summary.totalImages} color="#4ade80" />
              </div>

              {summary.pageTree.length > 0 && (
                <div className="notion-import-tree-section">
                  <h4>Page Hierarchy</h4>
                  <div className="notion-import-tree">
                    {summary.pageTree.slice(0, 20).map(page => (
                      <PageTreeItem key={page.id} page={page} depth={0} />
                    ))}
                    {summary.pageTree.length > 20 && (
                      <div className="notion-import-tree-more">+{summary.pageTree.length - 20} more pages...</div>
                    )}
                  </div>
                </div>
              )}

              <button className="notion-import-action-btn" onClick={handleImport}>
                <ArrowRight size={18} />
                <span>Start Import</span>
              </button>
            </div>
          )}

          {/* IMPORTING STEP */}
          {step === 'importing' && (
            <div className="notion-import-loading">
              <Loader2 size={40} className="notion-import-spinner" />
              <p className="notion-import-loading-phase">{progress.detail}</p>
              <div className="notion-import-progress-bar">
                <div className="notion-import-progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <span className="notion-import-loading-pct">{progress.percent}%</span>
            </div>
          )}

          {/* COMPLETE STEP */}
          {step === 'complete' && (
            <div className="notion-import-complete">
              <div className="notion-import-complete-icon">
                <CheckCircle2 size={48} />
              </div>
              <h3>Migration Complete!</h3>
              <p>All your Notion data has been successfully imported into Maniac.</p>
              {summary && (
                <div className="notion-import-complete-stats">
                  <span>{summary.totalPages} pages</span>
                  <span>•</span>
                  <span>{summary.totalBlocks} blocks</span>
                  <span>•</span>
                  <span>{summary.totalImages} images</span>
                </div>
              )}
              <button className="notion-import-action-btn" onClick={handleClose}>
                <Sparkles size={18} />
                <span>Go to Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="notion-import-stat-card" style={{ '--stat-color': color }}>
      <div className="notion-import-stat-icon">{icon}</div>
      <div className="notion-import-stat-value">{value}</div>
      <div className="notion-import-stat-label">{label}</div>
    </div>
  );
}

function PageTreeItem({ page, depth }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = page.children && page.children.length > 0;

  return (
    <div>
      <div className="notion-import-tree-item" style={{ paddingLeft: `${depth * 20 + 8}px` }} onClick={() => hasChildren && setExpanded(!expanded)}>
        {hasChildren ? (
          expanded ? <ChevronDown size={14} className="notion-import-tree-chevron" /> : <ChevronRight size={14} className="notion-import-tree-chevron" />
        ) : (
          <span style={{ width: 14, display: 'inline-block' }} />
        )}
        <span className="notion-import-tree-icon">{page.icon || '📝'}</span>
        <span className="notion-import-tree-title">{page.title || 'Untitled'}</span>
        {hasChildren && <span className="notion-import-tree-count">{page.children.length}</span>}
      </div>
      {expanded && hasChildren && page.children.map(child => (
        <PageTreeItem key={child.id} page={child} depth={depth + 1} />
      ))}
    </div>
  );
}
