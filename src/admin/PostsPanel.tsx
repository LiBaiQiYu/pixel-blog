import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';

import type { BlogPost } from '../types/blog';

interface PostsPanelProps {
  api: (path: string, init?: RequestInit) => Promise<any>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}

function nextPostId(items: BlogPost[]) {
  const max = items.reduce((highest, post) => {
    const value = Number(post.id);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return String(max + 1).padStart(2, '0');
}

function withPublicField(markdown: string, isPublic: boolean) {
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return markdown;
  const head = markdown.slice(0, end);
  const tail = markdown.slice(end);
  const nextHead = /^public:\s*.*$/m.test(head)
    ? head.replace(/^public:\s*.*$/m, `public: ${isPublic}`)
    : `${head}\npublic: ${isPublic}`;
  return `${nextHead}${tail}`;
}

function newPostTemplate(id: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `---
id: "${id}"
slug: "new-post"
title: "新文章"
subtitle: ""
category: "随笔"
tags: ["随笔"]
date: "${date}"
readTime: "1 MIN"
views: 0
likes: 0
featured: false
public: true
coverSeed: ${Date.now() % 1000000}
accent: "cyan"
---

在这里开始写正文。

图片可直接上传，插入相对路径，例如：

![图片说明](./image.webp)
`;
}

export const PostsPanel: React.FC<PostsPanelProps> = ({
  api,
  onMessage,
  onError,
}) => {
  const [items, setItems] = useState<BlogPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [savedMarkdown, setSavedMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPostId, setLoadingPostId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const dirty = markdown !== savedMarkdown;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/__admin/posts');
      setItems(data.items ?? []);
    } catch (error) {
      onError(error instanceof Error ? error.message : '加载博文失败');
    } finally {
      setLoading(false);
    }
  }, [api, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectPost = async (id: string) => {
    if (loadingPostId) return;
    if (dirty && !window.confirm('当前修改尚未保存，仍要切换吗？')) return;
    setBusy(true);
    setLoadingPostId(id);
    try {
      const data = await api(`/__admin/posts/${encodeURIComponent(id)}`);
      setSelectedId(id);
      setMarkdown(data.markdown);
      setSavedMarkdown(data.markdown);
    } catch (error) {
      onError(error instanceof Error ? error.message : '读取博文失败');
    } finally {
      setBusy(false);
      setLoadingPostId(null);
    }
  };

  const toggleVisibility = async (post: BlogPost) => {
    if (busy) return;
    const nextPublic = post.isPublic === false;
    setBusy(true);
    try {
      const data = await api(
        `/__admin/posts/${encodeURIComponent(post.id)}/visibility`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isPublic: nextPublic }),
        }
      );
      setItems(data.items ?? []);
      if (selectedId === post.id) {
        setMarkdown((current) => withPublicField(current, nextPublic));
        setSavedMarkdown((current) => withPublicField(current, nextPublic));
      }
      onMessage(
        `博文 #${post.id} 已设为${nextPublic ? '公开' : '私密'}`
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : '更新可见性失败');
    } finally {
      setBusy(false);
    }
  };

  const createPost = () => {
    if (dirty && !window.confirm('当前修改尚未保存，仍要新建吗？')) return;
    const id = nextPostId(items);
    const template = newPostTemplate(id);
    setSelectedId(id);
    setMarkdown(template);
    setSavedMarkdown('');
    onMessage(`已创建草稿模板 #${id}，修改后点击保存`);
  };

  const savePost = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const data = await api(
        `/__admin/posts/${encodeURIComponent(selectedId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ markdown }),
        }
      );
      setItems(data.items ?? []);
      setSavedMarkdown(markdown);
      onMessage(`博文 #${selectedId} 已保存到 R2，并更新 posts.json`);
    } catch (error) {
      onError(error instanceof Error ? error.message : '保存博文失败');
    } finally {
      setBusy(false);
    }
  };

  const deletePost = async () => {
    if (!selectedId) return;
    if (
      !window.confirm(
        `确定删除博文 #${selectedId}？关联图片也会一起删除，且不可恢复。`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const data = await api(
        `/__admin/posts/${encodeURIComponent(selectedId)}?deleteImages=1`,
        { method: 'DELETE' }
      );
      setItems(data.items ?? []);
      setSelectedId(null);
      setMarkdown('');
      setSavedMarkdown('');
      onMessage(`博文 #${selectedId} 已删除`);
    } catch (error) {
      onError(error instanceof Error ? error.message : '删除博文失败');
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!selectedId || uploading) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file, file.name);
      const data = await api(
        `/__admin/posts/${encodeURIComponent(selectedId)}/images`,
        { method: 'POST', body }
      );
      const snippet = `${data.markdown}\n`;
      setMarkdown((current) => `${current.trimEnd()}\n\n${snippet}`);
      onMessage('图片已上传，Markdown 已插入，记得保存博文');
    } catch (error) {
      onError(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const selectedPost = useMemo(
    () => items.find((post) => post.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-slate-300/60 bg-white/70 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
            R2 POSTS // {items.length}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-slate-300/60 p-1.5 text-slate-500 hover:text-cyan-600 dark:border-white/10 dark:text-slate-400"
              title="刷新"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={createPost}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 font-mono text-[10px] text-cyan-700 dark:border-cyan-400/40 dark:text-cyan-200"
            >
              <Plus className="h-3.5 w-3.5" />
              新建
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 font-mono text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            读取 posts.json
          </div>
        ) : (
          <div className="max-h-[66vh] space-y-1 overflow-y-auto pr-1">
            {items.map((post) => (
              <div
                key={post.id}
                className={`relative rounded-xl border transition-colors ${
                  post.id === selectedId
                    ? 'border-cyan-500/40 bg-cyan-500/10'
                    : 'border-transparent hover:border-slate-300/60 hover:bg-white/50 dark:hover:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <button
                  type="button"
                  disabled={Boolean(loadingPostId)}
                  onClick={() => void selectPost(post.id)}
                  className="w-full rounded-xl px-3 py-2 pr-12 text-left disabled:cursor-wait"
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                    {loadingPostId === post.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-cyan-500" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    #{post.id} · {post.date}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {post.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-slate-400">
                    <span>{post.category} · {post.readTime}</span>
                    {post.isPublic === false && (
                      <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1 py-0.2 text-[8px] text-amber-600 dark:text-amber-300">
                        PRIVATE
                      </span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleVisibility(post)}
                  className={`absolute right-2 top-2 rounded-lg border p-1.5 transition-colors disabled:opacity-40 ${
                    post.isPublic === false
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                      : 'border-slate-300/60 text-slate-400 hover:text-cyan-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-cyan-300'
                  }`}
                  title={post.isPublic === false ? '设为公开可见' : '设为私密'}
                  aria-label={post.isPublic === false ? '设为公开可见' : '设为私密'}
                >
                  {post.isPublic === false ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-4 text-center font-mono text-xs text-slate-400">
                暂无博文
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="min-w-0 rounded-2xl border border-slate-300/60 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-5">
        {loadingPostId ? (
          <div className="flex min-h-[52vh] flex-col items-center justify-center gap-3 text-center font-mono text-xs text-slate-400">
            <span className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
              <Loader2 className="relative h-6 w-6 animate-spin text-cyan-500" />
            </span>
            <div>LOADING POST #{loadingPostId}...</div>
            <div className="text-[10px] text-slate-500">正在从 R2 读取 post.md</div>
          </div>
        ) : !selectedId ? (
          <div className="flex min-h-[52vh] flex-col items-center justify-center gap-2 text-center font-mono text-xs text-slate-400">
            <FileText className="h-8 w-8" />
            选择左侧博文开始编辑，或新建一篇
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
                  blog/{selectedId}/post.md
                </div>
                <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {selectedPost?.title ?? `草稿 #${selectedId}`}
                  {dirty && (
                    <span className="ml-2 align-middle font-mono text-[10px] text-amber-500">
                      未保存
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedPost && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleVisibility(selectedPost)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] disabled:opacity-40 ${
                      selectedPost.isPublic === false
                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {selectedPost.isPublic === false ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {selectedPost.isPublic === false ? '私密' : '公开'}
                  </button>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300/60 bg-white/60 px-2.5 py-1.5 font-mono text-[10px] text-slate-600 hover:border-cyan-400/50 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  上传图片
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void savePost()}
                  disabled={busy || !dirty}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[10px] text-emerald-700 disabled:opacity-40 dark:border-emerald-400/40 dark:text-emerald-200"
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
                  onClick={() => void deletePost()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 font-mono text-[10px] text-rose-700 disabled:opacity-40 dark:border-rose-400/40 dark:text-rose-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            </div>

            <textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              className="h-[58vh] w-full resize-y rounded-xl border border-slate-300/60 bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 outline-none transition-colors focus:border-cyan-400/50 dark:border-white/10"
            />
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-slate-400">
              直接编辑 frontmatter 和 Markdown；图片用相对路径 `./文件名`，发布时会从
              `blog/{selectedId}/` 读取。
            </p>
          </>
        )}
      </div>
    </section>
  );
};
