'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import {
  createPhotoComment,
  fetchPhotoComments,
  type PhotoComment,
} from '../lib/photo-engagement';
import { pixelAudio } from '../utils/sound';

interface PhotoCommentsModalProps {
  photoId: string;
  initialTotal: number;
  onClose: () => void;
  onTotalChange: (total: number) => void;
}

const NICKNAME_KEY = 'pixel_blog_photo_nickname';
const MAX_NICKNAME = 24;
const MAX_CONTENT = 500;

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export const PhotoCommentsModal: React.FC<PhotoCommentsModalProps> = ({
  photoId,
  initialTotal,
  onClose,
  onTotalChange,
}) => {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [nickname, setNickname] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(NICKNAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [closing, setClosing] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    pixelAudio.playInfoClose();
    closeTimerRef.current = window.setTimeout(onClose, 340);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchPhotoComments(photoId, controller.signal)
      .then((result) => {
        setComments(result.comments);
        setTotal(result.total);
        onTotalChange(result.total);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('评价加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [photoId, retryToken, onTotalChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextNickname = nickname.trim();
    const nextContent = content.trim();
    if (!nextNickname) {
      setFormError('请填写昵称');
      pixelAudio.playCommentError();
      return;
    }
    if (!nextContent) {
      setFormError('请填写评价内容');
      pixelAudio.playCommentError();
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createPhotoComment(
        photoId,
        nextNickname,
        nextContent
      );
      setComments((current) => [result.comment, ...current]);
      setTotal(result.total);
      onTotalChange(result.total);
      setContent('');
      try {
        localStorage.setItem(NICKNAME_KEY, nextNickname);
      } catch {
        // ignore storage errors
      }
      pixelAudio.playCommentPost();
      contentRef.current?.focus();
    } catch {
      setFormError('评价提交失败，请重试');
      pixelAudio.playCommentError();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-2 py-2 backdrop-blur-md dark:bg-slate-950/85 sm:p-4 ${
        closing
          ? 'photo-comments-backdrop-exit'
          : 'photo-comments-backdrop-enter'
      }`}
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-comments-title"
        onClick={(event) => event.stopPropagation()}
        className={`photo-comments-panel flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden border-2 border-sky-500/50 bg-white text-slate-900 shadow-[8px_8px_0_0_rgba(2,132,199,0.22)] dark:border-cyan-300/40 dark:bg-slate-950 dark:text-slate-100 dark:shadow-[8px_8px_0_0_rgba(56,189,248,0.16)] sm:max-h-[82vh] sm:max-w-[560px] ${
          closing ? 'photo-comments-panel-exit' : ''
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-sky-400/30 bg-sky-50/90 px-4 py-3 dark:border-cyan-300/20 dark:bg-slate-900/90">
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="h-4 w-4 text-sky-500 dark:text-cyan-300" />
            <div className="min-w-0">
              <div
                id="photo-comments-title"
                className="font-pixel text-[10px] tracking-wider text-sky-700 dark:text-cyan-200"
              >
                PHOTO REVIEW // 评价
              </div>
              <div className="mt-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                {total} 条评价 · {photoId}
              </div>
            </div>
          </div>
          <button
            type="button"
            data-custom-sound
            onClick={close}
            className="pixel-icon-button text-slate-500 hover:text-rose-500 dark:text-slate-400"
            title="关闭评价"
            aria-label="关闭评价"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex h-28 items-center justify-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              读取评价…
            </div>
          ) : error ? (
            <div className="flex h-28 flex-col items-center justify-center gap-2 font-mono text-xs text-rose-600 dark:text-rose-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRetryToken((token) => token + 1)}
                className="border-2 border-rose-400/40 px-2 py-1 transition-colors hover:bg-rose-500/10"
              >
                重试
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex h-28 flex-col items-center justify-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-5 w-5 opacity-60" />
              还没有评价，来写第一条
            </div>
          ) : (
            comments.map((comment) => (
              <article
                key={comment.id}
                className="photo-comment-item border-2 border-slate-300/70 bg-slate-50 p-3 dark:border-white/15 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3 font-mono">
                  <span className="truncate text-[11px] font-semibold text-sky-700 dark:text-cyan-200">
                    {comment.nickname}
                  </span>
                  <time className="shrink-0 text-[9px] text-slate-500 dark:text-slate-400">
                    {formatDate(comment.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {comment.content}
                </p>
              </article>
            ))
          )}
        </div>

        <form
          onSubmit={(event) => void submit(event)}
          className="shrink-0 space-y-2 border-t-2 border-sky-400/30 bg-slate-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-cyan-300/20 dark:bg-slate-900 sm:p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-pixel text-[8px] tracking-wider text-sky-600 dark:text-cyan-300">
              WRITE REVIEW
            </span>
            <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
              {content.length}/{MAX_CONTENT}
            </span>
          </div>
          <input
            type="text"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setFormError(null);
            }}
            maxLength={MAX_NICKNAME}
            placeholder="昵称"
            className="pixel-input w-full px-3 py-2 font-mono text-base sm:text-xs"
            aria-label="昵称"
          />
          <textarea
            ref={contentRef}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setFormError(null);
            }}
            maxLength={MAX_CONTENT}
            rows={3}
            placeholder="写下你对这张照片的评价…"
            className="pixel-input w-full resize-none px-3 py-2 font-mono text-base sm:text-xs"
            aria-label="评价内容"
          />
          {formError && (
            <div className="font-mono text-[10px] text-rose-600 dark:text-rose-300">
              {formError}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
              昵称 + 内容
            </span>
            <button
              type="submit"
              data-custom-sound
              disabled={submitting}
              className="pixel-action-button flex items-center gap-1.5 border-2 border-sky-400/60 bg-sky-500/15 px-3 py-2 font-mono text-[11px] text-sky-700 disabled:opacity-50 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-200"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              提交评价
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
