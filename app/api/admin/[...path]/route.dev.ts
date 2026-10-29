import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminConfig,
  getAdminToken,
  saveAdminConfig,
  testStorage,
  type AdminConfigInput,
} from '../../../../server/gallery/config';
import {
  listLibrary,
  removeEntry,
  saveUploadedPhoto,
  updateEntry,
} from '../../../../server/gallery/data';
import {
  processUpload,
  type UploadFields,
} from '../../../../server/gallery/processing';
import {
  deleteFiles,
  saveFiles,
} from '../../../../server/gallery/storage';
import { saveBlogImage } from '../../../../server/blog/image-store';
import {
  deleteBlogPost,
  getBlogPostRaw,
  rebuildBlogManifest,
  saveBlogPost,
  setBlogPostVisibility,
} from '../../../../server/blog/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function readJson<T>(request: NextRequest): Promise<T> {
  return (await request.json()) as T;
}

function authorized(request: NextRequest) {
  const token = getAdminToken();
  if (!token) return true;
  return request.headers.get('x-admin-token') === token;
}

async function proxyFriendsAdmin(
  request: NextRequest,
  path: string
): Promise<NextResponse> {
  const token = process.env.FRIENDS_ADMIN_TOKEN?.trim();
  if (!token) {
    return json(
      {
        error:
          '未配置 FRIENDS_ADMIN_TOKEN，无法访问友链审核接口',
      },
      503
    );
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_STATS_API_URL || 'https://stats.cwa1e.top'
  ).replace(/\/+$/, '');
  const target = path.replace(/^friends\/admin/, 'friends/admin');
  const body =
    request.method === 'GET' || request.method === 'DELETE'
      ? undefined
      : await request.text();

  const response = await fetch(`${baseUrl}/${target}`, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return json(data, response.status);
}

async function handle(
  request: NextRequest,
  segments: string[]
): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return json({ error: 'Not found' }, 404);
  }
  if (!authorized(request)) {
    return json({ error: '需要管理令牌', needsToken: true }, 401);
  }

  const path = segments.join('/');
  const method = request.method;

  if (method === 'GET' && path === 'config') {
    return json(await getAdminConfig(5173));
  }

  if (method === 'PUT' && path === 'config') {
    const body = await readJson<AdminConfigInput>(request);
    const storage = await saveAdminConfig(body);
    return json({
      ok: true,
      storage,
      config: await getAdminConfig(5173),
    });
  }

  if (method === 'POST' && path === 'config/test') {
    const body = await readJson<AdminConfigInput & { origin?: string }>(
      request
    );
    return json(await testStorage(body.origin));
  }

  if (path === 'friends/admin' && method === 'GET') {
    return proxyFriendsAdmin(request, path);
  }

  const friendAdminMatch = /^friends\/admin\/(\d+)$/.exec(path);
  if (friendAdminMatch && (method === 'PATCH' || method === 'DELETE')) {
    return proxyFriendsAdmin(request, path);
  }

  if (method === 'GET' && path === 'library') {
    return json({
      items: await listLibrary(),
      config: await getAdminConfig(5173),
    });
  }

  if (method === 'POST' && path === 'upload') {
    const formData = await request.formData();
    const photo = formData.get('photo');
    if (!(photo instanceof File)) {
      return json({ error: '请选择要上传的照片' }, 400);
    }
    const video = formData.get('video');
    const fields: UploadFields = {};
    for (const key of [
      'title',
      'description',
      'category',
      'area',
      'place',
      'tags',
      'date',
      'locationVisible',
    ]) {
      const value = formData.get(key);
      if (typeof value === 'string' && value.trim()) {
        fields[key as keyof UploadFields] = value.trim();
      }
    }

    const videoFile = video instanceof File ? video : undefined;
    const processed = await processUpload(
      Buffer.from(await photo.arrayBuffer()),
      photo.name,
      fields,
      videoFile
        ? {
            buffer: Buffer.from(await videoFile.arrayBuffer()),
            fileName: videoFile.name,
          }
        : undefined
    );
    const assets = await saveFiles(processed.files, processed.assets);
    try {
      return json(
        await saveUploadedPhoto({
          id: processed.id,
          entry: processed.entry,
          meta: processed.meta,
          assets,
          placeholder: processed.placeholder,
        })
      );
    } catch (error) {
      await deleteFiles(
        Object.values(assets)
          .map((asset) => asset?.key)
          .filter((key): key is string => Boolean(key))
      );
      throw error;
    }
  }

  const libraryMatch = /^library\/([^/]+)$/.exec(path);
  if (libraryMatch) {
    const id = decodeURIComponent(libraryMatch[1]);
    if (method === 'PUT') {
      const body = await readJson<Record<string, unknown>>(request);
      const updated = await updateEntry(id, body as never);
      if (!updated) return json({ error: '照片不存在' }, 404);
      return json(updated);
    }
    if (method === 'DELETE') {
      const keys = await removeEntry(id);
      await deleteFiles(keys);
      return json({ ok: true, id, keys });
    }
  }

  if (method === 'GET' && path === 'posts') {
    return json({ items: await rebuildBlogManifest() });
  }

  if (method === 'POST' && path === 'posts/rebuild') {
    return json({ ok: true, items: await rebuildBlogManifest() });
  }

  const imageMatch = /^posts\/([^/]+)\/images$/.exec(path);
  if (imageMatch && method === 'POST') {
    const id = decodeURIComponent(imageMatch[1]);
    const formData = await request.formData();
    const image = formData.get('image');
    if (!(image instanceof File)) {
      return json({ error: '请选择要上传的图片' }, 400);
    }
    return json(
      await saveBlogImage(
        id,
        Buffer.from(await image.arrayBuffer()),
        image.name
      )
    );
  }

  const visibilityMatch = /^posts\/([^/]+)\/visibility$/.exec(path);
  if (visibilityMatch && method === 'PATCH') {
    const id = decodeURIComponent(visibilityMatch[1]);
    const body = await readJson<{ isPublic?: boolean }>(request);
    if (typeof body.isPublic !== 'boolean') {
      return json({ error: 'Missing isPublic' }, 400);
    }
    return json({
      ok: true,
      items: await setBlogPostVisibility(id, body.isPublic),
    });
  }

  const postMatch = /^posts\/([^/]+)$/.exec(path);
  if (postMatch) {
    const id = decodeURIComponent(postMatch[1]);
    if (method === 'GET') {
      return json({ id, markdown: await getBlogPostRaw(id) });
    }
    if (method === 'PUT') {
      const body = await readJson<{ markdown?: string }>(request);
      if (typeof body.markdown !== 'string') {
        return json({ error: '缺少 markdown 内容' }, 400);
      }
      return json({ ok: true, items: await saveBlogPost(id, body.markdown) });
    }
    if (method === 'DELETE') {
      return json({
        ok: true,
        items: await deleteBlogPost(
          id,
          request.nextUrl.searchParams.get('deleteImages') === '1'
        ),
      });
    }
  }

  return json({ error: 'Not found' }, 404);
}

async function route(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    return await handle(request, params.path ?? []);
  } catch (error) {
    console.error('[admin]', error);
    return json(
      {
        error:
          error instanceof Error ? error.message : '后台接口处理失败',
      },
      500
    );
  }
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;
export const PATCH = route;
