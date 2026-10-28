'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  emptyPhotoReactionCounts,
  fetchPhotoReactions,
  PHOTO_REACTIONS,
  setPhotoReaction,
  type PhotoReactionCounts,
  type PhotoReactionKey,
} from '../lib/photo-reactions';
import { pixelAudio } from '../utils/sound';

interface PhotoReactionsProps {
  photoId: string;
}

type ReactionFx = {
  key: PhotoReactionKey;
  type: 'select' | 'deselect';
  nonce: number;
};

export const PhotoReactions: React.FC<PhotoReactionsProps> = ({ photoId }) => {
  const [counts, setCounts] = useState<PhotoReactionCounts>(
    emptyPhotoReactionCounts
  );
  const [mine, setMine] = useState<PhotoReactionKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [fx, setFx] = useState<ReactionFx | null>(null);
  const requestSeqRef = useRef(0);
  const fxTimerRef = useRef<number | null>(null);
  const fxNonceRef = useRef(0);

  useEffect(() => {
    return () => {
      if (fxTimerRef.current) window.clearTimeout(fxTimerRef.current);
    };
  }, []);

  const triggerFx = (key: PhotoReactionKey, type: ReactionFx['type']) => {
    if (fxTimerRef.current) window.clearTimeout(fxTimerRef.current);
    fxNonceRef.current += 1;
    setFx({ key, type, nonce: fxNonceRef.current });
    fxTimerRef.current = window.setTimeout(() => setFx(null), 340);
  };

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const controller = new AbortController();

    setCounts(emptyPhotoReactionCounts());
    setMine(null);
    setLoading(true);
    setBusy(false);
    setError(null);
    setFx(null);

    fetchPhotoReactions(photoId, controller.signal)
      .then((state) => {
        if (seq !== requestSeqRef.current) return;
        setCounts(state.counts);
        setMine(state.mine);
      })
      .catch(() => {
        if (controller.signal.aborted || seq !== requestSeqRef.current) return;
        setError('表态加载失败');
      })
      .finally(() => {
        if (seq === requestSeqRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [photoId, retryToken]);

  const react = async (key: PhotoReactionKey) => {
    if (loading || busy) return;

    const next = mine === key ? null : key;
    const previousCounts = counts;
    const previousMine = mine;
    const optimistic = { ...counts };

    pixelAudio.playReaction(next !== null);
    triggerFx(key, next ? 'select' : 'deselect');

    if (previousMine) {
      optimistic[previousMine] = Math.max(0, optimistic[previousMine] - 1);
    }
    if (next) {
      optimistic[next] += 1;
    }

    setCounts(optimistic);
    setMine(next);
    setBusy(true);
    setError(null);

    const seq = requestSeqRef.current;
    try {
      const state = await setPhotoReaction(photoId, next);
      if (seq !== requestSeqRef.current) return;
      setCounts(state.counts);
      setMine(state.mine);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setCounts(previousCounts);
      setMine(previousMine);
      setError('表态失败，请重试');
    } finally {
      if (seq === requestSeqRef.current) setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap font-pixel text-[8px] tracking-wider text-sky-600 dark:text-cyan-300">
          9-GRID REACT
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[8px] text-slate-500 dark:text-slate-400">
          {loading ? 'LOADING' : busy ? 'SAVING' : 'ONE / VISITOR'}
        </span>
      </div>

      <div
        role="group"
        aria-label="图片表态"
        className="grid grid-cols-3 gap-2"
      >
        {PHOTO_REACTIONS.map(
          ({ key, emoji, label, description, group }, index) => {
          const active = mine === key;
          const count = counts[key];
          const effect = fx?.key === key ? fx.type : null;

          return (
            <div
              key={key}
              className="reaction-dock-item"
              style={
                {
                  '--dock-delay': `${index * 60}ms`,
                } as React.CSSProperties
              }
            >
            <button
              type="button"
              data-custom-sound
              disabled={loading || busy}
              aria-pressed={active}
              aria-label={`${label}，${description}，${count} 个表态`}
              title={description}
              data-tone={group}
              onClick={() => void react(key)}
              className={`reaction-pixel-button reaction-tone-${group} relative flex w-full flex-col items-center gap-1 border-2 px-1 py-1.5 font-mono disabled:cursor-wait ${
                active
                  ? group === 'positive'
                    ? 'border-emerald-400/80 bg-emerald-500/15 text-emerald-700 dark:border-emerald-300/60 dark:bg-emerald-400/15 dark:text-emerald-200'
                    : group === 'neutral'
                      ? 'border-amber-400/80 bg-amber-500/15 text-amber-700 dark:border-amber-300/60 dark:bg-amber-400/15 dark:text-amber-200'
                      : 'border-rose-400/80 bg-rose-500/15 text-rose-700 dark:border-rose-300/60 dark:bg-rose-400/15 dark:text-rose-200'
                  : 'border-slate-300/70 bg-white/55 text-slate-600 hover:border-sky-400 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-300 dark:hover:border-cyan-300/50'
              } ${
                effect === 'select'
                  ? 'reaction-pixel-select'
                  : effect === 'deselect'
                    ? 'reaction-pixel-deselect'
                    : ''
              } ${busy ? 'opacity-70' : ''}`}
            >
              {effect === 'select' && (
                <span
                  key={fx?.nonce}
                  className="reaction-burst"
                  aria-hidden="true"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <span key={index} />
                  ))}
                </span>
              )}

              <span className="reaction-led" aria-hidden="true" />
              <span className="text-lg leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span
                className={`text-[8px] leading-none ${
                  active
                    ? group === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-200'
                      : group === 'neutral'
                        ? 'text-amber-700 dark:text-amber-200'
                        : 'text-rose-700 dark:text-rose-200'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </span>
              <span
                className={`text-[9px] tabular-nums ${
                  active
                    ? group === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-200'
                      : group === 'neutral'
                        ? 'text-amber-700 dark:text-amber-200'
                        : 'text-rose-700 dark:text-rose-200'
                    : count > 0
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-slate-400/70 dark:text-slate-600'
                }`}
              >
                <span
                  key={count}
                  className="reaction-count-pop inline-block"
                >
                  {count.toLocaleString('zh-CN')}
                </span>
              </span>
            </button>
            </div>
          );
        }
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-rose-600 dark:text-rose-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRetryToken((token) => token + 1)}
            className="border border-rose-400/40 px-1.5 py-0.5 transition-colors hover:bg-rose-500/10"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
};
