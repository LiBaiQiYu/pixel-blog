import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';

interface AvatarVideoModalProps {
  open: boolean;
  originRect?: DOMRect | null;
  imageUrl: string;
  videoUrl: string;
  onClose: () => void;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const TRANSITION =
  'left 700ms cubic-bezier(0.16, 1, 0.3, 1), top 700ms cubic-bezier(0.16, 1, 0.3, 1), width 700ms cubic-bezier(0.16, 1, 0.3, 1), height 700ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 700ms cubic-bezier(0.16, 1, 0.3, 1)';

function getTargetBox(): Box {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxWidth = Math.min(viewportWidth * 0.92, 960);
  const maxHeight = viewportHeight * 0.82;
  let width = maxWidth;
  let height = (width * 9) / 16;
  if (height > maxHeight) {
    height = maxHeight;
    width = (height * 16) / 9;
  }

  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
    radius: 14,
  };
}

export const AvatarVideoModal: React.FC<AvatarVideoModalProps> = ({
  open,
  originRect,
  imageUrl,
  videoUrl,
  onClose,
}) => {
  const [box, setBox] = useState<Box>(() => ({
    left: originRect?.left ?? window.innerWidth / 2 - 80,
    top: originRect?.top ?? window.innerHeight / 2 - 80,
    width: originRect?.width ?? 160,
    height: originRect?.height ?? 160,
    radius: 16,
  }));
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    },
    []
  );

  useLayoutEffect(() => {
    if (!open) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setBackdropVisible(true);
        setBox(getTargetBox());
        timersRef.current.push(
          window.setTimeout(() => setExpanded(true), 420)
        );
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [open]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setExpanded(false);
    setBackdropVisible(false);
    setBox({
      left: originRect?.left ?? window.innerWidth / 2 - 80,
      top: originRect?.top ?? window.innerHeight / 2 - 80,
      width: originRect?.width ?? 160,
      height: originRect?.height ?? 160,
      radius: 16,
    });
    timersRef.current.push(
      window.setTimeout(() => onClose(), 760)
    );
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="presentation">
      <div
        className="absolute inset-0 bg-slate-950/45 transition-opacity duration-500 ease-out"
        style={{ opacity: backdropVisible ? 1 : 0 }}
        onClick={handleClose}
      />

      <div
        className="absolute overflow-hidden border border-violet-300/30 bg-slate-950 shadow-2xl shadow-violet-950/40 will-change-[left,top,width,height]"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          borderRadius: box.radius,
          transition: TRANSITION,
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="CarlosWhite 虚拟形象视频"
      >
        <img
          src={imageUrl}
          alt="CarlosWhite 虚拟形象"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            expanded ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <video
          src={videoUrl}
          poster={imageUrl}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-slate-950/85 to-transparent px-4 py-3 transition-opacity duration-300 ${
            expanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 font-mono text-[10px] text-violet-200">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-violet-400/30 bg-violet-500/15">
              <Play className="h-3 w-3" fill="currentColor" />
            </span>
            <span>VIRTUAL AVATAR // 形象视频</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="pointer-events-auto rounded-lg border border-white/10 bg-slate-950/40 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="关闭形象视频"
            title="关闭 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
