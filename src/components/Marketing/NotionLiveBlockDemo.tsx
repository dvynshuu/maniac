import { useState } from 'react';
import { 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Brain, 
  Table, 
  Upload, 
  Sparkles, 
  Terminal, 
  Quote, 
  Plus, 
  RotateCcw,
  Zap,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface DynamicBlock {
  id: string;
  type: 'callout' | 'code' | 'quote';
  content: string;
}

interface DbRow {
  id: string;
  title: string;
  status: 'In Progress' | 'Done' | 'Backlog';
  priority: 'High' | 'Medium' | 'Low';
  backlink: string;
}

export default function NotionLiveBlockDemo() {
  const [activeTab, setActiveTab] = useState<'blocks' | 'database' | 'importer'>('blocks');

  // Tab 1 state: Blocks & SRS
  const [toggleOpen, setToggleOpen] = useState(true);
  const [srsReviewed, setSrsReviewed] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', text: 'Commit state to client-side IndexedDB (0ms latency)', done: true },
    { id: '2', text: 'Losslessly parse Notion export ZIP without cloud servers', done: true },
    { id: '3', text: 'Convert toggle blocks into Leitner active recall cards', done: false }
  ]);
  const [extraBlocks, setExtraBlocks] = useState<DynamicBlock[]>([]);

  // Tab 2 state: Database
  const [dbFilter, setDbFilter] = useState<'All' | 'In Progress' | 'Done'>('All');
  const [dbRows, setDbRows] = useState<DbRow[]>([
    { id: '1', title: 'Local IndexedDB Engine Integration', status: 'Done', priority: 'High', backlink: '[[Storage Kernel]]' },
    { id: '2', title: 'Client-Side Notion ZIP Unpacker', status: 'Done', priority: 'High', backlink: '[[Notion Migration]]' },
    { id: '3', title: 'Leitner Spaced Repetition Scheduler', status: 'In Progress', priority: 'Medium', backlink: '[[Cognitive SRS]]' }
  ]);

  // Tab 3 state: Importer Simulation
  const [importProgress, setImportProgress] = useState<'idle' | 'running' | 'completed'>('idle');
  const [importLog, setImportLog] = useState<string[]>([]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleSrsRate = (rating: string, days: number) => {
    setSrsReviewed(`Interval scheduled: +${days}d (${rating}) • Written to IndexedDB in 0.1ms`);
  };

  const addBlock = (type: 'callout' | 'code' | 'quote') => {
    const id = Date.now().toString();
    let content = '';
    if (type === 'callout') content = 'Hairline callout block: 100% monochrome, zero decorative blur.';
    if (type === 'code') content = 'const vault = await db.pages.where("srsEnabled").equals(true).toArray();';
    if (type === 'quote') content = '“The interface should feel like a well-made physical instrument.”';
    setExtraBlocks(prev => [...prev, { id, type, content }]);
  };

  const cycleDbStatus = (id: string) => {
    setDbRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const nextStatus = row.status === 'In Progress' ? 'Done' : row.status === 'Done' ? 'Backlog' : 'In Progress';
      return { ...row, status: nextStatus };
    }));
  };

  const addDbRow = () => {
    const newId = (dbRows.length + 1).toString();
    setDbRows(prev => [
      ...prev,
      { id: newId, title: `Custom Engineering Task #${newId}`, status: 'In Progress', priority: 'Medium', backlink: '[[Architecture]]' }
    ]);
  };

  const runImportSimulation = () => {
    setImportProgress('running');
    setImportLog(['Reading notion_workspace_export.zip locally...']);

    setTimeout(() => {
      setImportLog(prev => [...prev, 'Decompressing HTML & Markdown page tree (0ms server upload)...']);
    }, 300);

    setTimeout(() => {
      setImportLog(prev => [...prev, 'Extracted 42 sub-pages, 14 relational tables, and 820 blocks.']);
    }, 600);

    setTimeout(() => {
      setImportLog(prev => [
        ...prev,
        '✓ Successfully committed to IndexedDB. Ingestion complete in 12ms. Zero cloud packets sent.'
      ]);
      setImportProgress('completed');
    }, 900);
  };

  const filteredRows = dbFilter === 'All' 
    ? dbRows 
    : dbRows.filter(r => r.status === dbFilter);

  return (
    <div className="live-demo-container" aria-label="Interactive Block Canvas Playground">
      {/* Chrome Header Deck */}
      <div className="live-demo-deck">
        <div className="live-demo-deck-left">
          <div className="live-demo-indicator" />
          <span className="live-demo-label">TACTILE BLOCK ENGINE</span>
          <span className="live-demo-sep">/</span>
          <span className="live-demo-sub">0ms Local Latency</span>
        </div>

        {/* Tab Switcher */}
        <div className="live-demo-tabs" role="tablist">
          <button
            type="button"
            className={`live-demo-tab ${activeTab === 'blocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocks')}
            role="tab"
            aria-selected={activeTab === 'blocks'}
          >
            <Layers size={13} />
            <span>Active Recall &amp; Toggles</span>
          </button>
          <button
            type="button"
            className={`live-demo-tab ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
            role="tab"
            aria-selected={activeTab === 'database'}
          >
            <Table size={13} />
            <span>Relational Table Row</span>
          </button>
          <button
            type="button"
            className={`live-demo-tab ${activeTab === 'importer' ? 'active' : ''}`}
            onClick={() => setActiveTab('importer')}
            role="tab"
            aria-selected={activeTab === 'importer'}
          >
            <Upload size={13} />
            <span>Notion ZIP Extractor</span>
          </button>
        </div>

        <div className="live-demo-deck-right">
          <span className="live-demo-status-pill">
            <span className="live-demo-pulse" />
            <span className="tabular-mono">0.0ms SYNC</span>
          </span>
        </div>
      </div>

      {/* Editor Surface Frame */}
      <div className="live-demo-surface">
        {/* TAB 1: MODULAR BLOCKS & ACTIVE RECALL */}
        {activeTab === 'blocks' && (
          <div className="demo-canvas-content">
            <div className="demo-canvas-meta">
              <span className="demo-doc-path">Workspace / Architecture / Cognitive Notes</span>
              <span className="demo-doc-badge">LOCAL VAULT</span>
            </div>

            <h3 className="demo-doc-heading">Sovereign Knowledge Synthesis</h3>
            <p className="demo-doc-lead">
              Every item below is an atomic block. Click the checkboxes, expand the toggle, and rate the flashcard to experience 0ms response.
            </p>

            {/* Checklist Blocks */}
            <div className="demo-block-group">
              <div className="demo-block-subhead">SYSTEM REQUISITES (INTERACTIVE TODO BLOCKS)</div>
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`demo-todo-row ${task.done ? 'done' : ''}`}
                  onClick={() => toggleTask(task.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="demo-checkbox-icon">
                    {task.done ? <CheckSquare size={16} /> : <Square size={16} />}
                  </span>
                  <span className="demo-todo-text">{task.text}</span>
                  <span className="demo-todo-meta">{task.done ? '0ms synced' : 'click to check'}</span>
                </div>
              ))}
            </div>

            {/* Interactive Toggle & Active Recall Block */}
            <div className="demo-toggle-card">
              <button
                type="button"
                className="demo-toggle-head"
                onClick={() => setToggleOpen(!toggleOpen)}
                aria-expanded={toggleOpen}
              >
                <ChevronRight 
                  size={16} 
                  className={`demo-toggle-arrow ${toggleOpen ? 'rotated' : ''}`} 
                />
                <span className="demo-toggle-title">
                  <Brain size={14} className="demo-toggle-icon" />
                  <span>Toggle Flashcard: Why is local-first inherently faster than Notion?</span>
                </span>
                <span className="demo-toggle-pill">Active Recall</span>
              </button>

              {toggleOpen && (
                <div className="demo-toggle-body">
                  <p className="demo-toggle-desc">
                    Notion sends HTTP API calls across cloud regions for every block mutation. In MANIAC, operations commit synchronously to client-side IndexedDB with Dexie.js, delivering 0ms latency and 100% offline access without server dependencies.
                  </p>

                  <div className="demo-srs-action-strip">
                    <span className="demo-srs-prompt">Test your recall interval:</span>
                    <div className="demo-srs-btns">
                      <button 
                        type="button" 
                        className="btn-srs-rate"
                        onClick={() => handleSrsRate('Again', 1)}
                      >
                        Again (1d)
                      </button>
                      <button 
                        type="button" 
                        className="btn-srs-rate"
                        onClick={() => handleSrsRate('Hard', 3)}
                      >
                        Hard (3d)
                      </button>
                      <button 
                        type="button" 
                        className="btn-srs-rate primary"
                        onClick={() => handleSrsRate('Good', 7)}
                      >
                        Good (7d)
                      </button>
                      <button 
                        type="button" 
                        className="btn-srs-rate"
                        onClick={() => handleSrsRate('Easy', 14)}
                      >
                        Easy (14d)
                      </button>
                    </div>
                  </div>

                  {srsReviewed && (
                    <div className="demo-srs-feedback">
                      <CheckCircle2 size={14} />
                      <span>{srsReviewed}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dynamically Added Blocks */}
            {extraBlocks.map(block => (
              <div key={block.id} className={`demo-dynamic-block demo-block-${block.type}`}>
                {block.type === 'callout' && <Sparkles size={15} className="demo-dynamic-icon" />}
                {block.type === 'code' && <Terminal size={15} className="demo-dynamic-icon" />}
                {block.type === 'quote' && <Quote size={15} className="demo-dynamic-icon" />}
                <div className="demo-dynamic-text">{block.content}</div>
              </div>
            ))}

            {/* Slash Command Trigger Strip */}
            <div className="demo-slash-strip">
              <span className="demo-slash-label">Quick Insert:</span>
              <button 
                type="button" 
                className="btn-demo-insert"
                onClick={() => addBlock('callout')}
              >
                <Plus size={12} /> Callout Block
              </button>
              <button 
                type="button" 
                className="btn-demo-insert"
                onClick={() => addBlock('code')}
              >
                <Plus size={12} /> Code Snippet
              </button>
              <button 
                type="button" 
                className="btn-demo-insert"
                onClick={() => addBlock('quote')}
              >
                <Plus size={12} /> Editorial Quote
              </button>
              {extraBlocks.length > 0 && (
                <button 
                  type="button" 
                  className="btn-demo-reset"
                  onClick={() => setExtraBlocks([])}
                  title="Reset dynamic blocks"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RELATIONAL DATABASE TABLE BLOCK */}
        {activeTab === 'database' && (
          <div className="demo-canvas-content">
            <div className="demo-db-header">
              <div>
                <h3 className="demo-doc-heading">Relational Database Table Block</h3>
                <p className="demo-doc-lead">
                  Native tables with custom properties, filtering, and 0ms local calculation. Click any status to cycle it.
                </p>
              </div>

              <div className="demo-db-actions">
                <div className="demo-filter-group">
                  {(['All', 'In Progress', 'Done'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`demo-filter-btn ${dbFilter === f ? 'active' : ''}`}
                      onClick={() => setDbFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="btn-demo-add-row"
                  onClick={addDbRow}
                >
                  <Plus size={13} /> Add Row
                </button>
              </div>
            </div>

            <div className="demo-table-wrapper">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th>Item Title</th>
                    <th>Status (Interactive)</th>
                    <th>Priority</th>
                    <th>Backlink Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id}>
                      <td className="demo-td-title">
                        <span className="demo-doc-icon">📄</span>
                        <span>{row.title}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`demo-status-pill ${row.status.toLowerCase().replace(' ', '-')}`}
                          onClick={() => cycleDbStatus(row.id)}
                          title="Click to cycle status"
                        >
                          <span className="status-indicator" />
                          <span>{row.status}</span>
                        </button>
                      </td>
                      <td>
                        <span className="demo-priority-tag">{row.priority}</span>
                      </td>
                      <td>
                        <span className="demo-backlink-chip">{row.backlink}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="demo-db-footer">
              <span>Showing {filteredRows.length} of {dbRows.length} records</span>
              <span className="tabular-mono">Dexie IndexedDB Engine • 0ms queries</span>
            </div>
          </div>
        )}

        {/* TAB 3: NOTION ZIP PARSER SIMULATOR */}
        {activeTab === 'importer' && (
          <div className="demo-canvas-content">
            <h3 className="demo-doc-heading">Client-Side Notion ZIP Importer</h3>
            <p className="demo-doc-lead">
              Test how MANIAC reconstructs your full Notion workspace directly inside your browser without uploading a single byte to remote servers.
            </p>

            <div className="demo-importer-box">
              <div className="demo-importer-icon-ring">
                <Upload size={24} />
              </div>
              <h4>Local-First Extraction Simulation</h4>
              <p>Simulate parsing a real 48-page Notion export archive (HTML, markdown, callouts, and relational tables).</p>

              {importProgress === 'idle' && (
                <button
                  type="button"
                  className="btn-demo-run-import"
                  onClick={runImportSimulation}
                >
                  <Zap size={15} />
                  <span>Simulate Instant ZIP Parsing</span>
                </button>
              )}

              {importProgress !== 'idle' && (
                <div className="demo-terminal-log">
                  <div className="demo-terminal-header">
                    <span className="demo-terminal-title">TERMINAL OUTPUT (CLIENT PARSER)</span>
                    <span className="tabular-mono">PORT 0 (IN-MEMORY)</span>
                  </div>
                  <div className="demo-terminal-body">
                    {importLog.map((line, idx) => (
                      <div key={idx} className="demo-log-line">
                        <span className="log-prefix">&gt;</span>
                        <span>{line}</span>
                      </div>
                    ))}
                    {importProgress === 'running' && (
                      <div className="demo-log-line running">
                        <span className="log-prefix">&gt;</span>
                        <span className="log-spinner">Extracting blocks...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {importProgress === 'completed' && (
                <button
                  type="button"
                  className="btn-demo-reset-import"
                  onClick={() => {
                    setImportProgress('idle');
                    setImportLog([]);
                  }}
                >
                  <RotateCcw size={13} /> Re-run Simulation
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Surface Bottom Telemetry */}
      <div className="live-demo-footer-strip">
        <div className="demo-telemetry-col">
          <span className="telemetry-lbl">ARCHITECTURAL FIDELITY</span>
          <span className="telemetry-val">Monochrome Editorial Canvas</span>
        </div>
        <div className="demo-telemetry-div" />
        <div className="demo-telemetry-col">
          <span className="telemetry-lbl">STORAGE PREREQUISITES</span>
          <span className="telemetry-val">0 Cloud Accounts · 100% Offline</span>
        </div>
        <div className="demo-telemetry-div" />
        <div className="demo-telemetry-col">
          <span className="telemetry-lbl">SYSTEM ENCRYPTION</span>
          <span className="telemetry-val">Client-Side Hardware AES-256</span>
        </div>
      </div>
    </div>
  );
}
