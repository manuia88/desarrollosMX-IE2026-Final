'use client';

// F14.F.7 Sprint 6 Tarea 6.5 (Upgrade 5) — Drag-slider before/after comparator.
// Soporta image y video. Keyboard left/right (5%). Touch + mouse drag.

import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useId, useRef, useState } from 'react';

export type SideBySideMediaType = 'image' | 'video';
export type SideBySideAspectRatio = '16/9' | '9/16' | '1/1';

export interface SideBySideMedia {
  readonly url: string;
  readonly label: string;
}

export interface SideBySideComparisonProps {
  readonly before: SideBySideMedia;
  readonly after: SideBySideMedia;
  readonly aspectRatio?: SideBySideAspectRatio;
  readonly mediaType?: SideBySideMediaType;
}

const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v'];

function inferMediaType(url: string, override?: SideBySideMediaType): SideBySideMediaType {
  if (override) {
    return override;
  }
  const lower = url.toLowerCase().split('?')[0] ?? '';
  return VIDEO_EXT.some((ext) => lower.endsWith(ext)) ? 'video' : 'image';
}

function clampPercent(p: number): number {
  if (Number.isNaN(p)) {
    return 50;
  }
  if (p < 0) {
    return 0;
  }
  if (p > 100) {
    return 100;
  }
  return p;
}

function containerStyle(aspectRatio: SideBySideAspectRatio): CSSProperties {
  return {
    position: 'relative',
    width: '100%',
    aspectRatio,
    overflow: 'hidden',
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--surface-recessed)',
    border: '1px solid var(--canon-border)',
    userSelect: 'none',
    touchAction: 'none',
  };
}

const mediaBaseStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
};

function clipStyle(splitPercent: number): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
  };
}

function handleStyle(splitPercent: number): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: `${splitPercent}%`,
    width: '2px',
    transform: 'translateX(-1px)',
    background: 'rgba(255,255,255,0.85)',
    boxShadow: '0 0 12px rgba(168, 85, 247, 0.55)',
    cursor: 'ew-resize',
    pointerEvents: 'none',
  };
}

function knobStyle(splitPercent: number): CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    left: `${splitPercent}%`,
    transform: 'translate(-50%, -50%)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--gradient-ai)',
    border: '2px solid #FFFFFF',
    boxShadow: 'var(--shadow-canon-spotlight)',
    cursor: 'ew-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    fontWeight: 700,
    pointerEvents: 'none',
  };
}

function labelStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    top: '12px',
    [side === 'left' ? 'left' : 'right']: '12px',
    padding: '4px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    background: 'rgba(0,0,0,0.55)',
    color: '#FFFFFF',
    fontFamily: 'var(--font-body)',
    fontSize: '11.5px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    pointerEvents: 'none',
  };
}

function renderMedia(media: SideBySideMedia, type: SideBySideMediaType, label: string) {
  if (type === 'video') {
    return (
      <video
        src={media.url}
        muted
        autoPlay
        loop
        playsInline
        aria-label={label}
        style={mediaBaseStyle}
      />
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: arbitrary signed storage URL comparison preview, fill behavior intentional.
    <img src={media.url} alt={label} style={mediaBaseStyle} />
  );
}

export function SideBySideComparison({
  before,
  after,
  aspectRatio = '16/9',
  mediaType,
}: SideBySideComparisonProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const id = useId();
  const sliderId = `${id}-slider`;

  const beforeType = inferMediaType(before.url, mediaType);
  const afterType = inferMediaType(after.url, mediaType);

  const updateFromClientX = useCallback((clientX: number) => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const raw = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(clampPercent(raw));
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      const node = containerRef.current;
      if (node && typeof node.setPointerCapture === 'function') {
        try {
          node.setPointerCapture(event.pointerId);
        } catch {
          // ignore browsers that throw on capture
        }
      }
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    const node = containerRef.current;
    if (node && typeof node.releasePointerCapture === 'function') {
      try {
        node.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // Click-to-position when not dragging
      if (draggingRef.current) {
        return;
      }
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSplitPercent((prev) => clampPercent(prev - 5));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSplitPercent((prev) => clampPercent(prev + 5));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setSplitPercent(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSplitPercent(100);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Comparación antes y después"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(splitPercent)}
      aria-valuetext={`Antes ${Math.round(splitPercent)}% / Después ${100 - Math.round(splitPercent)}%`}
      id={sliderId}
      data-testid="side-by-side-comparison"
      data-split-percent={Math.round(splitPercent)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={containerStyle(aspectRatio)}
    >
      {/* After (full background) */}
      <div data-testid="side-by-side-after" style={mediaBaseStyle}>
        {renderMedia(after, afterType, after.label)}
      </div>
      {/* Before (clipped overlay) */}
      <div data-testid="side-by-side-before" style={clipStyle(splitPercent)}>
        {renderMedia(before, beforeType, before.label)}
      </div>
      {/* Labels */}
      <span style={labelStyle('left')}>{before.label}</span>
      <span style={labelStyle('right')}>{after.label}</span>
      {/* Divider line + knob */}
      <span aria-hidden style={handleStyle(splitPercent)} />
      <span aria-hidden style={knobStyle(splitPercent)}>
        ||
      </span>
    </div>
  );
}
