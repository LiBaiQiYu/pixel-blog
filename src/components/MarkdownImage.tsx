import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, ImageOff, Maximize2, X } from 'lucide-react';

interface MarkdownImageProps {
  src: string;
  alt: string;
  caption?: string;
  variant?: 'gui' | 'terminal';
  baseUrl?: string;
}

function resolveImageSrc(src: string, baseUrl?: string) {
  if (
    /^(https?:)?\/\//i.test(src) ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  ) {
    return src;
  }
  if (!baseUrl) return src;
  try {
    return new URL(src, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href;
  } catch {
    return src;
  }
}

export const MarkdownImage: React.FC<MarkdownImageProps> = ({
  src,
  alt,
  caption,
  variant = 'gui',
  baseUrl,
}) => {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const terminal = variant === 'terminal';
  const label = alt.trim() || '文章图片';
  const visibleCaption = caption?.trim() || '';
  const resolvedSrc = resolveImageSrc(src, baseUrl);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const lightbox = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md sm:p-8"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-6xl flex-col items-center gap-3"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between gap-3 font-mono text-[11px] text-slate-300">
              <span className="truncate">{label}</span>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={resolvedSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-slate-200 transition-colors hover:bg-white/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  原图
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-slate-200 transition-colors hover:bg-white/10"
                  aria-label="关闭图片预览"
                >
                  <X className="h-3.5 w-3.5" />
                  关闭
                </button>
              </div>
            </div>

            <img
              src={resolvedSrc}
              alt={label}
              className="max-h-[78vh] max-w-full rounded-xl border border-white/15 bg-slate-950 object-contain shadow-2xl"
              draggable={false}
            />

            {visibleCaption && (
              <p className="max-w-3xl text-center font-mono text-xs leading-relaxed text-slate-400">
                {visibleCaption}
              </p>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <figure className={`my-5 ${terminal ? 'space-y-1.5' : 'space-y-2'}`}>
        <button
          type="button"
          onClick={() => {
            if (!failed) setOpen(true);
          }}
          className={`group relative block w-full overflow-hidden rounded-xl border text-left transition-all ${
            terminal
              ? 'border-emerald-500/35 bg-slate-950/70 hover:border-emerald-400/60'
              : 'border-slate-300/70 bg-white/40 hover:border-sky-400/60 dark:border-white/15 dark:bg-slate-950/50'
          }`}
          aria-label={`查看大图：${label}`}
        >
          {failed ? (
            <span className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 font-mono text-xs text-slate-400">
              <ImageOff className="h-6 w-6" />
              图片加载失败：{label}
            </span>
          ) : (
            <>
              <img
                src={resolvedSrc}
                alt={label}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={() => setFailed(true)}
                className="mx-auto block max-h-[72vh] w-auto max-w-full object-contain"
              />
              <span
                className={`pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 ${
                  terminal
                    ? 'border-emerald-400/30 bg-slate-950/80 text-emerald-300'
                    : 'border-white/20 bg-slate-950/75 text-cyan-200'
                }`}
              >
                <Maximize2 className="h-3 w-3" />
                查看大图
              </span>
            </>
          )}
        </button>

        {visibleCaption && (
          <figcaption
            className={`text-center font-mono text-[11px] leading-relaxed ${
              terminal
                ? 'text-emerald-600/80 dark:text-emerald-300/70'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {visibleCaption}
          </figcaption>
        )}
      </figure>

      {lightbox}
    </>
  );
};
