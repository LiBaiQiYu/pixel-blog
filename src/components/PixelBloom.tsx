import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const OPEN_DURATION = 300;
const CLOSE_DURATION = 250;
const CONTENT_DELAY = 120;
const SOURCE_REVEAL_DELAY = 200;
const UNMOUNT_DELAY = 280;

const TRANSITION_OPEN =
  'left 300ms ease-out, top 300ms ease-out, width 300ms ease-out, height 300ms ease-out, border-radius 300ms ease-out, opacity 300ms ease-out';
const TRANSITION_CLOSE =
  'left 250ms ease-in, top 250ms ease-in, width 250ms ease-in, height 250ms ease-in, border-radius 250ms ease-in, opacity 250ms ease-in';

function toBox(rect: DOMRect): Box {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    radius: 16,
  };
}

function getTargetBox(
  origin: DOMRect,
  targetWidth: number,
  targetHeight: number,
  targetRadius: number
): Box {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(targetWidth, viewportWidth - 24);
  const height = Math.min(targetHeight, viewportHeight - 48);
  const left = Math.min(
    Math.max(origin.left + origin.width / 2 - width / 2, 12),
    Math.max(12, viewportWidth - width - 12)
  );
  let top = origin.top - height - 16;
  if (top < 12) top = origin.bottom + 16;
  if (top + height > viewportHeight - 12) {
    top = Math.max(12, (viewportHeight - height) / 2);
  }

  return { left, top, width, height, radius: targetRadius };
}

export interface PixelBloomProps {
  open: boolean;
  originRect: DOMRect | null;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  targetWidth?: number;
  targetHeight?: number;
  targetRadius?: number;
  zIndex?: number;
  lockScroll?: boolean;
  panelClassName?: string;
  backdropClassName?: string;
  sourceRevealDelay?: number;
  onSourceVisibilityChange?: (hidden: boolean) => void;
}

export const PixelBloom: React.FC<PixelBloomProps> = ({
  open,
  originRect,
  onClose,
  ariaLabel,
  children,
  targetWidth = 720,
  targetHeight = 600,
  targetRadius = 18,
  zIndex = 91,
  lockScroll = false,
  panelClassName = '',
  backdropClassName = 'bg-slate-950/45',
  sourceRevealDelay = SOURCE_REVEAL_DELAY,
  onSourceVisibilityChange,
}) => {
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const openStateRef = useRef(false);
  const unmountTimerRef = useRef<number | null>(null);
  const sourceTimerRef = useRef<number | null>(null);
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);
  const contentTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    if (sourceTimerRef.current !== null) {
      window.clearTimeout(sourceTimerRef.current);
      sourceTimerRef.current = null;
    }
    if (contentTimerRef.current !== null) {
      window.clearTimeout(contentTimerRef.current);
      contentTimerRef.current = null;
    }
    if (firstFrameRef.current !== null) {
      window.cancelAnimationFrame(firstFrameRef.current);
      firstFrameRef.current = null;
    }
    if (secondFrameRef.current !== null) {
      window.cancelAnimationFrame(secondFrameRef.current);
      secondFrameRef.current = null;
    }
  };

  useEffect(() => {
    // Guard on the open transition: this effect re-runs when `mounted` flips,
    // and clearing timers then would cancel the expansion frames scheduled by
    // the layout effect below, leaving the panel stuck at the origin box.
    if (open && originRect) {
      if (openStateRef.current) return;
      openStateRef.current = true;
      clearTimers();
      setMounted(true);
      setBox(toBox(originRect));
      setExpanded(false);
      setBackdropVisible(false);
      setPanelVisible(false);
      onSourceVisibilityChange?.(true);
      return;
    }

    if (!open && openStateRef.current) {
      openStateRef.current = false;
      setExpanded(false);
      setBackdropVisible(false);
      setPanelVisible(false);
      if (originRect) setBox(toBox(originRect));
      sourceTimerRef.current = window.setTimeout(() => {
        onSourceVisibilityChange?.(false);
        sourceTimerRef.current = null;
      }, sourceRevealDelay);
      unmountTimerRef.current = window.setTimeout(() => {
        setMounted(false);
        setBox(null);
        unmountTimerRef.current = null;
      }, UNMOUNT_DELAY);
    }
  }, [onSourceVisibilityChange, open, originRect, sourceRevealDelay]);

  useLayoutEffect(() => {
    if (!open || !mounted || !originRect) return;

    firstFrameRef.current = window.requestAnimationFrame(() => {
      secondFrameRef.current = window.requestAnimationFrame(() => {
        setBackdropVisible(true);
        setPanelVisible(true);
        setBox(
          getTargetBox(originRect, targetWidth, targetHeight, targetRadius)
        );
        contentTimerRef.current = window.setTimeout(() => {
          setExpanded(true);
          contentTimerRef.current = null;
        }, CONTENT_DELAY);
        secondFrameRef.current = null;
      });
      firstFrameRef.current = null;
    });
  }, [mounted, open, originRect, targetHeight, targetRadius, targetWidth]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    let previousOverflow = '';
    if (lockScroll) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
    };
  }, [lockScroll, onClose, open]);

  useEffect(() => () => clearTimers(), []);

  if (!mounted || !box) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] ${backdropClassName}`}
      style={{
        opacity: backdropVisible ? 1 : 0,
        transition: backdropVisible
          ? `opacity ${OPEN_DURATION}ms ease-out`
          : `opacity ${CLOSE_DURATION}ms ease-in`,
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`fixed flex flex-col overflow-hidden ${panelClassName}`}
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          borderRadius: box.radius,
          zIndex,
          opacity: panelVisible ? 1 : 0,
          transition: open ? TRANSITION_OPEN : TRANSITION_CLOSE,
          willChange: 'left, top, width, height, opacity',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`flex h-full min-h-0 flex-col transition-opacity duration-150 ${
            expanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
