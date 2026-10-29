'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CornerDownLeft,
  Loader2,
  RefreshCw,
  Terminal,
  X,
} from 'lucide-react';
import { LiquidPixelCard } from './LiquidPixelCard';
import { FriendAvatar } from './FriendAvatar';
import {
  fetchFriends,
  generateFriendSeed,
  submitFriendApplication,
  type FriendLink,
} from '../lib/friends';
import { pixelAudio } from '../utils/sound';

interface TerminalFriendsViewProps {
  onBackHome: () => void;
}

const MAX_TAGS = 6;
const MAX_TAG_LENGTH = 16;
const MAX_SEED = 2147483647;

const COMMANDS = [
  'help',
  'ls',
  'list',
  'friends',
  'open',
  'apply',
  'filter',
  'search',
  'reload',
  'clear',
  'cd ~',
];

const fieldClass =
  'w-full rounded-none border border-emerald-500/30 bg-white/45 px-2.5 py-1.5 font-mono text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white/70 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-950 sm:text-xs';

function splitTags(value: string) {
  return value
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const TerminalFriendApplyForm: React.FC<{
  onCancel: () => void;
  onSubmitted: (seed: number) => void;
}> = ({ onCancel, onSubmitted }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [seedInput, setSeedInput] = useState(() =>
    String(generateFriendSeed())
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seed = Number(seedInput);
  const validSeed =
    Number.isInteger(seed) && seed >= 1 && seed <= MAX_SEED;
  const parsedTags = splitTags(tagsInput);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextName = name.trim();
    const nextUrl = url.trim();
    if (!nextName) {
      setError('name is required');
      pixelAudio.playCommentError();
      return;
    }
    if (!nextUrl) {
      setError('url is required');
      pixelAudio.playCommentError();
      return;
    }
    try {
      const parsed = new URL(nextUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch {
      setError('url must start with http:// or https://');
      pixelAudio.playCommentError();
      return;
    }
    if (!validSeed) {
      setError(`seed must be an integer between 1 and ${MAX_SEED}`);
      pixelAudio.playCommentError();
      return;
    }
    if (parsedTags.length > MAX_TAGS) {
      setError(`maximum ${MAX_TAGS} tags`);
      pixelAudio.playCommentError();
      return;
    }
    if (parsedTags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      setError(`each tag can be at most ${MAX_TAG_LENGTH} characters`);
      pixelAudio.playCommentError();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitFriendApplication({
        name: nextName,
        url: nextUrl,
        seed,
        description: description.trim(),
        tags: parsedTags,
      });
      pixelAudio.playCommentPost();
      onSubmitted(seed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'request failed, try again'
      );
      pixelAudio.playCommentError();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mx-auto w-full max-w-3xl space-y-3 font-mono"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
        <div className="text-[11px] text-emerald-600 dark:text-emerald-300">
          <span className="text-slate-400 dark:text-slate-500">
            carlos@libai:~/friends
          </span>
          <span className="text-slate-500">$ </span>
          friend add --interactive
        </div>
        <span className="text-[9px] text-slate-400">
          all fields except description/tags are required
        </span>
      </div>

      <div className="flex flex-col gap-3 border border-emerald-500/25 bg-emerald-500/5 p-3 dark:border-emerald-400/15 dark:bg-emerald-400/5 sm:flex-row sm:items-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden border border-emerald-500/30 bg-white/50 p-1 dark:bg-slate-950">
          <FriendAvatar
            seed={validSeed ? seed : 1}
            title="friend avatar preview"
            className={validSeed ? '' : 'opacity-35'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-300">
              $ seed --preview
            </span>
            <button
              type="button"
              data-custom-sound
              onClick={() => setSeedInput(String(generateFriendSeed()))}
              className="text-[10px] text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-300"
            >
              [random]
            </button>
          </div>
          <input
            type="number"
            min={1}
            max={MAX_SEED}
            value={seedInput}
            onChange={(event) => {
              setSeedInput(event.target.value);
              setError(null);
            }}
            className={`${fieldClass} pixel-number-input`}
            placeholder="seed number"
            aria-label="avatar seed"
          />
          <div className="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
            seed only controls the pixel avatar.
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] text-slate-500 dark:text-slate-400">
            name:
          </span>
          <input
            autoFocus
            value={name}
            maxLength={48}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            className={fieldClass}
            placeholder="your site name"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] text-slate-500 dark:text-slate-400">
            url:
          </span>
          <input
            type="url"
            value={url}
            maxLength={500}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            className={fieldClass}
            placeholder="https://example.com"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] text-slate-500 dark:text-slate-400">
          description <span className="text-slate-400">(optional)</span>:
        </span>
        <textarea
          value={description}
          maxLength={240}
          rows={2}
          onChange={(event) => {
            setDescription(event.target.value);
            setError(null);
          }}
          className={`${fieldClass} resize-none`}
          placeholder="what do you write about?"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] text-slate-500 dark:text-slate-400">
          tags <span className="text-slate-400">(optional, comma separated)</span>:
        </span>
        <input
          value={tagsInput}
          onChange={(event) => {
            setTagsInput(event.target.value);
            setError(null);
          }}
          className={fieldClass}
          placeholder="life, photo, code"
        />
      </label>

      {parsedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-300">
          <span className="text-slate-400">parsed:</span>
          {parsedTags.slice(0, MAX_TAGS).map((tag) => (
            <span
              key={tag}
              className="border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-600 dark:text-rose-300"
        >
          [error] {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20 pt-2">
        <span className="text-[9px] text-slate-400">
          esc: cancel · submit sends the request to the review queue
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-custom-sound
            onClick={onCancel}
            className="flex items-center gap-1 border border-slate-400/30 px-2.5 py-1.5 text-[10px] text-slate-500 transition-colors hover:border-rose-400/50 hover:text-rose-600 dark:text-slate-400"
          >
            <X className="h-3 w-3" />
            cancel
          </button>
          <button
            type="submit"
            data-custom-sound
            disabled={submitting}
            className="flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            submit request
          </button>
        </div>
      </div>
    </form>
  );
};

const helpLines = [
  ['friends --list', 'list approved friend links'],
  ['open <n>', 'open a friend link in a new tab'],
  ['filter <tag>', 'filter the list by tag'],
  ['search <text>', 'search name, tags or description'],
  ['all', 'clear filters and search'],
  ['apply', 'send a friend request'],
  ['reload', 'reload the approved list'],
  ['clear', 'clear the command status'],
  ['cd ~', 'back to home'],
];

export const TerminalFriendsView: React.FC<TerminalFriendsViewProps> = ({
  onBackHome,
}) => {
  const [friends, setFriends] = useState<FriendLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'apply' | 'success'>('list');
  const [submittedSeed, setSubmittedSeed] = useState(0);
  const [status, setStatus] = useState('type help for available commands');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchFriends(controller.signal)
      .then((result) => setFriends(result))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'failed to load links');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retryToken]);

  useEffect(() => {
    if (mode !== 'apply') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMode('list');
        setStatus('friend add cancelled');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  useEffect(() => {
    if (mode === 'apply' || mode === 'success') {
      bodyRef.current?.scrollTo({ top: 0 });
    }
  }, [mode]);

  const tags = useMemo(
    () =>
      Array.from(new Set(friends.flatMap((friend) => friend.tags))).slice(
        0,
        10
      ),
    [friends]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return friends.filter((friend) => {
      if (activeTag && !friend.tags.includes(activeTag)) return false;
      if (!needle) return true;
      return [friend.name, friend.description, friend.url, ...friend.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [activeTag, friends, query]);

  const openFriend = (friend: FriendLink) => {
    pixelAudio.playClick();
    window.open(friend.url, '_blank', 'noopener,noreferrer');
    setStatus(`opened ${friend.name}`);
  };

  const runCommand = (raw: string) => {
    const command = raw.trim();
    if (!command) return;
    pixelAudio.playCommandRun();

    const [cmd, ...args] = command.split(/\s+/);
    const lower = cmd.toLowerCase();
    const argument = args.join(' ');
    setHistory((current) => [command, ...current].slice(0, 30));
    setHistoryCursor(-1);
    setInput('');
    setHelpOpen(false);

    switch (lower) {
      case 'help':
      case '?':
        setHelpOpen(true);
        setStatus('help: choose a command below');
        return;
      case 'ls':
      case 'list':
      case 'friends':
        setMode('list');
        setActiveTag(null);
        setQuery('');
        setStatus(`${friends.length} approved friend links`);
        return;
      case 'open': {
        const numeric = Number(argument);
        const friend =
          Number.isInteger(numeric) && numeric > 0
            ? filtered[numeric - 1]
            : friends.find(
                (item) =>
                  item.name.toLowerCase() === argument.toLowerCase()
              );
        if (!friend) {
          setStatus(`open: link not found: ${argument || '(missing)'}`);
          return;
        }
        openFriend(friend);
        return;
      }
      case 'apply':
      case 'add':
        setMode('apply');
        setStatus('new friend request');
        pixelAudio.playCommentOpen();
        return;
      case 'reload':
      case 'refresh':
        setMode('list');
        setRetryToken((current) => current + 1);
        setStatus('reloading approved links...');
        return;
      case 'filter': {
        const tagArgument = argument.replace(/^#/, '').trim();
        if (!tagArgument) {
          setActiveTag(null);
          setStatus('filter cleared');
          return;
        }
        const match = tags.find(
          (tag) => tag.toLowerCase() === tagArgument.toLowerCase()
        );
        if (!match) {
          setStatus(`filter: tag not found: ${tagArgument}`);
          return;
        }
        setActiveTag(match);
        setQuery('');
        setStatus(`filter: #${match}`);
        return;
      }
      case 'search':
        setActiveTag(null);
        setQuery(argument);
        setStatus(
          argument ? `search: "${argument}"` : 'search cleared'
        );
        return;
      case 'all':
      case 'reset':
        setActiveTag(null);
        setQuery('');
        setStatus('filters cleared');
        return;
      case 'clear':
      case 'cls':
        setStatus('');
        return;
      case 'cd':
      case 'home':
        if (lower === 'cd' && argument && argument !== '~') {
          setStatus(`cd: no such directory: ${argument}`);
          return;
        }
        onBackHome();
        return;
      default:
        setStatus(`command not found: ${cmd}`);
    }
  };

  const handleCommandKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(input);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      const next = Math.min(historyCursor + 1, history.length - 1);
      setHistoryCursor(next);
      setInput(history[next]);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        const next = historyCursor - 1;
        setHistoryCursor(next);
        setInput(history[next]);
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const value = input.trim().toLowerCase();
      if (!value) return;
      const match = COMMANDS.find((command) => command.startsWith(value));
      if (match) setInput(match);
    }
  };

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col">
      <LiquidPixelCard
        accent="emerald"
        strong
        className="flex flex-1 min-h-0 flex-col overflow-hidden p-0"
        contentClassName="flex flex-1 min-h-0 flex-col"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-slate-200/70 px-3 py-2.5 dark:border-emerald-400/15 dark:bg-slate-950/85 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px]">
            <span className="flex shrink-0 gap-1">
              <span className="h-2 w-2 bg-rose-500" />
              <span className="h-2 w-2 bg-amber-400" />
              <span className="h-2 w-2 bg-emerald-500" />
            </span>
            <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-300" />
            <span className="truncate text-emerald-700 dark:text-emerald-300">
              carlos@libai:~/friends
            </span>
            <span className="hidden text-slate-500 sm:inline">
              // FRIEND LINKS
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-mono text-[9px] text-slate-500">
            <span>{friends.length} LINKS</span>
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center gap-1 rounded-md border border-emerald-500/30 px-1.5 py-1 text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
              title="返回首页"
            >
              <CornerDownLeft className="h-3 w-3" />
              cd ~
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-emerald-500/15 px-3 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400 sm:px-4">
          <span className="text-slate-400 dark:text-slate-500">
            carlos@libai
          </span>
          <span className="text-slate-500">:</span>
          <span className="text-cyan-600 dark:text-cyan-300">~/friends</span>
          <span className="text-slate-500">$ </span>
          <span className="text-emerald-700 dark:text-emerald-300">
            friends --list --approved
          </span>
        </div>

        {mode === 'list' && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-emerald-500/15 px-3 py-2 font-mono text-[10px] sm:px-4">
            <span className="mr-1 text-slate-500">filter:</span>
            <button
              type="button"
              onClick={() => {
                setActiveTag(null);
                setQuery('');
                setStatus('filters cleared');
              }}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                !activeTag && !query
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                  : 'text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              [all]
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setActiveTag(tag);
                  setQuery('');
                  setStatus(`filter: #${tag}`);
                }}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  activeTag === tag
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                    : 'text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
              >
                [#{tag}]
              </button>
            ))}
            {query && (
              <span className="text-cyan-600 dark:text-cyan-300">
                search: &quot;{query}&quot;
              </span>
            )}
          </div>
        )}

        <div
          ref={bodyRef}
          onClick={(event) => {
            if (window.getSelection()?.toString()) return;
            const target = event.target as HTMLElement;
            if (target.closest('button, a, input, textarea')) return;
            inputRef.current?.focus({ preventScroll: true });
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 font-mono text-xs sm:p-4"
        >
          {mode === 'apply' ? (
            <TerminalFriendApplyForm
              onCancel={() => {
                setMode('list');
                setStatus('friend add cancelled');
              }}
              onSubmitted={(seed) => {
                setSubmittedSeed(seed);
                setMode('success');
                setStatus('friend request queued');
              }}
            />
          ) : mode === 'success' ? (
            <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="h-24 w-24 border border-emerald-500/30 bg-emerald-500/5 p-1">
                <FriendAvatar seed={submittedSeed} title="friend avatar" />
              </div>
              <div className="text-emerald-600 dark:text-emerald-300">
                [ok] friend request queued
              </div>
              <div className="max-w-sm text-[10px] leading-5 text-slate-500 dark:text-slate-400">
                waiting for review. once approved, this entry will appear in
                the list.
              </div>
              <div className="text-[10px] text-slate-400">
                seed #{submittedSeed}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('list');
                  setStatus('returned to friend list');
                }}
                className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300"
              >
                [back to list]
              </button>
            </div>
          ) : (
            <>
              {helpOpen && (
                <div className="mb-3 grid gap-1 border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[10px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                  {helpLines.map(([command, description]) => (
                    <div key={command} className="flex gap-2">
                      <code className="w-24 shrink-0 text-emerald-700 dark:text-emerald-300">
                        {command}
                      </code>
                      <span>{description}</span>
                    </div>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="flex h-40 items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  loading approved links...
                </div>
              ) : error ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-rose-600 dark:text-rose-300">
                  <span>[error] {error}</span>
                  <button
                    type="button"
                    onClick={() => setRetryToken((current) => current + 1)}
                    className="flex items-center gap-1 border border-rose-400/40 px-2 py-1 text-[10px]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    retry
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-1 text-slate-500">
                  <span className="text-emerald-500">no friends found</span>
                  <span className="text-[10px]">
                    {friends.length
                      ? 'try another filter'
                      : 'run "apply" to send the first request'}
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map((friend, index) => (
                    <a
                      key={friend.id}
                      href={friend.url}
                      target="_blank"
                      rel="noreferrer"
                      data-custom-sound
                      onClick={() => setStatus(`opened ${friend.name}`)}
                      className="group flex items-center gap-3 border border-transparent border-l-2 border-l-emerald-500/20 bg-white/30 px-2 py-2 transition-all hover:translate-x-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/10 dark:bg-slate-950/30 dark:hover:bg-emerald-500/10"
                    >
                      <span className="w-7 shrink-0 text-[9px] text-slate-400 group-hover:text-emerald-500">
                        [{String(index + 1).padStart(2, '0')}]
                      </span>
                      <span className="h-11 w-11 shrink-0 overflow-hidden border border-emerald-500/25">
                        <FriendAvatar
                          seed={friend.seed}
                          title={`${friend.name} avatar`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                            {friend.name}
                          </span>
                          {friend.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="border border-cyan-500/20 bg-cyan-500/5 px-1 py-0.5 text-[9px] text-cyan-700 dark:text-cyan-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {friend.description || friend.url}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] text-slate-400 dark:text-slate-500">
                          {friend.url}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[9px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                        open
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {mode === 'list' ? (
          <div className="shrink-0 border-t border-emerald-500/20 bg-white/55 px-3 py-2 dark:bg-slate-950/70 sm:px-4">
            <div className="mb-2 min-h-4 text-[10px] text-slate-500 dark:text-slate-400">
              {status ? (
                <>
                  <span className="text-emerald-500">&gt;</span> {status}
                </>
              ) : (
                '\u00a0'
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                <span className="hidden sm:inline">carlos@libai:</span>~$
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleCommandKeyDown}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-600 sm:text-sm"
                placeholder="open 01, apply, filter 生活, help..."
                aria-label="友链终端命令"
              />
              <button
                type="button"
                onClick={() => runCommand(input)}
                className="flex shrink-0 items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
              >
                <CornerDownLeft className="h-3 w-3" />
                run
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['help', 'apply', 'ls', 'reload', 'cd ~'].map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => runCommand(command)}
                  className="border border-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
                >
                  [{command}]
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-emerald-500/20 bg-white/55 px-3 py-2 font-mono text-[9px] text-slate-400 dark:bg-slate-950/70 sm:px-4">
            {mode === 'apply'
              ? 'apply mode · esc to cancel'
              : 'request queued · reply from the admin panel'}
          </div>
        )}
      </LiquidPixelCard>
    </div>
  );
};
