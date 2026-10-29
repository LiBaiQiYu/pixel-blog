'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Link2,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { FriendAvatar } from './FriendAvatar';
import {
  generateFriendSeed,
  submitFriendApplication,
} from '../lib/friends';
import { pixelAudio } from '../utils/sound';

interface FriendApplyModalProps {
  onClose: () => void;
}

const MAX_TAGS = 6;
const MAX_TAG_LENGTH = 16;
const MAX_SEED = 2147483647;

const PixelArrow: React.FC<{ direction: 'up' | 'down' }> = ({
  direction,
}) => (
  <svg
    viewBox="0 0 9 5"
    className="h-2.5 w-3.5"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <g transform={direction === 'down' ? 'rotate(180 4.5 2.5)' : undefined}>
      <rect x="4" y="0" width="1" height="1" fill="currentColor" />
      <rect x="3" y="1" width="3" height="1" fill="currentColor" />
      <rect x="2" y="2" width="5" height="1" fill="currentColor" />
      <rect x="1" y="3" width="7" height="1" fill="currentColor" />
      <rect x="0" y="4" width="9" height="1" fill="currentColor" />
    </g>
  </svg>
);

export const FriendApplyModal: React.FC<FriendApplyModalProps> = ({
  onClose,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [removingTags, setRemovingTags] = useState<string[]>([]);
  const [seedInput, setSeedInput] = useState(() =>
    String(generateFriendSeed())
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const removalTimersRef = useRef<Record<string, number>>({});
  const nameRef = useRef<HTMLInputElement | null>(null);

  const seed = Number(seedInput);
  const validSeed =
    Number.isInteger(seed) && seed >= 1 && seed <= MAX_SEED;

  useEffect(() => {
    const timer = window.setTimeout(() => nameRef.current?.focus(), 120);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timers = removalTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => window.clearTimeout(timer));
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const appendTags = (values: string[]) => {
    const next = [...tags];
    let nextError: string | null = null;

    for (const value of values) {
      const tag = value.trim();
      if (!tag) continue;
      if (tag.length > MAX_TAG_LENGTH) {
        nextError = `单个标签最多 ${MAX_TAG_LENGTH} 个字符`;
        continue;
      }
      if (next.length >= MAX_TAGS) {
        nextError = `最多添加 ${MAX_TAGS} 个标签`;
        break;
      }
      if (!next.includes(tag) && !removingTags.includes(tag)) {
        next.push(tag);
      }
    }

    if (next.length !== tags.length) setTags(next);
    setError(nextError);
  };

  const handleTagsChange = (value: string) => {
    if (!/[,，、\n]/.test(value)) {
      setTagsInput(value);
      setError(null);
      return;
    }

    const parts = value.split(/[,，、\n]/);
    const remainder = parts.pop() ?? '';
    appendTags(parts);
    setTagsInput(remainder);
  };

  const removeTag = (tag: string) => {
    if (removingTags.includes(tag)) return;
    setRemovingTags((current) =>
      current.includes(tag) ? current : [...current, tag]
    );
    const timer = window.setTimeout(() => {
      setTags((current) => current.filter((item) => item !== tag));
      setRemovingTags((current) =>
        current.filter((item) => item !== tag)
      );
      delete removalTimersRef.current[tag];
    }, 180);
    removalTimersRef.current[tag] = timer;
  };

  const handleTagsKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && tagsInput.trim()) {
      event.preventDefault();
      appendTags([tagsInput]);
      setTagsInput('');
      return;
    }
    if (
      event.key === 'Backspace' &&
      !tagsInput &&
      tags.length > 0
    ) {
      event.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

  const stepSeed = (delta: number) => {
    const current = Number(seedInput);
    const base = Number.isFinite(current) ? Math.floor(current) : 0;
    const next = Math.min(
      MAX_SEED,
      Math.max(1, (base || 0) + delta)
    );
    setSeedInput(String(next));
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextName = name.trim();
    const nextUrl = url.trim();
    if (!nextName) {
      setError('请填写友链名称');
      pixelAudio.playCommentError();
      return;
    }
    if (!nextUrl) {
      setError('请填写友链网址');
      pixelAudio.playCommentError();
      return;
    }
    try {
      const parsed = new URL(nextUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch {
      setError('请输入以 http:// 或 https:// 开头的完整网址');
      pixelAudio.playCommentError();
      return;
    }
    if (!validSeed) {
      setError('种子需要是 1 - 2147483647 的整数');
      pixelAudio.playCommentError();
      return;
    }

    const pendingTag = tagsInput.trim();
    if (pendingTag.length > MAX_TAG_LENGTH) {
      setError(`单个标签最多 ${MAX_TAG_LENGTH} 个字符`);
      pixelAudio.playCommentError();
      return;
    }
    const finalTags = tags.filter((tag) => !removingTags.includes(tag));
    if (pendingTag && !finalTags.includes(pendingTag)) {
      if (finalTags.length >= MAX_TAGS) {
        setError(`最多添加 ${MAX_TAGS} 个标签`);
        pixelAudio.playCommentError();
        return;
      }
      finalTags.push(pendingTag);
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitFriendApplication({
        name: nextName,
        url: nextUrl,
        seed,
        description: description.trim(),
        tags: finalTags,
      });
      setSubmitted(true);
      pixelAudio.playCommentPost();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '提交失败，请稍后重试'
      );
      pixelAudio.playCommentError();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 px-2 py-2 backdrop-blur-md dark:bg-slate-950/85 sm:p-4 ${
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
        aria-labelledby="friend-apply-title"
        onClick={(event) => event.stopPropagation()}
        className={`photo-comments-panel flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden border-2 border-violet-500/50 bg-white text-slate-900 shadow-[8px_8px_0_0_rgba(124,58,237,0.22)] dark:border-violet-300/40 dark:bg-slate-950 dark:text-slate-100 dark:shadow-[8px_8px_0_0_rgba(167,139,250,0.16)] sm:max-h-[88vh] sm:max-w-[600px] ${
          closing ? 'photo-comments-panel-exit' : ''
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-violet-400/30 bg-violet-50/90 px-4 py-3 dark:border-violet-300/20 dark:bg-slate-900/90">
          <div className="flex min-w-0 items-center gap-2">
            <Link2 className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <div className="min-w-0">
              <div
                id="friend-apply-title"
                className="font-pixel text-[10px] tracking-wider text-violet-700 dark:text-violet-200"
              >
                {submitted
                  ? 'FRIEND LINK // 已提交'
                  : 'FRIEND LINK // 申请友链'}
              </div>
              <div className="mt-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                {submitted ? '等待站长审核' : '填写信息，生成专属像素头像'}
              </div>
            </div>
          </div>
          <button
            type="button"
            data-custom-sound
            onClick={close}
            className="pixel-icon-button text-slate-500 hover:text-rose-500 dark:text-slate-400"
            title="关闭申请"
            aria-label="关闭申请"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {submitted ? (
          <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-violet-400/50 bg-violet-50 p-1 shadow-[5px_5px_0_0_rgba(124,58,237,0.15)] dark:border-violet-300/30 dark:bg-slate-900">
              <FriendAvatar seed={seed} title="你的友链头像" />
            </div>
            <div>
              <div className="font-pixel text-sm tracking-wider text-violet-700 dark:text-violet-200">
                APPLICATION RECEIVED
              </div>
              <p className="mt-3 max-w-sm font-mono text-xs leading-6 text-slate-600 dark:text-slate-300">
                申请已经送达。审核通过后，你的网站会出现在友链列表中。
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-300">
              <Check className="h-4 w-4" />
              种子 #{seed}
            </div>
            <button
              type="button"
              data-custom-sound
              onClick={close}
              className="pixel-action-button border-2 border-violet-400/60 bg-violet-500/15 px-5 py-2 font-mono text-[11px] text-violet-700 dark:border-violet-300/40 dark:bg-violet-400/10 dark:text-violet-200"
            >
              返回友链
            </button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <form
                id="friend-apply-form"
                onSubmit={(event) => void submit(event)}
                className="space-y-3"
              >
                <div className="flex flex-col gap-3 rounded-xl border-2 border-violet-300/40 bg-violet-50/50 p-3 dark:border-violet-300/15 dark:bg-violet-400/5 sm:flex-row sm:items-center">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-violet-400/40 bg-white/70 shadow-[4px_4px_0_0_rgba(124,58,237,0.12)] dark:border-violet-300/25 dark:bg-slate-900">
                    <FriendAvatar
                      seed={validSeed ? seed : 1}
                      title="像素头像预览"
                      className={validSeed ? '' : 'opacity-35'}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="friend-seed"
                        className="font-mono text-[10px] font-semibold text-violet-700 dark:text-violet-200"
                      >
                        SEED // 头像种子
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSeedInput(String(generateFriendSeed()))
                        }
                        className="flex items-center gap-1 font-mono text-[10px] text-violet-600 underline-offset-2 hover:underline dark:text-violet-300"
                      >
                        <Sparkles className="h-3 w-3" />
                        随机换一个
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="friend-seed"
                        type="number"
                        min={1}
                        max={MAX_SEED}
                        value={seedInput}
                        onChange={(event) => {
                          setSeedInput(event.target.value);
                          setError(null);
                        }}
                        className="pixel-input pixel-number-input w-full px-3 py-2 pr-12 font-mono text-base sm:text-xs"
                        placeholder="例如 20261029"
                        aria-label="头像种子"
                      />
                      <div className="absolute inset-y-[2px] right-[2px] flex w-9 flex-col border-l-2 border-slate-300/70 dark:border-white/15">
                        <button
                          type="button"
                          data-custom-sound
                          disabled={validSeed && seed >= MAX_SEED}
                          onClick={() => stepSeed(1)}
                          className="friend-seed-step flex flex-1 items-center justify-center border-b-2 border-slate-300/70 text-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/15 dark:text-violet-300"
                          aria-label="种子增加"
                          title="增加种子"
                        >
                          <PixelArrow direction="up" />
                        </button>
                        <button
                          type="button"
                          data-custom-sound
                          disabled={validSeed && seed <= 1}
                          onClick={() => stepSeed(-1)}
                          className="friend-seed-step flex flex-1 items-center justify-center text-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:text-violet-300"
                          aria-label="种子减少"
                          title="减少种子"
                        >
                          <PixelArrow direction="down" />
                        </button>
                      </div>
                    </div>
                    <p className="font-mono text-[9px] leading-4 text-slate-500 dark:text-slate-400">
                      种子只决定头像样式，不公开你的其他信息。
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="friend-name"
                      className="mb-1.5 block font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                    >
                      友链名称
                    </label>
                    <input
                      ref={nameRef}
                      id="friend-name"
                      type="text"
                      value={name}
                      maxLength={48}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError(null);
                      }}
                      className="pixel-input w-full px-3 py-2 font-mono text-base sm:text-xs"
                      placeholder="你的网站名称"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="friend-url"
                      className="mb-1.5 block font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                    >
                      友链网址
                    </label>
                    <input
                      id="friend-url"
                      type="url"
                      value={url}
                      maxLength={500}
                      onChange={(event) => {
                        setUrl(event.target.value);
                        setError(null);
                      }}
                      className="pixel-input w-full px-3 py-2 font-mono text-base sm:text-xs"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="friend-description"
                    className="mb-1.5 block font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    一句话介绍 <span className="font-normal text-slate-400">(可选)</span>
                  </label>
                  <textarea
                    id="friend-description"
                    value={description}
                    maxLength={240}
                    rows={2}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setError(null);
                    }}
                    className="pixel-input w-full resize-none px-3 py-2 font-mono text-base sm:text-xs"
                    placeholder="你的网站主要分享什么？"
                  />
                  <div className="mt-1 text-right font-mono text-[9px] text-slate-400">
                    {description.length}/240
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label
                      htmlFor="friend-tags"
                      className="block font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                    >
                      标签 <span className="font-normal text-slate-400">(可选)</span>
                    </label>
                    <span className="font-mono text-[9px] text-slate-400">
                      {tags.length}/{MAX_TAGS}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tags.length > 0 && (
                      <div
                        className="flex flex-wrap gap-2"
                        aria-live="polite"
                      >
                        {tags.map((tag) => {
                          const removing = removingTags.includes(tag);
                          return (
                            <span
                              key={tag}
                              className={`friend-tag-chip flex items-center gap-1 border-2 border-violet-500/60 bg-violet-100 px-2 py-1 font-mono text-[10px] text-violet-700 shadow-[2px_2px_0_0_rgba(124,58,237,0.18)] dark:border-violet-300/40 dark:bg-violet-400/10 dark:text-violet-200 dark:shadow-[2px_2px_0_0_rgba(167,139,250,0.14)] ${
                                removing
                                  ? 'friend-tag-chip-exit'
                                  : ''
                              }`}
                            >
                              <span
                                className="h-1.5 w-1.5 bg-violet-500 dark:bg-violet-300"
                                aria-hidden="true"
                              />
                              <span>{tag}</span>
                              <button
                                type="button"
                                data-custom-sound
                                onClick={() => removeTag(tag)}
                                className="friend-tag-close -mr-1 ml-0.5 flex h-4 w-4 items-center justify-center border border-violet-400/50 bg-white/50 text-violet-600 dark:border-violet-300/30 dark:bg-slate-950/40 dark:text-violet-300"
                                aria-label={`移除标签 ${tag}`}
                                title={`移除标签 ${tag}`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <input
                      id="friend-tags"
                      type="text"
                      value={tagsInput}
                      onChange={(event) =>
                        handleTagsChange(event.target.value)
                      }
                      onKeyDown={handleTagsKeyDown}
                      className="pixel-input w-full px-3 py-2 font-mono text-base sm:text-xs"
                      placeholder="输入生活，按逗号生成标签"
                      aria-describedby="friend-tags-help"
                    />
                  </div>
                  <p
                    id="friend-tags-help"
                    className="mt-1.5 font-mono text-[9px] leading-4 text-slate-500 dark:text-slate-400"
                  >
                    输入后按逗号或回车生成标签，退格可移除最后一个。
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 font-mono text-[10px] leading-5 text-rose-600 dark:text-rose-300"
                  >
                    {error}
                  </div>
                )}
              </form>
            </div>

            <div className="shrink-0 border-t-2 border-violet-400/30 bg-violet-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-violet-300/20 dark:bg-slate-900 sm:p-4">
              <button
                type="submit"
                form="friend-apply-form"
                data-custom-sound
                disabled={submitting}
                className="pixel-action-button flex w-full items-center justify-center gap-2 border-2 border-violet-400/60 bg-violet-500/15 px-3 py-2.5 font-mono text-[11px] text-violet-700 disabled:opacity-50 dark:border-violet-300/40 dark:bg-violet-400/10 dark:text-violet-200"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? '正在提交…' : '提交友链申请'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
