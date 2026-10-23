import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface FlyingBackButtonProps {
  visible: boolean;
  docked: boolean;
  originRef: React.RefObject<HTMLElement | null>;
  dockRef: React.RefObject<HTMLElement | null>;
  onClick: () => void;
}

/**
 * Single elastic back button that flies between the article action bar
 * (origin) and the left side of the sticky navbar (dock), with a
 * spring-like overshoot easing. Scroll down = merge into navbar,
 * scroll back to top = return to its original spot.
 */
export const FlyingBackButton: React.FC<FlyingBackButtonProps> = ({
  visible,
  docked,
  originRef,
  dockRef,
  onClick,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const rafRef = useRef(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const update = useCallback(() => {
    const el = docked ? dockRef.current : originRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaledHeight = (buttonRef.current?.offsetHeight ?? 0) * 0.86;
    const y =
      docked && scaledHeight > 0
        ? rect.top + (rect.height - scaledHeight) / 2
        : rect.top;

    setPos((prev) => {
      if (
        prev &&
        Math.abs(prev.x - rect.left) < 0.5 &&
        Math.abs(prev.y - y) < 0.5
      ) {
        return prev;
      }
      return { x: rect.left, y };
    });
  }, [docked, dockRef, originRef]);

  // First measure happens without transition so the button does not fly in from 0,0
  useLayoutEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      update();
      setReady(true);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, update]);

  // Keep glued to the anchor while scrolling / resizing
  useLayoutEffect(() => {
    if (!visible) return;
    let ticking = false;
    const measure = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };
    const onResize = () => {
      setReady(false);
      requestAnimationFrame(() => {
        update();
        setReady(true);
      });
    };
    update();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', onResize);
    };
  }, [visible, update]);

  // Re-measure when dock state flips (navbar layout may shift when breadcrumb hides)
  useLayoutEffect(() => {
    if (!visible) return;
    update();
  }, [docked, visible, update]);

  if (!visible || !pos) return null;

  const baseScale = docked ? 0.86 : 1;
  const scale = pressed
    ? baseScale * 0.95
    : hovered
    ? baseScale * 1.05
    : baseScale;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title="返回文章列表"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`,
        transformOrigin: 'left top',
        transition: ready
          ? 'transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease, border-color 0.18s ease, color 0.18s ease'
          : 'none',
      }}
      className={`fixed z-50 liquid-glass-strong px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold shadow-lg hover:shadow-xl hover:border-sky-400/70 ${
        docked ? 'text-sky-600 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-100'
      } hover:text-sky-600 dark:hover:text-cyan-300`}
    >
      <ArrowLeft className="w-4 h-4 text-sky-500 shrink-0" />
      <span className={docked ? 'hidden sm:inline' : ''}>返回列表</span>
    </button>
  );
};
