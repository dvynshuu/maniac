import { useState, useEffect, useRef } from 'react';
import { 
  ExternalLink, Play, Globe, Clock, Target, Calendar, 
  Plus, Minus, MessageSquare, Settings, Sliders, Pause, 
  RotateCcw, MoreHorizontal, Check, Trash2, Copy, X,
  Trophy, Flame, Star, Book, Coffee, Heart, Smile, CheckCircle, HelpCircle
} from 'lucide-react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useBlockStore } from '../../../stores/blockStore';

export default function EmbedBlock({ block }) {
  const url = block.properties?.url || '';
  const caption = block.properties?.caption || '';
  const storedType = block.properties?.embedType || 'generic';
  const width = block.properties?.width || '100%';
  
  // Widget settings
  const widgetSettings = block.properties?.widgetSettings || {
    theme: 'sleekdark',
    bgColor: '#17171e',
    textColor: '#f3f3f4',
    title: '',
    targetDate: '',
    workTime: 25,
    breakTime: 5,
    current: 0,
    target: 10
  };

  const engine = useEditorEngine();
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const [inputUrl, setInputUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentInput, setCommentInput] = useState(caption);
  
  // Resizing state
  const wrapperRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef(null);

  // Auto-detect type if generic URL matches YouTube (only for embed block)
  const effectiveType = (block.type === 'embed' && storedType === 'generic' && (url.includes('youtube.com') || url.includes('youtu.be'))) 
    ? 'youtube' 
    : (block.type === 'embed' ? storedType : block.type);

  const isWidgetBlock = ['countdown', 'pomodoro', 'progress_bar'].includes(block.type);
  const isWidgetSelector = block.type === 'widget';
  
  // Determine if we show content (either populated URL or native widget block)
  const showContent = (block.type === 'embed' && url) || isWidgetBlock;

  useEffect(() => {
    if (caption) {
      setCommentInput(caption);
    }
  }, [caption]);

  if (block._isDecrypting) {
    return (
      <div className="block-embed-wrapper loading">
        <div className="block-embed-loading">
          <div className="spinner-small" />
          <span>Decrypting embed...</span>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && !inputUrl && !url && block.type === 'embed') {
      e.preventDefault();
      engine.deleteBlock(block.id);
    }
  };

  const handleSubmitUrl = async (e) => {
    if (e) e.preventDefault();
    const targetUrl = inputUrl.trim();
    if (!targetUrl) return;

    setIsSubmitting(true);
    let type = 'generic';
    if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      type = 'youtube';
    }

    await engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        url: targetUrl,
        embedType: type
      }
    });
    setIsSubmitting(false);
  };

  const handleSelectWidgetType = async (widgetType) => {
    // Convert current block type to the selected widget type!
    let extraProps = {};
    if (widgetType === 'countdown') {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      extraProps = {
        widgetSettings: {
          ...widgetSettings,
          title: 'Left in This Month',
          targetDate: endOfMonth.toISOString().slice(0, 16)
        }
      };
    } else if (widgetType === 'pomodoro') {
      extraProps = {
        widgetSettings: {
          ...widgetSettings,
          title: 'Focus Timer'
        }
      };
    } else if (widgetType === 'progress_bar') {
      extraProps = {
        widgetSettings: {
          ...widgetSettings,
          title: 'Goal Tracker'
        }
      };
    }

    await engine.convertType(block.id, widgetType);
    if (Object.keys(extraProps).length > 0) {
      await engine.updateBlock(block.id, {
        properties: {
          ...block.properties,
          ...extraProps
        }
      });
    }
  };

  const updateWidgetSetting = async (key, val) => {
    await engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...widgetSettings,
          [key]: val
        }
      }
    });
  };

  const handleSaveComment = async () => {
    await engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        caption: commentInput
      }
    });
    setCommentOpen(false);
  };

  const handleReset = async () => {
    if (isWidgetBlock) {
      // Convert back to widget selector type
      await engine.convertType(block.id, 'widget');
    } else {
      // Reset embed URL
      await engine.updateBlock(block.id, {
        properties: {
          url: '',
          caption: '',
          embedType: 'generic',
          width: '100%',
          height: 'auto'
        }
      });
      setInputUrl('');
    }
    setDropdownOpen(false);
    setCustomizerOpen(false);
    setCommentOpen(false);
  };

  const handleDuplicate = async () => {
    const { dispatch } = await import('../../../core/commandBus');
    await dispatch({
      type: 'block/create',
      payload: {
        pageId: block.pageId,
        type: block.type,
        parentId: block.parentId,
        afterBlockId: block.id,
        content: block.content,
        properties: { ...block.properties }
      }
    });
    setDropdownOpen(false);
  };

  // ─── Resizing Engine ───────────────────────────────────────────
  const startResizing = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: wrapperRef.current?.offsetWidth || 0,
      height: wrapperRef.current?.offsetHeight || 200,
      direction
    };

    window.addEventListener('mousemove', handleResizing);
    window.addEventListener('mouseup', stopResizing);
  };

  const handleResizing = (e) => {
    if (!resizeStartRef.current || !wrapperRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    if (resizeStartRef.current.direction === 'right' || resizeStartRef.current.direction === 'corner') {
      const newWidth = resizeStartRef.current.width + deltaX;
      const parentWidth = wrapperRef.current.parentElement?.offsetWidth || 800;
      const widthPercent = Math.min(Math.max((newWidth / parentWidth) * 100, 20), 100);
      wrapperRef.current.style.width = `${widthPercent}%`;
    }

    if (resizeStartRef.current.direction === 'bottom' || resizeStartRef.current.direction === 'corner') {
      const newHeight = resizeStartRef.current.height + deltaY;
      const heightPx = Math.min(Math.max(newHeight, 80), 800);
      wrapperRef.current.style.height = `${heightPx}px`;
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
    window.removeEventListener('mousemove', handleResizing);
    window.removeEventListener('mouseup', stopResizing);

    if (wrapperRef.current) {
      const parentWidth = wrapperRef.current.parentElement?.offsetWidth || 800;
      const widthPercent = Math.round((wrapperRef.current.offsetWidth / parentWidth) * 100);
      const heightPx = wrapperRef.current.offsetHeight;
      
      engine.updateBlock(block.id, { 
        properties: { 
          ...block.properties, 
          width: `${widthPercent}%`,
          height: `${heightPx}px` 
        } 
      });
    }
    
    resizeStartRef.current = null;
  };

  // Theme styling calculations
  const themeClass = widgetSettings.theme === 'glassmorphism' 
    ? 'widget-theme-glassmorphism' 
    : (widgetSettings.theme === 'sleekdark' ? 'widget-theme-sleekdark' : 'widget-theme-neobrutalist');

  const textColor = widgetSettings.theme === 'neobrutalist' ? widgetSettings.textColor : 'inherit';
  const bgColor = widgetSettings.theme === 'neobrutalist' ? widgetSettings.bgColor : 'transparent';

  const defaultHeight = isWidgetBlock ? '140px' : (effectiveType === 'youtube' ? '360px' : 'auto');
  const displayHeight = block.properties?.height || defaultHeight;

  // Render Widget Components
  const renderWidgetContent = () => {
    if (effectiveType === 'countdown') {
      return (
        <CountdownWidget 
          settings={widgetSettings} 
          themeClass={themeClass} 
          textColor={textColor} 
          bgColor={bgColor} 
        />
      );
    }
    if (effectiveType === 'pomodoro') {
      return (
        <PomodoroWidget 
          settings={widgetSettings} 
          themeClass={themeClass} 
          textColor={textColor} 
          bgColor={bgColor} 
          blockId={block.id}
          engine={engine}
        />
      );
    }
    if (effectiveType === 'progress_bar') {
      return (
        <ProgressWidget 
          block={block}
          themeClass={themeClass} 
          textColor={textColor} 
          bgColor={bgColor} 
          engine={engine}
        />
      );
    }
    return null;
  };

  // 1. Populated embed URL or native widget block
  if (showContent) {
    let displayUrl = url;
    try { displayUrl = new URL(url).hostname; } catch { /* keep full url */ }

    return (
      <div 
        ref={wrapperRef}
        className={`block-embed-wrapper ${isResizing ? 'resizing' : ''} ${focusBlockId === block.id ? 'focused' : ''}`}
        tabIndex={0} 
        onKeyDown={handleKeyDown}
        style={{
          width: width,
          height: displayHeight,
        }}
      >
        {isResizing && <div className="block-embed-resizing-overlay" />}
        
        {/* Floating Action Bar */}
        <div className="block-embed-action-bar" contentEditable={false}>
          <button 
            className={`block-embed-action-btn ${commentOpen ? 'active' : ''}`} 
            title="Comments/Caption"
            onClick={() => setCommentOpen(!commentOpen)}
          >
            <MessageSquare size={14} />
          </button>
          
          <button 
            className={`block-embed-action-btn ${customizerOpen ? 'active' : ''}`} 
            title="Widget Customizer"
            onClick={() => setCustomizerOpen(!customizerOpen)}
          >
            <Sliders size={14} />
          </button>

          {!isWidgetBlock && (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block-embed-action-btn" 
              title="Open link"
            >
              <ExternalLink size={14} />
            </a>
          )}

          <div style={{ position: 'relative' }}>
            <button 
              className={`block-embed-action-btn ${dropdownOpen ? 'active' : ''}`} 
              title="More Options"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <MoreHorizontal size={14} />
            </button>

            {dropdownOpen && (
              <div 
                className="block-embed-customizer" 
                style={{ top: '32px', right: 0, width: '160px', padding: '8px' }}
              >
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 8px', fontSize: '12px' }}
                  onClick={() => { setCustomizerOpen(true); setDropdownOpen(false); }}
                >
                  <Settings size={12} style={{ marginRight: '6px' }} /> Settings
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 8px', fontSize: '12px' }}
                  onClick={handleDuplicate}
                >
                  <Copy size={12} style={{ marginRight: '6px' }} /> Duplicate
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 8px', fontSize: '12px' }}
                  onClick={handleReset}
                >
                  <RotateCcw size={12} style={{ marginRight: '6px' }} /> {isWidgetBlock ? 'Change Widget' : 'Edit Link'}
                </button>
                <hr style={{ margin: '4px 0', borderColor: 'var(--border-subtle)' }} />
                <button 
                  className="btn btn-secondary text-danger" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 8px', fontSize: '12px', color: 'var(--error)' }}
                  onClick={() => engine.deleteBlock(block.id)}
                >
                  <Trash2 size={12} style={{ marginRight: '6px' }} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customizer Popover */}
        {customizerOpen && (
          <div className="block-embed-customizer" contentEditable={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Widget Settings</span>
              <button 
                onClick={() => setCustomizerOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Common Settings */}
            <div className="customizer-row">
              <label className="customizer-label">Widget Title</label>
              <input 
                type="text" 
                className="customizer-input" 
                value={widgetSettings.title}
                onChange={(e) => updateWidgetSetting('title', e.target.value)}
              />
            </div>

            <div className="customizer-row">
              <label className="customizer-label">Widget Theme</label>
              <select 
                className="customizer-select"
                value={widgetSettings.theme}
                onChange={(e) => updateWidgetSetting('theme', e.target.value)}
              >
                <option value="neobrutalist">Neobrutalist (Mockup Style)</option>
                <option value="glassmorphism">Glassmorphism Blur</option>
                <option value="sleekdark">Sleek Dark Gradient</option>
              </select>
            </div>

            {widgetSettings.theme === 'neobrutalist' && (
              <div className="customizer-flex-row">
                <div className="customizer-row">
                  <label className="customizer-label">Background</label>
                  <input 
                    type="color" 
                    className="customizer-input" 
                    style={{ height: '32px', padding: '2px' }}
                    value={widgetSettings.bgColor}
                    onChange={(e) => updateWidgetSetting('bgColor', e.target.value)}
                  />
                </div>
                <div className="customizer-row">
                  <label className="customizer-label">Text Color</label>
                  <input 
                    type="color" 
                    className="customizer-input" 
                    style={{ height: '32px', padding: '2px' }}
                    value={widgetSettings.textColor}
                    onChange={(e) => updateWidgetSetting('textColor', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Countdown-specific Settings */}
            {effectiveType === 'countdown' && (
              <div className="customizer-row">
                <label className="customizer-label">Target Date/Time</label>
                <input 
                  type="datetime-local" 
                  className="customizer-input" 
                  value={widgetSettings.targetDate}
                  onChange={(e) => updateWidgetSetting('targetDate', e.target.value)}
                />
              </div>
            )}

            {/* Pomodoro-specific Settings */}
            {effectiveType === 'pomodoro' && (
              <div className="customizer-flex-row">
                <div className="customizer-row">
                  <label className="customizer-label">Work Min</label>
                  <input 
                    type="number" 
                    className="customizer-input" 
                    min={1} 
                    max={180}
                    value={widgetSettings.workTime}
                    onChange={(e) => updateWidgetSetting('workTime', parseInt(e.target.value) || 25)}
                  />
                </div>
                <div className="customizer-row">
                  <label className="customizer-label">Break Min</label>
                  <input 
                    type="number" 
                    className="customizer-input" 
                    min={1} 
                    max={60}
                    value={widgetSettings.breakTime}
                    onChange={(e) => updateWidgetSetting('breakTime', parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>
            )}

            {/* Progress-specific Settings */}
            {effectiveType === 'progress_bar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="customizer-flex-row">
                  <div className="customizer-row">
                    <label className="customizer-label">Current</label>
                    <input 
                      type="number" 
                      className="customizer-input" 
                      value={widgetSettings.current ?? 0}
                      onChange={(e) => updateWidgetSetting('current', Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div className="customizer-row">
                    <label className="customizer-label">Goal Target</label>
                    <input 
                      type="number" 
                      className="customizer-input" 
                      min={1}
                      value={widgetSettings.target ?? 10}
                      onChange={(e) => updateWidgetSetting('target', Math.max(1, parseInt(e.target.value) || 10))}
                    />
                  </div>
                </div>
                
                <div className="customizer-flex-row">
                  <div className="customizer-row">
                    <label className="customizer-label">Unit Label</label>
                    <input 
                      type="text" 
                      className="customizer-input" 
                      placeholder="e.g. books"
                      value={widgetSettings.unit || ''}
                      onChange={(e) => updateWidgetSetting('unit', e.target.value)}
                    />
                  </div>
                  <div className="customizer-row">
                    <label className="customizer-label">Increment Step</label>
                    <input 
                      type="number" 
                      className="customizer-input" 
                      min={1}
                      value={widgetSettings.step ?? 1}
                      onChange={(e) => updateWidgetSetting('step', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>

                <div className="customizer-flex-row">
                  <div className="customizer-row">
                    <label className="customizer-label">Gradient Theme</label>
                    <select 
                      className="customizer-select"
                      value={widgetSettings.gradient || 'lavender'}
                      onChange={(e) => updateWidgetSetting('gradient', e.target.value)}
                    >
                      <option value="lavender">Default Lavender</option>
                      <option value="sunset">Sunset Fire</option>
                      <option value="ocean">Ocean Breeze</option>
                      <option value="forest">Forest Glow</option>
                      <option value="midnight">Midnight Purple</option>
                      <option value="gold">Electric Gold</option>
                    </select>
                  </div>
                  <div className="customizer-row">
                    <label className="customizer-label">Icon</label>
                    <select 
                      className="customizer-select"
                      value={widgetSettings.icon || 'target'}
                      onChange={(e) => updateWidgetSetting('icon', e.target.value)}
                    >
                      <option value="target">Target</option>
                      <option value="trophy">Trophy</option>
                      <option value="flame">Flame</option>
                      <option value="star">Star</option>
                      <option value="book">Book</option>
                      <option value="coffee">Coffee</option>
                      <option value="heart">Heart</option>
                      <option value="smile">Smile</option>
                      <option value="check">Check</option>
                      <option value="none">Question Mark</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="block-embed-container">
          {/* 1. Widgets */}
          {isWidgetBlock && renderWidgetContent()}

          {/* 2. YouTube iframe */}
          {effectiveType === 'youtube' && (
            <iframe
              className="block-embed-iframe"
              src={`https://www.youtube.com/embed/${extractYouTubeId(url)}?rel=0&modestbranding=1`}
              title={caption || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}

          {/* 3. Generic web link bookmark */}
          {effectiveType === 'generic' && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block-embed-link"
              style={{ height: '100%' }}
            >
              <div className="block-embed-link-icon">
                <Globe size={18} />
              </div>
              <div className="block-embed-link-text">
                <div className="block-embed-link-title">{caption || url}</div>
                <div className="block-embed-link-url">{displayUrl}</div>
              </div>
              <ExternalLink size={14} style={{ opacity: 0.5, marginLeft: '8px' }} />
            </a>
          )}
        </div>

        {/* Caption/Comment Panel */}
        {commentOpen && (
          <div className="block-embed-comment-box" contentEditable={false}>
            <input 
              type="text" 
              className="block-embed-comment-input" 
              placeholder="Add annotation, caption or notes..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveComment()}
            />
            <button className="block-embed-comment-btn" onClick={handleSaveComment}>
              <Check size={14} />
            </button>
          </div>
        )}

        {/* Resize Handles */}
        <div className="embed-resizer-handle right" onMouseDown={(e) => startResizing(e, 'right')} />
        <div className="embed-resizer-handle bottom" onMouseDown={(e) => startResizing(e, 'bottom')} />
        <div className="embed-resizer-handle corner" onMouseDown={(e) => startResizing(e, 'corner')} />
      </div>
    );
  }

  // 2. Widget Selector block choice UI
  if (isWidgetSelector) {
    return (
      <div className="block-embed-wrapper" tabIndex={0}>
        <div className="block-embed-input-container">
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Select an Interactive Widget
          </div>
          <div className="embed-widgets-grid">
            <div className="embed-widget-card" onClick={() => handleSelectWidgetType('countdown')}>
              <Calendar size={20} />
              <div className="embed-widget-title">Countdown</div>
              <div className="embed-widget-desc">Days & hours left in month or date</div>
            </div>
            <div className="embed-widget-card" onClick={() => handleSelectWidgetType('pomodoro')}>
              <Clock size={20} />
              <div className="embed-widget-title">Pomodoro</div>
              <div className="embed-widget-desc">Clean focus Pomodoro timer</div>
            </div>
            <div className="embed-widget-card" onClick={() => handleSelectWidgetType('progress_bar')}>
              <Target size={20} />
              <div className="embed-widget-title">Progress Tracker</div>
              <div className="embed-widget-desc">Goal counter and bar tracker</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Simple URL Embed Input Block (No tabs!)
  return (
    <div className="block-embed-wrapper" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="block-embed-input-container">
        <form style={{ width: '100%' }} onSubmit={handleSubmitUrl}>
          <div className="block-embed-input-group">
            <input
              autoFocus
              type="text"
              className="block-embed-input"
              placeholder="Paste a YouTube or web link..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
            <button 
              type="submit" 
              className="block-embed-submit-btn"
              disabled={!inputUrl || isSubmitting}
            >
              {isSubmitting ? 'Embedding...' : 'Embed'}
            </button>
          </div>
          <div className="block-embed-type-hint" style={{ marginTop: '12px', justifyContent: 'center' }}>
            <Play size={14} /> YouTube
            <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
            <Globe size={14} /> Web Link
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Child Widget Components ─────────────────────────────────────

function CountdownWidget({ settings, themeClass, textColor, bgColor }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      let target;
      if (settings.targetDate) {
        target = new Date(settings.targetDate);
      } else {
        const now = new Date();
        target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.targetDate]);

  return (
    <div 
      className={`widget-countdown-container ${themeClass}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="widget-countdown-cards">
        <div className="widget-countdown-card">
          <span className="widget-countdown-value">{timeLeft.days}</span>
          <span className="widget-countdown-unit">days</span>
        </div>
        <div className="widget-countdown-card">
          <span className="widget-countdown-value">{timeLeft.hours}</span>
          <span className="widget-countdown-unit">hours</span>
        </div>
        <div className="widget-countdown-card">
          <span className="widget-countdown-value">{timeLeft.minutes}</span>
          <span className="widget-countdown-unit">mins</span>
        </div>
        <div className="widget-countdown-card">
          <span className="widget-countdown-value">{timeLeft.seconds}</span>
          <span className="widget-countdown-unit">secs</span>
        </div>
      </div>
      <div className="widget-countdown-label">
        {settings.title || 'Left in This Month'}
      </div>
    </div>
  );
}

function PomodoroWidget({ settings, themeClass, textColor, bgColor, blockId, engine }) {
  const [mode, setMode] = useState('focus'); // 'focus' | 'short_break' | 'long_break'
  const [timeLeft, setTimeLeft] = useState(settings.workTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning) {
      if (mode === 'focus') setTimeLeft(settings.workTime * 60);
      else if (mode === 'short_break') setTimeLeft(settings.breakTime * 60);
      else if (mode === 'long_break') setTimeLeft(15 * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workTime, settings.breakTime]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            clearInterval(intervalRef.current);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    if (newMode === 'focus') setTimeLeft(settings.workTime * 60);
    else if (newMode === 'short_break') setTimeLeft(settings.breakTime * 60);
    else if (newMode === 'long_break') setTimeLeft(15 * 60);
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // high tone
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`widget-pomodoro-container ${themeClass}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="widget-pomodoro-modes">
        <button 
          className={`widget-pomodoro-mode-btn ${mode === 'focus' ? 'active' : ''}`}
          onClick={() => handleModeChange('focus')}
        >
          Focus
        </button>
        <button 
          className={`widget-pomodoro-mode-btn ${mode === 'short_break' ? 'active' : ''}`}
          onClick={() => handleModeChange('short_break')}
        >
          Break
        </button>
        <button 
          className={`widget-pomodoro-mode-btn ${mode === 'long_break' ? 'active' : ''}`}
          onClick={() => handleModeChange('long_break')}
        >
          Long Break
        </button>
      </div>
      <div className="widget-pomodoro-time">{formatTime(timeLeft)}</div>
      <div className="widget-pomodoro-controls">
        <button 
          className="widget-pomodoro-btn primary-action"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause size={12} /> : <Play size={12} />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button 
          className="widget-pomodoro-btn"
          onClick={() => {
            setIsRunning(false);
            if (mode === 'focus') setTimeLeft(settings.workTime * 60);
            else if (mode === 'short_break') setTimeLeft(settings.breakTime * 60);
            else if (mode === 'long_break') setTimeLeft(15 * 60);
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}

function ProgressWidget({ block, themeClass, textColor, bgColor, engine }) {
  const settings = block.properties?.widgetSettings || {};
  const goals = settings.goals || [];
  const hasGoals = goals.length > 0;
  
  // Dynamic resolution of current and target based on sub-goals checklist
  const current = hasGoals ? goals.filter(g => g.completed).length : (settings.current || 0);
  const target = hasGoals ? goals.length : (settings.target || 10);
  const unit = settings.unit || '';
  const step = settings.step || 1;
  const gradient = settings.gradient || 'lavender';
  const iconName = settings.icon || 'target';

  // Display value can be tempCurrent (if dragging) or calculated current
  const [tempCurrent, setTempCurrent] = useState(null);
  const displayCurrent = tempCurrent !== null ? tempCurrent : current;
  const percentage = Math.round((displayCurrent / target) * 100);
  const isCompleted = displayCurrent >= target;

  // Title inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(settings.title || 'Goal Progress');

  // Stats inline editing state
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [currentInput, setCurrentInput] = useState(current.toString());
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(target.toString());

  // Sub-goals checklist local states
  const [newGoalText, setNewGoalText] = useState('');
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalEditText, setGoalEditText] = useState('');

  // Dragging states
  const barRef = useRef(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  // Confetti states
  const canvasRef = useRef(null);
  const [showCanvas, setShowCanvas] = useState(false);

  // Track previous value to trigger celebration confetti
  const prevCurrentRef = useRef(current);

  useEffect(() => {
    setTitleInput(settings.title || 'Goal Progress');
  }, [settings.title]);

  useEffect(() => {
    setCurrentInput(current.toString());
  }, [current]);

  useEffect(() => {
    setTargetInput(target.toString());
  }, [target]);

  // Confetti triggering on transition to completed
  useEffect(() => {
    if (current >= target && prevCurrentRef.current < target) {
      triggerConfetti();
    }
    prevCurrentRef.current = current;
  }, [current, target]);

  const triggerConfetti = () => {
    setShowCanvas(true);
    // Give state a frame to render the canvas
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.offsetWidth || 400;
      canvas.height = canvas.parentElement.offsetHeight || 140;

      const colors = ['#2E5BFF', '#8B5CF6', '#4ade80', '#facc15', '#f87171', '#FF512F', '#00F2FE'];
      const particles = [];
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 40,
          y: canvas.height / 2 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4 - 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 5 + 3,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          opacity: 1,
          decay: Math.random() * 0.018 + 0.012
        });
      }

      let animId;
      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = 0;
        particles.forEach(p => {
          if (p.opacity <= 0) return;
          active++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.14; // gravity
          p.vx *= 0.98; // drag
          p.rotation += p.rotationSpeed;
          p.opacity -= p.decay;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });

        if (active > 0) {
          animId = requestAnimationFrame(render);
        } else {
          setShowCanvas(false);
        }
      };
      render();
    }, 50);
  };

  const handleIncrement = () => {
    if (hasGoals) return;
    const nextVal = Math.min(target, current + step);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          current: nextVal
        }
      }
    });
  };

  const handleDecrement = () => {
    if (hasGoals) return;
    const nextVal = Math.max(0, current - step);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          current: nextVal
        }
      }
    });
  };

  const handleSaveTitle = () => {
    const val = titleInput.trim();
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          title: val || 'Goal Progress'
        }
      }
    });
    setIsEditingTitle(false);
  };

  const handleSaveCurrent = () => {
    if (hasGoals) return;
    const val = Math.max(0, parseInt(currentInput) || 0);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          current: val
        }
      }
    });
    setIsEditingCurrent(false);
  };

  const handleSaveTarget = () => {
    if (hasGoals) return;
    const val = Math.max(1, parseInt(targetInput) || 10);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          target: val
        }
      }
    });
    setIsEditingTarget(false);
  };

  const handleBarMouseDown = (e) => {
    if (hasGoals || isEditingCurrent || isEditingTarget) return;
    e.preventDefault();
    setIsDraggingProgress(true);

    const updateTempFromX = (clientX) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const width = rect.width;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, width));
      const pct = offsetX / width;
      const val = Math.round(pct * target);
      setTempCurrent(val);
      return val;
    };

    let finalVal = updateTempFromX(e.clientX);

    const handleMouseMove = (moveEvent) => {
      finalVal = updateTempFromX(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDraggingProgress(false);

      engine.updateBlock(block.id, {
        properties: {
          ...block.properties,
          widgetSettings: {
            ...settings,
            current: finalVal
          }
        }
      });
      setTempCurrent(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Sub-goals checklist operations
  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;
    const newGoal = {
      id: Math.random().toString(36).substring(2, 9),
      text: newGoalText.trim(),
      completed: false
    };
    const updatedGoals = [...goals, newGoal];
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          goals: updatedGoals,
          target: updatedGoals.length,
          current: updatedGoals.filter(g => g.completed).length
        }
      }
    });
    setNewGoalText('');
  };

  const handleToggleGoal = (id) => {
    const updatedGoals = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          goals: updatedGoals,
          current: updatedGoals.filter(g => g.completed).length
        }
      }
    });
  };

  const handleStartEditGoal = (id, text) => {
    setEditingGoalId(id);
    setGoalEditText(text);
  };

  const handleSaveGoalText = (id) => {
    if (!goalEditText.trim()) return;
    const updatedGoals = goals.map(g => g.id === id ? { ...g, text: goalEditText.trim() } : g);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          goals: updatedGoals
        }
      }
    });
    setEditingGoalId(null);
  };

  const handleDeleteGoal = (id) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        widgetSettings: {
          ...settings,
          goals: updatedGoals,
          target: updatedGoals.length,
          current: updatedGoals.filter(g => g.completed).length
        }
      }
    });
  };

  // Icon mapping
  const IconComponent = (() => {
    const IconMap = {
      target: Target,
      trophy: Trophy,
      flame: Flame,
      star: Star,
      book: Book,
      coffee: Coffee,
      heart: Heart,
      smile: Smile,
      check: CheckCircle,
      none: HelpCircle
    };
    return IconMap[iconName] || Target;
  })();

  const gradientClass = `gradient-${gradient}`;

  return (
    <div 
      className={`widget-progress-container ${themeClass}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {showCanvas && (
        <canvas ref={canvasRef} className="widget-progress-canvas" />
      )}

      <div className="widget-progress-header">
        <div className="widget-progress-title-wrapper">
          <div className={`widget-progress-icon ${isCompleted ? 'completed' : ''}`}>
            <IconComponent size={16} />
          </div>
          {isEditingTitle ? (
            <input
              autoFocus
              type="text"
              className="widget-progress-title-input"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            />
          ) : (
            <div 
              className="widget-progress-title" 
              onDoubleClick={() => setIsEditingTitle(true)}
              title="Double click to rename"
            >
              {settings.title || 'Goal Progress'}
            </div>
          )}
        </div>

        <div className={`widget-progress-stats ${isCompleted ? 'completed' : ''}`}>
          {isEditingCurrent ? (
            <input
              autoFocus
              disabled={hasGoals}
              type="number"
              className="widget-progress-stats-input"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onBlur={handleSaveCurrent}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrent()}
            />
          ) : (
            <span 
              onClick={() => !hasGoals && setIsEditingCurrent(true)}
              title={hasGoals ? "Controlled by sub-goals list" : "Click to edit current progress"}
              style={{ cursor: hasGoals ? 'default' : 'pointer' }}
            >
              {displayCurrent}
            </span>
          )}
          <span>/</span>
          {isEditingTarget ? (
            <input
              autoFocus
              disabled={hasGoals}
              type="number"
              className="widget-progress-stats-input"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onBlur={handleSaveTarget}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
            />
          ) : (
            <span 
              onClick={() => !hasGoals && setIsEditingTarget(true)}
              title={hasGoals ? "Controlled by sub-goals list" : "Click to edit target goal"}
              style={{ cursor: hasGoals ? 'default' : 'pointer' }}
            >
              {target}
            </span>
          )}
          {unit && <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '4px' }}>{unit}</span>}
          <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '6px' }}>({percentage}%)</span>
        </div>
      </div>

      <div 
        ref={barRef}
        className={`widget-progress-bar-bg ${isCompleted ? 'completed' : ''}`}
        onMouseDown={handleBarMouseDown}
        style={{ cursor: hasGoals ? 'default' : 'ew-resize' }}
        title={hasGoals ? "Progress controlled by sub-goals checklist below" : "Click and drag to scrub progress"}
      >
        <div 
          className={`widget-progress-bar-fill ${gradientClass} ${isCompleted ? 'completed' : ''}`} 
          style={{ width: `${Math.min(percentage, 100)}%` }} 
        />
      </div>

      {/* Checklist of sub-goals */}
      <div className="widget-progress-goals-list" contentEditable={false}>
        {goals.map(goal => (
          <div key={goal.id} className="widget-progress-goal-item">
            <div 
              className={`widget-progress-goal-checkbox ${goal.completed ? 'checked' : ''}`}
              onClick={() => handleToggleGoal(goal.id)}
            >
              <Check size={10} strokeWidth={3} />
            </div>
            {editingGoalId === goal.id ? (
              <input
                autoFocus
                type="text"
                className="widget-progress-goal-input"
                value={goalEditText}
                onChange={(e) => setGoalEditText(e.target.value)}
                onBlur={() => handleSaveGoalText(goal.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveGoalText(goal.id)}
              />
            ) : (
              <div 
                className={`widget-progress-goal-label ${goal.completed ? 'completed' : ''}`}
                onDoubleClick={() => handleStartEditGoal(goal.id, goal.text)}
                title="Double click to edit text"
              >
                {goal.text}
              </div>
            )}
            <button 
              className="widget-progress-goal-delete" 
              onClick={() => handleDeleteGoal(goal.id)}
              title="Delete sub-goal"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        
        <input
          type="text"
          className="widget-progress-add-goal-input"
          placeholder="+ Add a sub-goal goal..."
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
        />
      </div>

      <div className="widget-progress-actions">
        {hasGoals ? (
          <span className="widget-progress-step-label" style={{ marginRight: 'auto', opacity: 0.6 }}>Check off goals to progress</span>
        ) : (
          step > 1 && (
            <span className="widget-progress-step-label">Step: ±{step}</span>
          )
        )}
        <button 
          className="widget-progress-btn" 
          onClick={handleDecrement} 
          disabled={hasGoals || current <= 0}
          title={hasGoals ? "Manual counter disabled" : `Decrease by ${step}`}
        >
          <Minus size={12} />
        </button>
        <button 
          className="widget-progress-btn" 
          onClick={handleIncrement} 
          disabled={hasGoals || current >= target}
          title={hasGoals ? "Manual counter disabled" : `Increase by ${step}`}
        >
          <Plus size={12} />
        </button>
        {isCompleted && (
          <button 
            className="widget-progress-btn widget-progress-celebrate-btn" 
            onClick={triggerConfetti}
            title="Celebrate!"
          >
            🎉
          </button>
        )}
      </div>
    </div>
  );
}

function extractYouTubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}
