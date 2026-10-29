import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock3,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { FriendAvatar } from '../components/FriendAvatar';

type FriendStatus = 'pending' | 'approved' | 'rejected';

interface AdminFriend {
  id: number;
  name: string;
  url: string;
  seed: number;
  description: string;
  tags: string[];
  status: FriendStatus;
  createdAt: string;
  updatedAt: string;
}

interface FriendsPanelProps {
  api: (path: string, init?: RequestInit) => Promise<any>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}

interface FriendDraft {
  name: string;
  url: string;
  seed: string;
  description: string;
  tags: string;
}

type Filter = 'all' | FriendStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已展示' },
  { value: 'rejected', label: '已拒绝' },
];

const STATUS_STYLES: Record<FriendStatus, string> = {
  pending:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rejected:
    'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const STATUS_LABELS: Record<FriendStatus, string> = {
  pending: '待审核',
  approved: '已展示',
  rejected: '已拒绝',
};

function toDraft(friend: AdminFriend): FriendDraft {
  return {
    name: friend.name,
    url: friend.url,
    seed: String(friend.seed),
    description: friend.description,
    tags: friend.tags.join(', '),
  };
}

function splitTags(value: string) {
  return value
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({
  api,
  onMessage,
  onError,
}) => {
  const [items, setItems] = useState<AdminFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FriendDraft | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/__admin/friends/admin');
      setItems(Array.isArray(data.friends) ? data.friends : []);
    } catch (err) {
      onError(err instanceof Error ? err.message : '友链记录加载失败');
    } finally {
      setLoading(false);
    }
  }, [api, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    return items.reduce(
      (result, item) => {
        result.all += 1;
        result[item.status] += 1;
        return result;
      },
      { all: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [items]);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? items
        : items.filter((item) => item.status === filter),
    [filter, items]
  );

  const updateStatus = async (friend: AdminFriend, status: FriendStatus) => {
    setBusyId(friend.id);
    try {
      await api(`/__admin/friends/admin/${friend.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onMessage(
        status === 'approved'
          ? `已展示「${friend.name}」`
          : status === 'rejected'
            ? `已拒绝「${friend.name}」`
            : `「${friend.name}」已移回待审核`
      );
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (friend: AdminFriend) => {
    setEditingId(friend.id);
    setDraft(toDraft(friend));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async (friend: AdminFriend) => {
    if (!draft) return;
    const name = draft.name.trim();
    const url = draft.url.trim();
    const seed = Number(draft.seed);

    if (!name) {
      onError('友链名称不能为空');
      return;
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      onError('友链网址需要以 http:// 或 https:// 开头');
      return;
    }
    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483647) {
      onError('种子需要是 1 - 2147483647 的整数');
      return;
    }

    setBusyId(friend.id);
    try {
      await api(`/__admin/friends/admin/${friend.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          url,
          seed,
          description: draft.description.trim(),
          tags: splitTags(draft.tags),
        }),
      });
      onMessage(`已保存「${name}」`);
      cancelEdit();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusyId(null);
    }
  };

  const deleteFriend = async (friend: AdminFriend) => {
    if (
      !window.confirm(
        `确定删除「${friend.name}」吗？删除后无法恢复。`
      )
    ) {
      return;
    }
    setBusyId(friend.id);
    try {
      await api(`/__admin/friends/admin/${friend.id}`, {
        method: 'DELETE',
      });
      onMessage(`已删除「${friend.name}」`);
      if (editingId === friend.id) cancelEdit();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300/60 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] text-violet-700 dark:text-violet-300">
            <Link2 className="h-4 w-4" />
            FRIEND LINKS
          </div>
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-colors ${
                filter === item.value
                  ? 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200'
                  : 'border-slate-300/60 text-slate-500 hover:text-slate-800 dark:border-white/10 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {item.label} {counts[item.value]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          LOADING FRIEND REQUESTS...
        </div>
      ) : visible.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300/70 font-mono text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
          <Link2 className="h-5 w-5 opacity-50" />
          {filter === 'all' ? '还没有友链申请' : '这个分类下没有记录'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((friend) => {
            const activeDraft = editingId === friend.id ? draft : null;
            const busy = busyId === friend.id;
            return (
              <article
                key={friend.id}
                className="rounded-2xl border border-slate-300/60 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-300/70 dark:border-white/15">
                    <FriendAvatar
                      seed={Number(activeDraft?.seed) || friend.seed}
                      title={`${friend.name} 的头像`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {activeDraft ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={activeDraft.name}
                          onChange={(event) =>
                            setDraft({
                              ...activeDraft,
                              name: event.target.value,
                            })
                          }
                          placeholder="友链名称"
                          className="rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                        />
                        <input
                          value={activeDraft.url}
                          onChange={(event) =>
                            setDraft({
                              ...activeDraft,
                              url: event.target.value,
                            })
                          }
                          placeholder="https://example.com"
                          className="rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                        />
                        <input
                          type="number"
                          value={activeDraft.seed}
                          onChange={(event) =>
                            setDraft({
                              ...activeDraft,
                              seed: event.target.value,
                            })
                          }
                          placeholder="头像种子"
                          className="rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                        />
                        <input
                          value={activeDraft.tags}
                          onChange={(event) =>
                            setDraft({
                              ...activeDraft,
                              tags: event.target.value,
                            })
                          }
                          placeholder="标签，逗号分隔"
                          className="rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100"
                        />
                        <textarea
                          value={activeDraft.description}
                          onChange={(event) =>
                            setDraft({
                              ...activeDraft,
                              description: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder="一句话介绍"
                          className="rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 sm:col-span-2"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                            {friend.name}
                          </h2>
                          <span
                            className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${STATUS_STYLES[friend.status]}`}
                          >
                            {STATUS_LABELS[friend.status]}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400">
                            #{friend.id} · seed {friend.seed}
                          </span>
                        </div>
                        <a
                          href={friend.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 break-all font-mono text-[10px] text-sky-600 hover:underline dark:text-cyan-300"
                        >
                          {friend.url}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        {friend.description && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {friend.description}
                          </p>
                        )}
                        {friend.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {friend.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] text-violet-600 dark:text-violet-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {formatDate(friend.createdAt)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
                    {activeDraft ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveEdit(friend)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[10px] text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          保存
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEdit}
                          className="flex items-center justify-center gap-1 rounded-lg border border-slate-300/60 px-2.5 py-1.5 font-mono text-[10px] text-slate-500 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        {friend.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateStatus(friend, 'approved')}
                            className="flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[10px] text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
                          >
                            <Check className="h-3.5 w-3.5" />
                            通过
                          </button>
                        )}
                        {friend.status === 'approved' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateStatus(friend, 'pending')}
                            className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[10px] text-amber-700 disabled:opacity-50 dark:text-amber-300"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            下架
                          </button>
                        )}
                        {friend.status === 'pending' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateStatus(friend, 'rejected')}
                            className="flex items-center justify-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[10px] text-rose-700 disabled:opacity-50 dark:text-rose-300"
                          >
                            <X className="h-3.5 w-3.5" />
                            拒绝
                          </button>
                        )}
                        {friend.status === 'rejected' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateStatus(friend, 'pending')}
                            className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[10px] text-amber-700 disabled:opacity-50 dark:text-amber-300"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            待审
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(friend)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 font-mono text-[10px] text-sky-700 disabled:opacity-50 dark:text-cyan-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          编辑
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteFriend(friend)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[10px] text-rose-700 disabled:opacity-50 dark:text-rose-300"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
