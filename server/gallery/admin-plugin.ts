import type { IncomingMessage, ServerResponse } from 'node:http';

import Busboy from 'busboy';
import type { Plugin } from 'vite';

import {
  getAdminConfig,
  getAdminToken,
  saveAdminConfig,
  testStorage,
  type AdminConfigInput,
} from './config';
import {
  listLibrary,
  removeEntry,
  saveUploadedPhoto,
  updateEntry,
} from './data';
import { processUpload, type UploadFields } from './processing';
import { deleteFiles, saveFiles } from './storage';

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {} as T;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

function authorized(req: IncomingMessage, res: ServerResponse) {
  const token = getAdminToken();
  if (!token) return true;
  if (req.headers['x-admin-token'] === token) return true;

  sendJson(res, 401, {
    error: '需要管理令牌',
    needsToken: true,
  });
  return false;
}

interface MultipartFile {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

function parseMultipart(
  req: IncomingMessage
): Promise<{
  fields: Record<string, string>;
  files: Record<string, MultipartFile>;
}> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Record<string, MultipartFile> = {};

    let busboy: Busboy.Busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: {
          files: 2,
          fileSize: 200 * 1024 * 1024,
          fields: 40,
        },
      });
    } catch (error) {
      reject(error);
      return;
    }

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('limit', () => {
        reject(new Error(`${info.filename} 超过 200MB 限制`));
        stream.resume();
      });
      stream.on('end', () => {
        files[name] = {
          buffer: Buffer.concat(chunks),
          fileName: info.filename || name,
          contentType: info.mimeType || 'application/octet-stream',
        };
      });
    });

    busboy.on('error', reject);
    busboy.on('finish', () => resolve({ fields, files }));
    req.pipe(busboy);
  });
}

function normalizeAccent(value?: string) {
  const accents = ['cyan', 'magenta', 'emerald', 'amber', 'violet'] as const;
  return accents.includes(value as (typeof accents)[number])
    ? (value as (typeof accents)[number])
    : undefined;
}

export function galleryAdminPlugin(): Plugin {
  return {
    name: 'gallery-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/__admin/')) {
          next();
          return;
        }

        if (!authorized(req, res)) return;

        try {
          if (req.method === 'GET' && url.pathname === '/__admin/config') {
            sendJson(res, 200, await getAdminConfig(server.config.server.port ?? 5173));
            return;
          }

          if (req.method === 'PUT' && url.pathname === '/__admin/config') {
            const body = await readJsonBody<AdminConfigInput>(req);
            const storage = await saveAdminConfig(body);
            sendJson(res, 200, {
              ok: true,
              storage,
              config: await getAdminConfig(server.config.server.port ?? 5173),
            });
            return;
          }

          if (
            req.method === 'POST' &&
            url.pathname === '/__admin/config/test'
          ) {
            const body = await readJsonBody<AdminConfigInput & { origin?: string }>(req);
            sendJson(res, 200, await testStorage(body.origin));
            return;
          }

          if (req.method === 'GET' && url.pathname === '/__admin/library') {
            sendJson(res, 200, {
              items: await listLibrary(),
              config: await getAdminConfig(server.config.server.port ?? 5173),
            });
            return;
          }

          if (
            req.method === 'POST' &&
            url.pathname === '/__admin/upload'
          ) {
            const { fields, files } = await parseMultipart(req);
            const photo = files.photo;
            if (!photo) {
              sendJson(res, 400, { error: '请选择要上传的照片' });
              return;
            }

            const processed = await processUpload(
              photo.buffer,
              photo.fileName,
              fields as UploadFields,
              files.video
            );
            const assets = await saveFiles(
              processed.files,
              processed.assets
            );
            try {
              const result = await saveUploadedPhoto({
                id: processed.id,
                entry: processed.entry,
                meta: processed.meta,
                assets,
                placeholder: processed.placeholder,
              });
              sendJson(res, 200, result);
            } catch (error) {
              // Do not leave orphaned R2 objects when the local data write fails.
              await deleteFiles(
                Object.values(assets)
                  .map((asset) => asset?.key)
                  .filter((key): key is string => Boolean(key))
              );
              throw error;
            }
            return;
          }

          const entryMatch = url.pathname.match(
            /^\/__admin\/library\/([^/]+)$/
          );
          if (entryMatch) {
            const id = decodeURIComponent(entryMatch[1]);

            if (req.method === 'PUT') {
              const body = await readJsonBody<Record<string, unknown>>(req);
              const updated = await updateEntry(id, {
                ...(body as any),
                accent: normalizeAccent(body.accent as string | undefined),
              });
              if (!updated) {
                sendJson(res, 404, { error: '照片不存在' });
                return;
              }
              sendJson(res, 200, updated);
              return;
            }

            if (req.method === 'DELETE') {
              const keys = await removeEntry(id);
              await deleteFiles(keys);
              sendJson(res, 200, { ok: true, id, keys });
              return;
            }
          }

          sendJson(res, 404, { error: 'Not found' });
        } catch (error) {
          console.error('[gallery-admin]', error);
          sendJson(res, 500, {
            error:
              error instanceof Error ? error.message : '管理接口请求失败',
          });
        }
      });
    },
  };
}

