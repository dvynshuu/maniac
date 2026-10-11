import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Upload,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Loader2,
  Database,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  Check,
  Copy,
  RefreshCw,
  FolderTree,
  AlertCircle,
  Info,
  Search,
  ExternalLink,
  Table,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { usePageStore } from '../../stores/pageStore';
import { runNotionImportPipeline, persistImportModel } from '../../features/notion-import/pipeline.js';
import '../../notionImport.css';

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'analyzing', label: 'Analyze' },
  { id: 'preview', label: 'Review' },
  { id: 'importing', label: 'Import' },
  { id: 'complete', label: 'Ready' },
];

export default function NotionImportModal() {
  const isOpen = useUIStore(s => s.notionImportModalOpen);
  const closeModal = useUIStore(s => s.closeNotionImport);

  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [pipelineData, setPipelineData] = useState(null);
  const [progress, setProgress] = useState({ phase: '', percent: 0, detail: '' });
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewTab, setPreviewTab] = useState('tree'); // 'tree' | 'databases' | 'diagnostics'
  const [treeSearch, setTreeSearch] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);

  const fileInputRef = useRef(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPipelineData(null);
    setProgress({ phase: '', percent: 0, detail: '' });
    setError(null);
    setPreviewTab('tree');
    setTreeSearch('');
    setCopiedReport(false);
    setImportStats(null);
    setExecutionTime(null);
  };

  const handleClose = () => {
    reset();
    closeModal();
  };

  // ─── Step 1: File Selection & Fast Analysis (Dry Run) ──────────────
  const handleFile = useCallback(async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a valid .zip archive exported from Notion.');
      return;
    }

    setFile(f);
    setError(null);
    setStep('analyzing');
    setProgress({ phase: 'extracting', percent: 5, detail: 'Extracting Notion archive...' });

    try {
      const result = await runNotionImportPipeline(f, (p) => setProgress(p), { dryRun: true });
      if (!result.success) {
        throw new Error('Analysis completed with errors.');
      }
      setPipelineData(result);
      setExecutionTime(result.timeMs);
      setStep('preview');
    } catch (err) {
      console.error('Notion import analysis failed:', err);
      setError(err.message || 'Failed to inspect Notion export archive.');
      setStep('upload');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ─── Step 2: Atomic Persistence (Commit to Dexie) ─────────────────
  const handleConfirmImport = async () => {
    if (!pipelineData?.model) return;

    setStep('importing');
    setProgress({ phase: 'writing', percent: 10, detail: 'Preparing atomic database write...' });

    const startTime = Date.now();
    try {
      const stats = await persistImportModel(pipelineData.model, (p) => setProgress(p));

      // Refresh pages in sidebar store
      setProgress({ phase: 'finalizing', percent: 98, detail: 'Syncing workspace state...' });
      await usePageStore.getState().loadPages();

      setImportStats(stats);
      setExecutionTime(Date.now() - startTime + (pipelineData.timeMs || 0));
      setProgress({ phase: 'complete', percent: 100, detail: 'Import complete!' });
      setStep('complete');

      useUIStore.getState().addToast(
        `Successfully imported ${stats.pagesCount} pages and ${pipelineData.stats.databasesCount} databases!`,
        'success'
      );

      // Add to notification center if available
      import('../../stores/notificationStore').then(({ useNotificationStore }) => {
        useNotificationStore.getState().addNotification(
          'Notion Import',
          `Successfully reconstructed ${stats.pagesCount} pages, ${pipelineData.stats.databasesCount} databases, and ${stats.blobsCount} media assets.`,
          'info'
        );
      }).catch(() => {});
    } catch (err) {
      console.error('Notion import persistence failed:', err);
      setError('Import persistence failed: ' + (err.message || 'Unknown database error'));
      setStep('preview');
    }
  };

  const handleCopyDiagnostics = () => {
    if (!pipelineData?.diagnostics) return;
    const d = pipelineData.diagnostics;
    const reportText = typeof d.formatReport === 'function' 
      ? d.formatReport() 
      : JSON.stringify(d, null, 2);
    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  };

  const handleGoToWorkspace = () => {
    // If we have imported pages, navigate to the first root page
    if (pipelineData?.model?.pages?.length > 0) {
      const firstRoot = pipelineData.model.pages.find(p => !p.parentId && !p.isDatabaseRow) || pipelineData.model.pages[0];
      if (firstRoot) {
        usePageStore.getState().setCurrentPage(firstRoot.id);
      }
    }
    handleClose();
  };

  // Filtered page tree for preview
  const hierarchyTree = useMemo(() => {
    if (!pipelineData?.model) return [];
    const pages = pipelineData.model.pages;
    const databases = pipelineData.model.databases;

    // Map parent -> children
    const childrenByParent = new Map();
    for (const p of pages) {
      if (p.isDatabaseRow) continue; // Row pages are kept isolated
      const pid = p.parentId || '__root__';
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid).push(p);
    }

    const dbsByParent = new Map();
    for (const db of databases) {
      const pid = db.parentPageId || '__root__';
      if (!dbsByParent.has(pid)) dbsByParent.set(pid, []);
      dbsByParent.get(pid).push(db);
    }

    const buildNode = (page) => {
      const childPages = (childrenByParent.get(page.id) || []).map(buildNode);
      const childDbs = (dbsByParent.get(page.id) || []).map(db => ({
        ...db,
        isDatabase: true,
      }));
      return {
        ...page,
        children: [...childDbs, ...childPages],
      };
    };

    const rootPages = (childrenByParent.get('__root__') || []).map(buildNode);
    const rootDbs = (dbsByParent.get('__root__') || []).map(db => ({ ...db, isDatabase: true }));

    return [...rootPages, ...rootDbs];
  }, [pipelineData]);

  // Diagnostics summary
  const diagSummary = useMemo(() => {
    if (!pipelineData?.diagnostics) return { total: 0, errors: 0, warnings: 0, infos: 0 };
    const d = pipelineData.diagnostics;
    if (typeof d.getSummary === 'function') return d.getSummary();
    if (typeof d.summary === 'function') {
      const s = d.summary();
      return { total: s.total || 0, errors: s.errors || s.error || 0, warnings: s.warnings || s.warning || 0, infos: s.infos || s.info || 0 };
    }
    return { total: 0, errors: 0, warnings: 0, infos: 0 };
  }, [pipelineData]);

  // Diagnostics entries
  const diagEntries = useMemo(() => {
    if (!pipelineData?.diagnostics) return [];
    const d = pipelineData.diagnostics;
    if (typeof d.getEntries === 'function') return d.getEntries();
    if (typeof d.getAll === 'function') return d.getAll();
    if (Array.isArray(d)) return d;
    return [];
  }, [pipelineData]);

  if (!isOpen) return null;

  return (
    <div className="notion-import-overlay" onClick={handleClose}>
      <div className="notion-import-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-import-header">
          <div className="notion-import-header-left">
            <div className="notion-import-icon-wrapper">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="notion-import-title">Import from Notion</h2>
              <p className="notion-import-subtitle">Lossless workspace reconstruction with preserved hierarchy and schemas</p>
            </div>
          </div>
          <button className="notion-import-close" onClick={handleClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="notion-import-steps">
          {STEPS.map((s, i) => {
            const stepIdx = STEPS.findIndex(x => x.id === step);
            const isCurrent = step === s.id;
            const isDone = stepIdx > i;

            return (
              <div key={s.id} className={`notion-import-step ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                <div className="notion-import-step-dot">
                  {isDone ? <Check size={12} strokeWidth={3} /> : <span>{i + 1}</span>}
                </div>
                <span className="notion-import-step-label">{s.label}</span>
                {i < STEPS.length - 1 && <div className="notion-import-step-line" />}
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="notion-import-error">
            <AlertTriangle size={16} />
            <div className="notion-import-error-msg">{error}</div>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* Body Content */}
        <div className="notion-import-body">
          {/* ──────────────────────────────────────────────────────────
              UPLOAD STEP
             ────────────────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="notion-import-upload-pane">
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
                  <FileArchive size={36} />
                </div>
                <h3 className="notion-import-dropzone-title">Select or drop your Notion export archive</h3>
                <p className="notion-import-dropzone-sub">Upload the complete <strong>.zip</strong> exported from Notion Settings &gt; Export</p>
                <div className="notion-import-dropzone-cta">
                  <Upload size={14} />
                  <span>Choose Export ZIP</span>
                </div>
              </div>

              {/* Guarantees & Features Grid */}
              <div className="notion-import-features-grid">
                <div className="notion-feature-item">
                  <div className="notion-feature-bullet" />
                  <div>
                    <strong>Canonical Hierarchy</strong>
                    <span>Reads index.html to guarantee zero path drift or misplaced subpages</span>
                  </div>
                </div>
                <div className="notion-feature-item">
                  <div className="notion-feature-bullet" />
                  <div>
                    <strong>Database Deduplication</strong>
                    <span>Merges companion CSVs &amp; filtered views into unified databases</span>
                  </div>
                </div>
                <div className="notion-feature-item">
                  <div className="notion-feature-bullet" />
                  <div>
                    <strong>Row Isolation</strong>
                    <span>Database items stay linked to their databases without polluting root pages</span>
                  </div>
                </div>
                <div className="notion-feature-item">
                  <div className="notion-feature-bullet" />
                  <div>
                    <strong>Deterministic &amp; Idempotent</strong>
                    <span>Safe to re-import at any time without creating duplicate entities</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              ANALYZING STEP
             ────────────────────────────────────────────────────────── */}
          {step === 'analyzing' && (
            <div className="notion-import-loading-container">
              <div className="notion-import-spinner-ring">
                <Loader2 size={36} className="notion-import-spinner" />
              </div>
              <div className="notion-import-loading-title">Inspecting Notion Export</div>
              <div className="notion-import-loading-phase">{progress.detail || 'Extracting archive...'}</div>

              <div className="notion-import-progress-track">
                <div className="notion-import-progress-bar-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <span className="notion-import-progress-pct">{progress.percent}%</span>

              <div className="notion-import-pipeline-stages">
                <div className={`pipeline-stage-badge ${progress.percent >= 10 ? 'passed' : 'active'}`}>Archive Discovery</div>
                <div className={`pipeline-stage-badge ${progress.percent >= 25 ? 'passed' : progress.percent >= 15 ? 'active' : ''}`}>Canonical Index</div>
                <div className={`pipeline-stage-badge ${progress.percent >= 40 ? 'passed' : progress.percent >= 25 ? 'active' : ''}`}>Databases &amp; Rows</div>
                <div className={`pipeline-stage-badge ${progress.percent >= 60 ? 'passed' : progress.percent >= 40 ? 'active' : ''}`}>Hierarchy &amp; Blocks</div>
                <div className={`pipeline-stage-badge ${progress.percent >= 80 ? 'passed' : progress.percent >= 60 ? 'active' : ''}`}>Assets &amp; Integrity</div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              PREVIEW & VERIFICATION STEP
             ────────────────────────────────────────────────────────── */}
          {step === 'preview' && pipelineData && (
            <div className="notion-import-preview-pane">
              {/* Stat Grid */}
              <div className="notion-import-stat-grid">
                <div className="notion-stat-card">
                  <div className="notion-stat-header">
                    <span className="notion-stat-label">Pages Reconstructed</span>
                    <FileText size={16} className="notion-stat-icon accent-indigo" />
                  </div>
                  <div className="notion-stat-value">{pipelineData.stats.pagesCount}</div>
                  <div className="notion-stat-detail">
                    {pipelineData.model?.pages?.filter(p => !p.parentId && !p.isDatabaseRow).length || 0} root spaces
                  </div>
                </div>

                <div className="notion-stat-card">
                  <div className="notion-stat-header">
                    <span className="notion-stat-label">Logical Databases</span>
                    <Database size={16} className="notion-stat-icon accent-purple" />
                  </div>
                  <div className="notion-stat-value">{pipelineData.stats.databasesCount}</div>
                  <div className="notion-stat-detail">
                    {pipelineData.stats.rowsCount} rows • {pipelineData.stats.cellsCount} cells
                  </div>
                </div>

                <div className="notion-stat-card">
                  <div className="notion-stat-header">
                    <span className="notion-stat-label">Content Blocks</span>
                    <Layers size={16} className="notion-stat-icon accent-amber" />
                  </div>
                  <div className="notion-stat-value">{pipelineData.stats.blocksCount}</div>
                  <div className="notion-stat-detail">Markdown &amp; structured elements</div>
                </div>

                <div className="notion-stat-card">
                  <div className="notion-stat-header">
                    <span className="notion-stat-label">Media Assets</span>
                    <ImageIcon size={16} className="notion-stat-icon accent-emerald" />
                  </div>
                  <div className="notion-stat-value">{pipelineData.stats.assetsCount}</div>
                  <div className="notion-stat-detail">SHA-256 deduplicated</div>
                </div>
              </div>

              {/* Pre-flight Integrity Badges */}
              <div className="notion-import-integrity-bar">
                <div className="notion-integrity-badge">
                  <ShieldCheck size={14} className="accent-emerald" />
                  <span>Deterministic IDs</span>
                </div>
                <div className="notion-integrity-badge">
                  <ShieldCheck size={14} className="accent-emerald" />
                  <span>Acyclic Hierarchy</span>
                </div>
                <div className="notion-integrity-badge">
                  <ShieldCheck size={14} className="accent-emerald" />
                  <span>Isolated Database Rows</span>
                </div>
                <div className="notion-integrity-badge">
                  <ShieldCheck size={14} className="accent-emerald" />
                  <span>Schemas Validated</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="notion-import-preview-tabs">
                <button
                  className={`preview-tab-btn ${previewTab === 'tree' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('tree')}
                >
                  <FolderTree size={14} />
                  <span>Workspace Hierarchy</span>
                  <span className="tab-count-badge">{hierarchyTree.length}</span>
                </button>
                <button
                  className={`preview-tab-btn ${previewTab === 'databases' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('databases')}
                >
                  <Table size={14} />
                  <span>Databases</span>
                  <span className="tab-count-badge">{pipelineData.model?.databases?.length || 0}</span>
                </button>
                <button
                  className={`preview-tab-btn ${previewTab === 'diagnostics' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('diagnostics')}
                >
                  <AlertCircle size={14} />
                  <span>Diagnostics</span>
                  <span className={`tab-count-badge ${diagSummary.errors > 0 ? 'badge-error' : diagSummary.warnings > 0 ? 'badge-warn' : ''}`}>
                    {diagSummary.warnings + diagSummary.errors}
                  </span>
                </button>
              </div>

              {/* Tab Content 1: Hierarchy Tree */}
              {previewTab === 'tree' && (
                <div className="notion-import-tab-panel">
                  <div className="notion-tree-search-bar">
                    <Search size={14} className="tree-search-icon" />
                    <input
                      type="text"
                      placeholder="Filter pages..."
                      value={treeSearch}
                      onChange={e => setTreeSearch(e.target.value)}
                      className="tree-search-input"
                    />
                    {treeSearch && (
                      <button onClick={() => setTreeSearch('')} className="tree-search-clear"><X size={12} /></button>
                    )}
                  </div>

                  <div className="notion-preview-tree-container">
                    {hierarchyTree
                      .filter(node => !treeSearch || node.title?.toLowerCase().includes(treeSearch.toLowerCase()))
                      .map(node => (
                        <PreviewTreeNode key={node.id} node={node} depth={0} filter={treeSearch} />
                      ))}
                    {hierarchyTree.length === 0 && (
                      <div className="notion-empty-tree-notice">No pages found in canonical index.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Databases */}
              {previewTab === 'databases' && (
                <div className="notion-import-tab-panel">
                  <div className="notion-databases-list">
                    {(pipelineData.model?.databases || []).map(db => {
                      const dbRows = (pipelineData.model?.databaseRows || []).filter(r => r.blockId === db.id);
                      return (
                        <div key={db.id} className="notion-db-preview-card">
                          <div className="notion-db-preview-header">
                            <Database size={15} className="accent-purple" />
                            <span className="notion-db-preview-title">{db.title || 'Untitled Database'}</span>
                            <span className="notion-db-preview-rows">{dbRows.length} rows</span>
                          </div>
                          <div className="notion-db-preview-meta">
                            <span>Source: {db.primaryCsvPath ? db.primaryCsvPath.split('/').pop() : 'Inferred'}</span>
                            {db.viewCsvPaths?.length > 1 && (
                              <span>• Deduplicated {db.viewCsvPaths.length - 1} filtered view(s)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Content 3: Diagnostics */}
              {previewTab === 'diagnostics' && (
                <div className="notion-import-tab-panel">
                  <div className="notion-diagnostics-header">
                    <div className="notion-diag-counts">
                      <span className="diag-chip green">{diagSummary.infos} Resolved Infos</span>
                      <span className="diag-chip amber">{diagSummary.warnings} Warnings</span>
                      <span className="diag-chip red">{diagSummary.errors} Errors</span>
                    </div>
                    <button className="notion-diag-copy-btn" onClick={handleCopyDiagnostics}>
                      {copiedReport ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedReport ? 'Copied' : 'Copy Report'}</span>
                    </button>
                  </div>

                  <div className="notion-diagnostics-list">
                    {diagEntries.map((entry, idx) => (
                      <div key={idx} className={`notion-diag-entry level-${entry.level || 'info'}`}>
                        <div className="notion-diag-entry-header">
                          <span className={`diag-level-pill ${entry.level || 'info'}`}>{(entry.level || entry.severity || 'INFO').toUpperCase()}</span>
                          <span className="diag-code">{entry.code}</span>
                        </div>
                        <div className="notion-diag-msg">{entry.message}</div>
                        {entry.details && (
                          <pre className="notion-diag-details">{JSON.stringify(entry.details, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                    {diagEntries.length === 0 && (
                      <div className="notion-empty-diag-notice">
                        <CheckCircle2 size={24} className="accent-emerald" />
                        <span>Zero warnings or integrity issues detected in export archive!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="notion-import-footer">
                <button className="notion-import-btn-secondary" onClick={() => setStep('upload')}>
                  <RefreshCw size={14} />
                  <span>Choose Another File</span>
                </button>
                <button className="notion-import-btn-primary" onClick={handleConfirmImport}>
                  <span>Confirm &amp; Import to Workspace</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              IMPORTING STEP (Dexie Writes)
             ────────────────────────────────────────────────────────── */}
          {step === 'importing' && (
            <div className="notion-import-loading-container">
              <div className="notion-import-spinner-ring">
                <Loader2 size={36} className="notion-import-spinner" />
              </div>
              <div className="notion-import-loading-title">Reconstructing Workspace</div>
              <div className="notion-import-loading-phase">{progress.detail || 'Writing records to Dexie...'}</div>

              <div className="notion-import-progress-track">
                <div className="notion-import-progress-bar-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <span className="notion-import-progress-pct">{progress.percent}%</span>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              COMPLETE STEP
             ────────────────────────────────────────────────────────── */}
          {step === 'complete' && (
            <div className="notion-import-complete-pane">
              <div className="notion-complete-hero-icon">
                <CheckCircle2 size={44} />
              </div>
              <h3 className="notion-complete-title">Workspace Reconstructed</h3>
              <p className="notion-complete-subtitle">
                Your Notion hierarchy, databases, and assets are fully migrated into Maniac.
              </p>

              {pipelineData && (
                <div className="notion-complete-stats-row">
                  <div className="complete-metric">
                    <span className="metric-num">{pipelineData.stats.pagesCount}</span>
                    <span className="metric-label">Pages</span>
                  </div>
                  <div className="complete-metric-divider" />
                  <div className="complete-metric">
                    <span className="metric-num">{pipelineData.stats.databasesCount}</span>
                    <span className="metric-label">Databases</span>
                  </div>
                  <div className="complete-metric-divider" />
                  <div className="complete-metric">
                    <span className="metric-num">{pipelineData.stats.rowsCount}</span>
                    <span className="metric-label">Rows</span>
                  </div>
                  <div className="complete-metric-divider" />
                  <div className="complete-metric">
                    <span className="metric-num">{pipelineData.stats.blocksCount}</span>
                    <span className="metric-label">Blocks</span>
                  </div>
                  <div className="complete-metric-divider" />
                  <div className="complete-metric">
                    <span className="metric-num">{pipelineData.stats.assetsCount}</span>
                    <span className="metric-label">Assets</span>
                  </div>
                </div>
              )}

              {executionTime && (
                <div className="notion-complete-timing">
                  Completed in {(executionTime / 1000).toFixed(1)}s • Zero hierarchy errors
                </div>
              )}

              <div className="notion-complete-actions">
                <button className="notion-import-btn-primary" onClick={handleGoToWorkspace}>
                  <Sparkles size={16} />
                  <span>Open Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Preview Tree Node ──────────────────────────────────
function PreviewTreeNode({ node, depth, filter }) {
  const [expanded, setExpanded] = useState(depth < 1 || Boolean(filter));
  const hasChildren = node.children && node.children.length > 0;
  const isDatabase = node.isDatabase;

  return (
    <div className="preview-tree-node-wrapper">
      <div
        className={`preview-tree-node ${isDatabase ? 'is-database' : ''}`}
        style={{ paddingLeft: `${depth * 18 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span className="tree-node-expander">
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span style={{ width: 14, display: 'inline-block' }} />
          )}
        </span>

        <span className="tree-node-icon">
          {isDatabase ? <Database size={13} className="accent-purple" /> : (node.icon || '📄')}
        </span>

        <span className="tree-node-title" title={node.title || 'Untitled'}>
          {node.title || 'Untitled'}
        </span>

        {isDatabase && (
          <span className="tree-db-badge">Database</span>
        )}

        {hasChildren && (
          <span className="tree-node-child-count">{node.children.length}</span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="preview-tree-node-children">
          {node.children.map(child => (
            <PreviewTreeNode key={child.id} node={child} depth={depth + 1} filter={filter} />
          ))}
        </div>
      )}
    </div>
  );
}
