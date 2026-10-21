import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Moon,
  RefreshCw,
  Save,
  Settings,
  Sun,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import type { GalleryEntry, GalleryMeta } from '../types/gallery';
import type { GalleryManifestEntry } from '../types/gallery-manifest';

interface LibraryItem {
  entry: GalleryEntry;
  meta: GalleryMeta | null;
  assets: GalleryManifestEntry | undefined;
  previewUrl: string;
}

interface AdminConfig {
  storage: {
    provider: 'local' | 'r2';
    publicBaseUrl: string;
    bucket: string;
    prefix: string;
  };
  accountId: string;
  accessKeyIdMasked: string;
  hasAccessKey: boolean;
  hasSecret: boolean;
  cacheControl: string;
  configured: boolean;
  networkUrls: string[];
}

interface UploadRow {
  id: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

type Tab = 'storage' | 'upload' | 'library';

const TOKEN_KEY = 'pixel_blog_admin_token';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function splitTags(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
}

function stemOf(name: string) {
  return name.replace(/\.[^.]+$/, '').toLowerCase();
}

export default function AdminApp() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) ?? ''
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('pixel_blog_admin_theme') === 'light'
      ? 'light'
      : 'dark'
  );
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenInput, setTokenInput] = useState(token);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pixel_blog_admin_theme', theme);
  }, [theme]);
  const [tab, setTab] = useState<Tab>('storage');
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const response = await fetch(path, {
        ...init,
        headers: {
          ...(init.body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...(token ? { 'x-admin-token': token } : {}),
          ...init.headers,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setNeedsToken(true);
        throw new ApiError(data.error ?? '需要管理令牌', 401);
      }
      if (!response.ok) {
        throw new ApiError(data.error ?? '请求失败', response.status);
      }
      return data;
    },
    [token]
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [configData, libraryData] = await Promise.all([
        api('/__admin/config'),
        api('/__admin/library'),
      ]);
      setConfig(configData);
      setItems(libraryData.items);
      setNeedsToken(false);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveToken = () => {
    const next = tokenInput.trim();
    sessionStorage.setItem(TOKEN_KEY, next);
    setToken(next);
    setNeedsToken(false);
  };

  const unread = items.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(232,121,249,0.08),transparent_30%)]" />
      <header className="sticky top-0 z-20 border-b border-slate-300/60 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 dark:border-cyan-400/30 bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-700 dark:text-cyan-300">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-pixel text-sm text-slate-900 dark:text-white">
                GALLERY ADMIN // 图库管理
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                {unread} photos · {config?.storage.provider ?? 'local'} storage
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setTheme((current) =>
                  current === 'dark' ? 'light' : 'dark'
                )
              }
              className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300"
              title="切换深浅色"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              {theme === 'dark' ? '浅色' : '深色'}
            </button>
            <a
              href="/"
              className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              返回站点
            </a>
            <button
              type="button"
              onClick={() => void refresh()}
              className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300"
              title="刷新"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            ['storage', Settings, '存储配置'],
            ['upload', UploadCloud, '上传图片'],
            ['library', ImageIcon, '图片管理'],
          ].map(([key, Icon, label]) => (
            <button
              key={key as string}
              type="button"
              onClick={() => setTab(key as Tab)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[11px] transition-all ${
                tab === key
                  ? 'border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-700 dark:text-cyan-200'
                  : 'border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label as string}
            </button>
          ))}
        </div>

        {message && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 px-3 py-2 font-mono text-xs text-emerald-700 dark:text-emerald-200">
            <Check className="h-4 w-4" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 dark:border-rose-400/30 bg-rose-500/10 dark:bg-rose-400/10 px-3 py-2 font-mono text-xs text-rose-700 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {needsToken ? (
          <TokenPrompt
            value={tokenInput}
            onChange={setTokenInput}
            onSubmit={saveToken}
          />
        ) : loading ? (
          <div className="flex h-48 items-center justify-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            LOADING ADMIN…
          </div>
        ) : (
          <>
            {tab === 'storage' && config && (
              <StoragePanel
                config={config}
                api={api}
                onSaved={(msg) => {
                  setMessage(msg);
                  void refresh();
                }}
                onError={setError}
              />
            )}
            {tab === 'upload' && config && (
              <UploadPanel
                config={config}
                api={api}
                onDone={(msg) => {
                  setMessage(msg);
                  void refresh();
                }}
              />
            )}
            {tab === 'library' && (
              <LibraryPanel
                items={items}
                api={api}
                onChanged={(msg) => {
                  setMessage(msg);
                  void refresh();
                }}
                onError={setError}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TokenPrompt({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs text-cyan-700 dark:text-cyan-300">
        <KeyRound className="h-4 w-4" />
        ADMIN TOKEN
      </div>
      <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        服务端配置了 ADMIN_DEV_TOKEN。输入令牌后可管理 R2 和照片。
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          placeholder="输入管理令牌"
          className="min-w-0 flex-1 rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-400/50"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg border border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-2 font-mono text-xs text-cyan-700 dark:text-cyan-200"
        >
          进入
        </button>
      </div>
    </div>
  );
}

function StoragePanel({
  config,
  api,
  onSaved,
  onError,
}: {
  config: AdminConfig;
  api: (path: string, init?: RequestInit) => Promise<any>;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    provider: config.storage.provider,
    publicBaseUrl: config.storage.publicBaseUrl,
    bucket: config.storage.bucket,
    prefix: config.storage.prefix || 'gallery',
    accountId: config.accountId,
    accessKeyId: '',
    secretAccessKey: '',
    cacheControl: config.cacheControl,
  });
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testFailed, setTestFailed] = useState(false);

  useEffect(() => {
    setForm({
      provider: config.storage.provider,
      publicBaseUrl: config.storage.publicBaseUrl,
      bucket: config.storage.bucket,
      prefix: config.storage.prefix || 'gallery',
      accountId: config.accountId,
      accessKeyId: '',
      secretAccessKey: '',
      cacheControl: config.cacheControl,
    });
  }, [config]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const save = async (testAfter: boolean) => {
    setBusy(true);
    setTestResult(null);
    setTestFailed(false);
    try {
      await api('/__admin/config', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (testAfter) {
        const result = await api('/__admin/config/test', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            origin: window.location.origin,
          }),
        });
        setTestFailed(!result.ok);
        setTestResult(
          result.ok
            ? result.provider === 'local'
              ? '本地存储可用'
              : 'R2 写入、公开链接和 CORS 均通过'
            : result.error || '连接测试失败'
        );
      }
      onSaved('存储配置已保存');
    } catch (error) {
      onError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 backdrop-blur-xl sm:p-5">
        <div className="mb-4 font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
          STORAGE // 存储配置
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            存储方式
            <select
              value={form.provider}
              onChange={(event) => {
                const provider = event.target.value as 'local' | 'r2';
                setForm((previous) => ({
                  ...previous,
                  provider,
                  publicBaseUrl:
                    provider === 'local' ? '' : previous.publicBaseUrl,
                }));
              }}
              className="w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
            >
              <option value="local">本地 public/gallery</option>
              <option value="r2">Cloudflare R2</option>
            </select>
          </label>
          {form.provider === 'r2' ? (
            <>
          <Field
            label="公开访问域名"
            value={form.publicBaseUrl}
            onChange={(value) => update('publicBaseUrl', value)}
            placeholder="https://images.example.com"
          />
          <Field
            label="Account ID"
            value={form.accountId}
            onChange={(value) => update('accountId', value)}
            placeholder="Cloudflare account id"
          />
          <Field
            label="Bucket"
            value={form.bucket}
            onChange={(value) => update('bucket', value)}
            placeholder="pixel-blog-gallery"
          />
          <Field
            label="Prefix"
            value={form.prefix}
            onChange={(value) => update('prefix', value)}
            placeholder="gallery"
          />
          <Field
            label="Cache-Control"
            value={form.cacheControl}
            onChange={(value) => update('cacheControl', value)}
            placeholder="public, max-age=31536000, immutable"
          />
          <Field
            label={`Access Key ID${config.hasAccessKey ? '（留空不修改）' : ''}`}
            value={form.accessKeyId}
            onChange={(value) => update('accessKeyId', value)}
            placeholder={
              config.hasAccessKey
                ? `已保存 ${config.accessKeyIdMasked}`
                : 'R2 access key id'
            }
            type="password"
          />
          <Field
            label={`Secret Access Key${config.hasSecret ? '（留空不修改）' : ''}`}
            value={form.secretAccessKey}
            onChange={(value) => update('secretAccessKey', value)}
            placeholder={config.hasSecret ? '已保存，留空不修改' : 'R2 secret'}
            type="password"
          />
            </>
          ) : (
          <div className="sm:col-span-2 rounded-xl border border-slate-300/60 bg-white/60 p-3 font-mono text-[10px] leading-relaxed text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            本地模式不需要 R2 配置，图片会写入 public/gallery，并同步更新 manifest。之后可随时切换到 R2。
          </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(false)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-2 font-mono text-[11px] text-cyan-700 dark:text-cyan-200 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300/70 dark:border-white/15 bg-white/70 dark:bg-white/5 px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            保存并测试链接
          </button>
          {testResult && (
            <span
              className={`font-mono text-[10px] ${
                testFailed
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {testResult}
            </span>
          )}
        </div>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-slate-500">
          密钥只写入开发机的 .gallery-admin.env。公开域名写入
          gallery-storage.json，保存后无需重启 Vite。生产环境不会包含管理接口。
        </p>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          <div className="mb-2 text-cyan-700 dark:text-cyan-300">PHONE ACCESS</div>
          {config.networkUrls.length ? (
            <ul className="space-y-1 break-all">
              {config.networkUrls.map((url) => (
                <li key={url}>{url}</li>
              ))}
            </ul>
          ) : (
            <p>未检测到局域网地址。</p>
          )}
          <p className="mt-3 leading-relaxed text-slate-500">
            手机与电脑需在同一 Wi-Fi。若设置了 ADMIN_DEV_TOKEN，手机首次访问需要输入。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          <div className="mb-2 text-cyan-700 dark:text-cyan-300">CURRENT</div>
          <div>provider: {config.storage.provider}</div>
          <div>bucket: {config.storage.bucket || '—'}</div>
          <div>prefix: {config.storage.prefix || '—'}</div>
          <div>configured: {config.configured ? 'yes' : 'no'}</div>
        </div>
      </aside>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-400/50"
      />
    </label>
  );
}

function UploadPanel({
  config,
  api,
  onDone,
}: {
  config: AdminConfig;
  api: (path: string, init?: RequestInit) => Promise<any>;
  onDone: (message: string) => void;
}) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [fields, setFields] = useState({
    title: '',
    description: '',
    category: '生活',
    area: '',
    place: '',
    tags: '',
  });
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [busy, setBusy] = useState(false);

  const videoMatches = useMemo(() => {
    if (!video || photos.length !== 1) return false;
    return stemOf(video.name) === stemOf(photos[0].name);
  }, [photos, video]);

  const updateField = (key: keyof typeof fields, value: string) => {
    setFields((previous) => ({ ...previous, [key]: value }));
  };

  const upload = async () => {
    if (!photos.length || busy) return;
    setBusy(true);
    setRows(
      photos.map((file, index) => ({
        id: `${index}-${file.name}`,
        name: file.name,
        status: 'uploading',
        progress: 0,
      }))
    );

    try {
      for (const [index, photo] of photos.entries()) {
        const pairedVideo =
          video && photos.length === 1 && videoMatches ? video : undefined;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/__admin/upload');
          if (sessionStorage.getItem(TOKEN_KEY)) {
            xhr.setRequestHeader(
              'x-admin-token',
              sessionStorage.getItem(TOKEN_KEY) ?? ''
            );
          }
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.round(
              (event.loaded / event.total) * 100
            );
            setRows((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, progress } : row
              )
            );
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, progress: 100, status: 'done' }
                    : row
                )
              );
              resolve();
            } else {
              let message = `HTTP ${xhr.status}`;
              try {
                message = JSON.parse(xhr.responseText).error ?? message;
              } catch {
                // keep status message
              }
              setRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, status: 'error', error: message }
                    : row
                )
              );
              reject(new Error(message));
            }
          };
          xhr.onerror = () => {
            setRows((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index
                  ? { ...row, status: 'error', error: '网络错误' }
                  : row
              )
            );
            reject(new Error('网络错误'));
          };

          const body = new FormData();
          body.append('photo', photo, photo.name);
          if (pairedVideo) {
            body.append('video', pairedVideo, pairedVideo.name);
          }
          for (const [key, value] of Object.entries(fields)) {
            if (value.trim()) body.append(key, value.trim());
          }
          xhr.send(body);
        });
      }

      setPhotos([]);
      setVideo(null);
      onDone('上传完成，已写入 manifest 和画廊数据');
    } catch {
      // per-file error is shown in the queue
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
      <div className="rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 backdrop-blur-xl sm:p-5">
        <div className="mb-4 font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
          UPLOAD // 上传图片
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            照片（支持多选）
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setPhotos(Array.from(event.target.files ?? []))
              }
              className="block w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-400/15 file:px-2 file:py-1 file:font-mono file:text-cyan-700 dark:file:text-cyan-200"
            />
          </label>
          <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            实况视频（可选，.MOV）
            <input
              type="file"
              accept="video/quicktime,video/mp4"
              onChange={(event) =>
                setVideo(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-pink-400/15 file:px-2 file:py-1 file:font-mono file:text-pink-700 dark:file:text-pink-200"
            />
          </label>
        </div>

        {video && (
          <p
            className={`mt-2 font-mono text-[10px] ${
              videoMatches ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {videoMatches
              ? `已配对：${photos[0]?.name} + ${video.name}`
              : '实况视频需与照片同名（不含扩展名），当前未配对，视频不会上传。'}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="标题"
            value={fields.title}
            onChange={(value) => updateField('title', value)}
            placeholder="留空则用文件名"
          />
          <Field
            label="分类"
            value={fields.category}
            onChange={(value) => updateField('category', value)}
            placeholder="旅行 / 代码 / 饮食 / 日常"
          />
          <Field
            label="地区"
            value={fields.area}
            onChange={(value) => updateField('area', value)}
            placeholder="可选"
          />
          <Field
            label="地点"
            value={fields.place}
            onChange={(value) => updateField('place', value)}
            placeholder="可选"
          />
          <Field
            label="标签（逗号分隔）"
            value={fields.tags}
            onChange={(value) => updateField('tags', value)}
            placeholder="可选"
          />
          <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            描述
            <input
              value={fields.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              placeholder="可选"
              className="w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-400/50"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!photos.length || busy}
          onClick={() => void upload()}
          className="mt-4 flex items-center gap-2 rounded-lg border border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/10 dark:bg-cyan-400/10 px-4 py-2 font-mono text-[11px] text-cyan-700 dark:text-cyan-200 disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UploadCloud className="h-3.5 w-3.5" />
          )}
          {busy ? '处理中…' : `上传 ${photos.length || ''} 张`}
        </button>

        {rows.length > 0 && (
          <div className="mt-4 space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-slate-300/60 dark:border-white/10 bg-white/60 dark:bg-slate-950/50 px-3 py-2 font-mono text-[10px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-600 dark:text-slate-300">{row.name}</span>
                  <span
                    className={
                      row.status === 'done'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : row.status === 'error'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-cyan-700 dark:text-cyan-300'
                    }
                  >
                    {row.status === 'done'
                      ? 'DONE'
                      : row.status === 'error'
                        ? row.error
                        : `${row.progress}%`}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-cyan-400 transition-[width]"
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-3 rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 font-mono text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
        <div className="text-cyan-700 dark:text-cyan-300">IPHONE LIVE PHOTO</div>
        <p>
          浏览器不能保证从相册一键读取 Live Photo 的 HEIC + MOV 两段文件。
        </p>
        <p>
          建议在 iPhone 上从“照片”分享到“文件”，然后把同名的照片和 .MOV
          一起选择。管理页会按文件名自动配对。
        </p>
        <p>
          当前存储：{config.storage.provider === 'r2' ? 'Cloudflare R2' : '本地 public/gallery'}。
          {config.storage.provider === 'r2'
            ? '上传只写入 R2，不会在本地保留副本。'
            : '上传只写入本地 public/gallery，不会写入 R2。'}
        </p>
      </aside>
    </section>
  );
}

function LibraryPanel({
  items,
  api,
  onChanged,
  onError,
}: {
  items: LibraryItem[];
  api: (path: string, init?: RequestInit) => Promise<any>;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.entry.id ?? null
  );
  const selected =
    items.find((item) => item.entry.id === selectedId) ?? items[0] ?? null;

  useEffect(() => {
    if (
      selectedId &&
      items.some((item) => item.entry.id === selectedId)
    ) {
      return;
    }
    setSelectedId(items[0]?.entry.id ?? null);
  }, [items, selectedId]);

  return (
    <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-2">
        {items.length === 0 && (
          <p className="p-4 font-mono text-xs text-slate-500">
            还没有照片，先去上传。
          </p>
        )}
        {items.map((item) => (
          <button
            key={item.entry.id}
            type="button"
            onClick={() => setSelectedId(item.entry.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-all ${
              selected?.entry.id === item.entry.id
                ? 'border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/10 dark:bg-cyan-400/10'
                : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/70 dark:bg-white/5'
            }`}
          >
            <img
              src={item.previewUrl}
              alt=""
              className="h-12 w-16 shrink-0 rounded-md object-cover"
            />
            <span className="min-w-0">
              <span className="block truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
                {item.entry.title}
              </span>
              <span className="block truncate font-mono text-[9px] text-slate-500">
                {item.entry.category} · {item.entry.id}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 sm:p-5">
        {selected ? (
          <LibraryEditor
            key={selected.entry.id}
            item={selected}
            api={api}
            onChanged={onChanged}
            onError={onError}
          />
        ) : (
          <p className="font-mono text-xs text-slate-500">选择一张照片。</p>
        )}
      </div>
    </section>
  );
}

function LibraryEditor({
  item,
  api,
  onChanged,
  onError,
}: {
  item: LibraryItem;
  api: (path: string, init?: RequestInit) => Promise<any>;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    title: item.entry.title,
    description: item.entry.description,
    category: item.entry.category,
    area: item.entry.area ?? '',
    place: item.entry.place ?? '',
    tags: item.meta?.tags?.join(', ') ?? '',
    date: toLocalDateTime(item.entry.date),
  });
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await api(`/__admin/library/${encodeURIComponent(item.entry.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          tags: splitTags(form.tags),
          date: form.date
            ? new Date(form.date).toISOString()
            : item.entry.date,
        }),
      });
      onChanged('照片信息已保存');
    } catch (error) {
      onError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        `删除 “${item.entry.title}”？\n会同时删除 R2/本地图片和画廊数据。`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api(`/__admin/library/${encodeURIComponent(item.entry.id)}`, {
        method: 'DELETE',
      });
      onChanged('照片已删除');
    } catch (error) {
      onError(error instanceof Error ? error.message : '删除失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-start gap-4">
        <img
          src={item.previewUrl}
          alt=""
          className="h-24 w-32 rounded-lg object-cover"
        />
        <div className="min-w-0 font-mono text-[10px] text-slate-500">
          <div className="text-cyan-700 dark:text-cyan-300">{item.entry.id}</div>
          <div className="mt-1">
            {item.entry.width} × {item.entry.height}
          </div>
          <div>{item.meta?.isLivePhoto ? 'LIVE PHOTO' : 'STILL PHOTO'}</div>
          <div className="mt-2 break-all">
            {item.assets?.original?.key ?? '—'}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="标题"
          value={form.title}
          onChange={(value) => update('title', value)}
        />
        <Field
          label="分类"
          value={form.category}
          onChange={(value) => update('category', value)}
        />
        <Field
          label="地区"
          value={form.area}
          onChange={(value) => update('area', value)}
        />
        <Field
          label="地点"
          value={form.place}
          onChange={(value) => update('place', value)}
        />
        <Field
          label="标签（逗号分隔）"
          value={form.tags}
          onChange={(value) => update('tags', value)}
        />
        <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
          拍摄时间
          <input
            type="datetime-local"
            value={form.date}
            onChange={(event) => update('date', event.target.value)}
            className="w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-400/50"
          />
        </label>
        <label className="space-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 sm:col-span-2">
          描述
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-cyan-400/50"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 dark:border-cyan-400/40 bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-2 font-mono text-[11px] text-cyan-700 dark:text-cyan-200 disabled:opacity-50"
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
          onClick={() => void remove()}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 dark:border-rose-400/30 bg-rose-500/10 dark:bg-rose-400/10 px-3 py-2 font-mono text-[11px] text-rose-700 dark:text-rose-200 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
    </div>
  );
}

