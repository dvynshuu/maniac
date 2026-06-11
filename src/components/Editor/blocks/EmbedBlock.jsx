import { useState, useEffect, useRef } from 'react';
import { 
  ExternalLink, Play, Globe, Clock, Target, Calendar, 
  Plus, Minus, MessageSquare, Settings, Sliders, Pause, 
  RotateCcw, MoreHorizontal, Check, Trash2, Copy, X
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
    theme: 'neobrutalist',
    bgColor: '#e0f2fe',
    textColor: '#0f172a',
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
          settings={widgetSettings} 
          themeClass={themeClass} 
          textColor={textColor} 
          bgColor={bgColor} 
          blockId={block.id}
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
              <div className="customizer-flex-row">
                <div className="customizer-row">
                  <label className="customizer-label">Current</label>
                  <input 
                    type="number" 
                    className="customizer-input" 
                    value={widgetSettings.current}
                    onChange={(e) => updateWidgetSetting('current', Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <div className="customizer-row">
                  <label className="customizer-label">Goal Target</label>
                  <input 
                    type="number" 
                    className="customizer-input" 
                    min={1}
                    value={widgetSettings.target}
                    onChange={(e) => updateWidgetSetting('target', Math.max(1, parseInt(e.target.value) || 10))}
                  />
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
  }, [settings.workTime, settings.breakTime, mode, isRunning]);

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

function ProgressWidget({ settings, themeClass, textColor, bgColor, blockId, engine }) {
  const current = settings.current || 0;
  const target = settings.target || 10;
  const percentage = Math.round((current / target) * 100);

  const handleIncrement = () => {
    if (current < target) {
      engine.updateBlock(blockId, {
        properties: {
          ...settings,
          widgetSettings: {
            ...settings.widgetSettings,
            current: current + 1
          }
        }
      });
    }
  };

  const handleDecrement = () => {
    if (current > 0) {
      engine.updateBlock(blockId, {
        properties: {
          ...settings,
          widgetSettings: {
            ...settings.widgetSettings,
            current: current - 1
          }
        }
      });
    }
  };

  return (
    <div 
      className={`widget-progress-container ${themeClass}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="widget-progress-header">
        <div className="widget-progress-title">{settings.title || 'Goal Progress'}</div>
        <div className="widget-progress-stats">{current} / {target} ({percentage}%)</div>
      </div>
      <div className="widget-progress-bar-bg">
        <div className="widget-progress-bar-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <div className="widget-progress-actions">
        <button className="widget-progress-btn" onClick={handleDecrement} disabled={current <= 0}>
          <Minus size={12} />
        </button>
        <button className="widget-progress-btn" onClick={handleIncrement} disabled={current >= target}>
          <Plus size={12} />
        </button>
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
