import { useState } from 'react';
import { 
  Database, 
  Share2, 
  Shield, 
  Lock, 
  Unlock, 
  Plus, 
  Filter, 
  FileText, 
  ArrowRight,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface NoteRow {
  id: string;
  title: string;
  status: 'In Progress' | 'Shipped' | 'Review';
  priority: 'High' | 'Medium' | 'Low';
  backlink: string;
}

export default function ObsidianLiveBlockDemo() {
  const [activeTab, setActiveTab] = useState<'database' | 'graph' | 'vault'>('database');

  // Tab 1 state: Database
  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Shipped'>('All');
  const [notes, setNotes] = useState<NoteRow[]>([
    { id: '1', title: 'Knowledge Graph Visualization Engine', status: 'Shipped', priority: 'High', backlink: '[[2D Force Graph]]' },
    { id: '2', title: 'Bi-directional Backlink Indexer', status: 'Shipped', priority: 'High', backlink: '[[Page Backlinks]]' },
    { id: '3', title: 'Leitner Spaced Repetition SRS', status: 'In Progress', priority: 'Medium', backlink: '[[Active Recall]]' },
    { id: '4', title: 'Client-Side AES-256 Hardware Vault', status: 'In Progress', priority: 'High', backlink: '[[Crypto Vault]]' }
  ]);

  // Tab 2 state: Backlinks & Graph
  const [selectedBacklink, setSelectedBacklink] = useState<string>('[[2D Force Graph]]');
  const [showNodeInfo, setShowNodeInfo] = useState(true);

  // Tab 3 state: Cryptography
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [vaultKeyDerived, setVaultKeyDerived] = useState(false);

  const cycleStatus = (id: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const next = n.status === 'In Progress' ? 'Review' : n.status === 'Review' ? 'Shipped' : 'In Progress';
      return { ...n, status: next };
    }));
  };

  const addNote = () => {
    const id = (notes.length + 1).toString();
    setNotes(prev => [
      ...prev,
      { id, title: `Architectural Proposal #${id}`, status: 'In Progress', priority: 'Medium', backlink: '[[Design Tokens]]' }
    ]);
  };

  const toggleVaultLock = () => {
    if (!isVaultLocked) {
      setVaultKeyDerived(true);
      setIsVaultLocked(true);
    } else {
      setIsVaultLocked(false);
    }
  };

  const filteredNotes = filter === 'All' 
    ? notes 
    : notes.filter(n => n.status === filter);

  return (
    <div className="live-demo-container" aria-label="Interactive Obsidian Comparison Playground">
      {/* Top Deck Navigation */}
      <div className="live-demo-deck">
        <div className="live-demo-deck-left">
          <div className="live-demo-indicator" />
          <span className="live-demo-label">SOVEREIGN KERNEL PLAYGROUND</span>
          <span className="live-demo-sep">/</span>
          <span className="live-demo-sub">Zero Plugins Required</span>
        </div>

        {/* Tab Selection */}
        <div className="live-demo-tabs" role="tablist">
          <button
            type="button"
            className={`live-demo-tab ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
            role="tab"
            aria-selected={activeTab === 'database'}
          >
            <Database size={13} />
            <span>Native Databases (No Plugins)</span>
          </button>
          <button
            type="button"
            className={`live-demo-tab ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
            role="tab"
            aria-selected={activeTab === 'graph'}
          >
            <Share2 size={13} />
            <span>Backlinks &amp; 2D Graph</span>
          </button>
          <button
            type="button"
            className={`live-demo-tab ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
            role="tab"
            aria-selected={activeTab === 'vault'}
          >
            <Shield size={13} />
            <span>AES-256 Vault Encryption</span>
          </button>
        </div>

        <div className="live-demo-deck-right">
          <span className="live-demo-status-pill">
            <span className="live-demo-pulse" />
            <span className="tabular-mono">0 PLUGINS</span>
          </span>
        </div>
      </div>

      {/* Surface Frame */}
      <div className="live-demo-surface">
        {/* TAB 1: RELATIONAL DATABASE TABLE */}
        {activeTab === 'database' && (
          <div className="demo-canvas-content">
            <div className="demo-db-header">
              <div>
                <h3 className="demo-doc-heading">Native Relational Databases vs Dataview YAML Scripts</h3>
                <p className="demo-doc-lead">
                  Obsidian requires third-party community plugins (Dataview, Projects) with manual syntax that easily corrupts notes. MANIAC provides native relational database blocks out of the box.
                </p>
              </div>

              <div className="demo-db-actions">
                <div className="demo-filter-group">
                  {(['All', 'In Progress', 'Shipped'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`demo-filter-btn ${filter === f ? 'active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="btn-demo-add-row"
                  onClick={addNote}
                >
                  <Plus size={13} /> Add Record
                </button>
              </div>
            </div>

            <div className="demo-table-wrapper">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Status (Interactive Click)</th>
                    <th>Priority</th>
                    <th>Bidirectional Backlink</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map(note => (
                    <tr key={note.id}>
                      <td className="demo-td-title">
                        <FileText size={14} className="demo-doc-icon-subtle" />
                        <span>{note.title}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`demo-status-pill ${note.status.toLowerCase().replace(' ', '-')}`}
                          onClick={() => cycleStatus(note.id)}
                          title="Click to cycle status"
                        >
                          <span className="status-indicator" />
                          <span>{note.status}</span>
                        </button>
                      </td>
                      <td>
                        <span className="demo-priority-tag">{note.priority}</span>
                      </td>
                      <td>
                        <span 
                          className="demo-backlink-chip interactive"
                          onClick={() => {
                            setSelectedBacklink(note.backlink);
                            setActiveTab('graph');
                          }}
                          title="Click to view connection in graph"
                        >
                          {note.backlink}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="demo-db-footer">
              <span>Relational Schema: Zero YAML frontmatter manipulation required</span>
              <span className="tabular-mono">IndexedDB Synchronous Engine</span>
            </div>
          </div>
        )}

        {/* TAB 2: BACKLINKS & GRAPH */}
        {activeTab === 'graph' && (
          <div className="demo-canvas-content">
            <h3 className="demo-doc-heading">Bi-Directional Backlinks &amp; Live Graph Connectivity</h3>
            <p className="demo-doc-lead">
              Unlike flat text files, every block in MANIAC indexes references in real time. Click backlink chips below to see bi-directional graph connections.
            </p>

            <div className="demo-graph-showcase">
              {/* Note Content Simulation */}
              <div className="demo-graph-note-panel">
                <div className="demo-doc-path">NOTE EDITOR CANVAS</div>
                <div className="demo-note-editor-preview">
                  <h4>Research Note: Local-First Synchronization</h4>
                  <p>
                    By coupling CRDT data models with <span className="demo-inline-mention" onClick={() => setSelectedBacklink('[[2D Force Graph]]')}>[[2D Force Graph]]</span> and <span className="demo-inline-mention" onClick={() => setSelectedBacklink('[[Storage Kernel]]')}>[[Storage Kernel]]</span>, multi-tab collaboration works without central cloud servers.
                  </p>
                  <p>
                    See also related notes in <span className="demo-inline-mention" onClick={() => setSelectedBacklink('[[Active Recall]]')}>[[Active Recall]]</span>.
                  </p>
                </div>
              </div>

              {/* Inspector Panel */}
              <div className="demo-graph-inspector">
                <div className="demo-inspector-head">
                  <Share2 size={13} />
                  <span>BACKLINKS &amp; GRAPH INSPECTOR</span>
                </div>
                <div className="demo-inspector-body">
                  <div className="demo-inspector-target">
                    <span className="inspector-lbl">Selected Reference:</span>
                    <span className="inspector-val">{selectedBacklink}</span>
                  </div>

                  <div className="demo-inspector-links">
                    <span className="inspector-lbl">Connected Pages:</span>
                    <div className="demo-node-tag-list">
                      <span className="demo-node-tag">Local-First Synchronization (Current)</span>
                      <span className="demo-node-tag">Engineering Roadmap</span>
                      <span className="demo-node-tag">Cognitive Architecture</span>
                    </div>
                  </div>

                  <div className="demo-inspector-metric">
                    <span>Backlink Depth: <strong>1st Degree</strong></span>
                    <span className="tabular-mono">0ms indexing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AES-256 VAULT ENCRYPTION */}
        {activeTab === 'vault' && (
          <div className="demo-canvas-content">
            <h3 className="demo-doc-heading">Hardware-Grade Cryptography vs Raw Plaintext Files</h3>
            <p className="demo-doc-lead">
              Obsidian saves your confidential thoughts in plaintext markdown files on disk—accessible to any rogue desktop script or background app. MANIAC offers client-side Web Crypto AES-256-GCM vault locking.
            </p>

            <div className="demo-vault-card">
              <div className="demo-vault-top">
                <div className="demo-vault-status-box">
                  {isVaultLocked ? (
                    <div className="vault-locked-badge">
                      <Lock size={18} />
                      <span>VAULT ENCRYPTED (AES-256-GCM)</span>
                    </div>
                  ) : (
                    <div className="vault-unlocked-badge">
                      <Unlock size={18} />
                      <span>VAULT UNLOCKED (CLEAR TEXT BUFFER)</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`btn-demo-vault-toggle ${isVaultLocked ? 'unlock' : 'lock'}`}
                  onClick={toggleVaultLock}
                >
                  {isVaultLocked ? (
                    <>
                      <Unlock size={14} />
                      <span>Decrypt &amp; Unlock Vault</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Encrypt Local Vault</span>
                    </>
                  )}
                </button>
              </div>

              <div className="demo-vault-data-preview">
                <div className="vault-preview-header">
                  <span>IN-MEMORY PAYLOAD INSPECTION</span>
                  <span className="tabular-mono">{isVaultLocked ? 'ENCRYPTED CIPHERTEXT (CIPHER)' : 'PLAINTEXT NOTE BUFFER'}</span>
                </div>
                <div className="vault-preview-content">
                  {isVaultLocked ? (
                    <code className="cipher-code">
                      0x8f2d4e81a3c749b012f3e82a93c7d612e4f0a9b2184e7a2b91c0e3a6f4d2b8e1
                      7c3f81e92d4b0a1c6e83f2a74b9d012e84a9f3c71e2d4b0a8c3f91e2b4d701a8
                      [IV: 12 bytes | Tag: 128-bit GCM | PBKDF2: 100,000 iterations]
                    </code>
                  ) : (
                    <div className="plain-content">
                      <div className="plain-line"># Proprietary Product Architecture &amp; Strategy</div>
                      <div className="plain-line">&gt; Client notes stored strictly in browser IndexedDB.</div>
                      <div className="plain-line">&gt; No telemetry. No remote tracking. Zero server visibility.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="demo-vault-footnote">
                <CheckCircle2 size={14} />
                <span>Web Crypto API hardware acceleration: Sub-millisecond symmetric AES-256 cipher operations on your CPU.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Surface Bottom Telemetry */}
      <div className="live-demo-footer-strip">
        <div className="demo-telemetry-col">
          <span className="telemetry-lbl">COMMUNITY PLUGINS</span>
          <span className="telemetry-val">0 Required (Native Relational Engine)</span>
        </div>
        <div className="demo-telemetry-div" />
        <div className="demo-telemetry-col">
          <span className="telemetry-lbl">DISK STORAGE SECURITY</span>
          <span className="telemetry-val">Encrypted IndexedDB · Not Raw Plaintext</span>
        </div>
        <div className="demo-telemetry-div" />
        <div className="demo-telemetry-col">
          <span className="telemetry-lbl">SYNC PRICING</span>
          <span className="telemetry-val">$0 Forever · Local-First CRDT</span>
        </div>
      </div>
    </div>
  );
}
