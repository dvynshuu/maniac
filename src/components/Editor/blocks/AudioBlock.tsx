import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Music, Upload, 
  ExternalLink, RotateCcw, FastForward, Trash2 
} from 'lucide-react';
import { useBlockStore } from '../../../stores/blockStore';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';
import { useEditorEngine } from '../../../hooks/useEditorEngine';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function AudioBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [caption, setCaption] = useState(block.properties?.caption || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;
  const hash = block.properties?.hash;
  const name = block.properties?.name || 'Audio Track';

  // Resolve blob reference
  useEffect(() => {
    let cancelled = false;
    if (!src && !hash) {
      setRenderUrl(null);
      return;
    }
    const ref = src || (hash ? `blob://${hash}` : null);
    if (!ref) {
      setRenderUrl(null);
      return;
    }

    if (isBlobRef(ref)) {
      loadBlobUrl(ref).then(url => {
        if (!cancelled) setRenderUrl(url);
      });
    } else {
      setRenderUrl(ref);
    }

    return () => { cancelled = true; };
  }, [src, hash]);

  useEffect(() => {
    if (block.properties?.caption !== undefined) {
      setCaption(block.properties.caption);
    }
  }, [block.properties?.caption]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.warn('Audio play error:', e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ref = await storeBlob(file);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: ref,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'audio/mpeg',
      }
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const filename = urlInput.split('/').pop()?.split('?')[0] || 'Audio Stream';
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: urlInput.trim(),
        name: filename,
        mimeType: 'audio/mpeg',
      }
    });
    setShowUrlInput(false);
  };

  const handleClear = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setRenderUrl(null);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: '',
        hash: '',
        name: '',
      }
    });
  };

  if (renderUrl || src || hash) {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div 
        className="block-audio-container" 
        tabIndex={0}
        style={{
          outline: focusBlockId === block.id ? '2px solid var(--accent-primary, #6366f1)' : 'none'
        }}
      >
        <audio
          ref={audioRef}
          src={renderUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />

        <div className="block-audio-player">
          {/* Play/Pause Button */}
          <button 
            type="button" 
            className="block-audio-play-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>

          {/* Track info & Scrubber */}
          <div className="block-audio-track-info">
            <div className="block-audio-header">
              <span className="block-audio-title" title={name}>{name}</span>
              <span className="block-audio-timestamps">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="block-audio-scrubber-wrapper">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="block-audio-scrubber"
                style={{
                  background: `linear-gradient(to right, var(--color-primary-bg, #fff) ${progressPercent}%, var(--color-border, #262626) ${progressPercent}%)`
                }}
              />
            </div>
          </div>

          {/* Quick Controls */}
          <div className="block-audio-controls">
            <button
              type="button"
              className="block-audio-speed-btn"
              onClick={cycleSpeed}
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              className="block-audio-icon-btn"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button
              type="button"
              className="block-audio-icon-btn danger"
              onClick={handleClear}
              title="Remove audio"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <textarea
          className="block-media-caption"
          placeholder="Add a caption…"
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            engine.updateBlock(block.id, { properties: { ...block.properties, caption: e.target.value } });
          }}
          rows={1}
        />
      </div>
    );
  }

  return (
    <div className="block-audio-empty-wrapper">
      {!showUrlInput ? (
        <div className="block-audio-dropzone" onClick={() => fileInputRef.current?.click()}>
          <Music size={26} className="text-tertiary" />
          <div className="block-audio-dropzone-text">
            <span className="title">Upload audio file</span>
            <span className="subtitle">MP3, WAV, M4A, OGG up to 50MB</span>
          </div>
          <button 
            type="button" 
            className="block-file-link-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setShowUrlInput(true);
            }}
          >
            <ExternalLink size={12} />
            <span>Embed URL</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="audio/*"
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
      ) : (
        <form onSubmit={handleUrlSubmit} className="block-file-url-form">
          <input
            type="url"
            placeholder="Paste direct audio URL (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="block-file-url-input"
            autoFocus
          />
          <button type="submit" className="block-file-url-btn primary">Embed Audio</button>
          <button type="button" className="block-file-url-btn" onClick={() => setShowUrlInput(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}
