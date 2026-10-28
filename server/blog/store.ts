import crypto from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import type { BlogPost } from '../../src/types/blog';
import { createR2Client } from '../gallery/config';
import { isValidPostId, parsePostFile } from './post-file';

const MANIFEST_CACHE = 'no-cache';

function blogPrefix() {
  return (process.env.R2_BLOG_PREFIX || 'blog')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function postKey(id: string) {
  return `${blogPrefix()}/${id}/post.md`;
}

function manifestKey() {
  return `${blogPrefix()}/posts.json`;
}

async function withClient<T>(run: (client: ReturnType<typeof createR2Client>) => Promise<T>) {
  const client = createR2Client();
  try {
    return await run(client);
  } finally {
    client.destroy();
  }
}

async function readText(key: string): Promise<string> {
  return withClient(async (client) => {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
      })
    );
    const body = await response.Body?.transformToString('utf-8');
    if (body === undefined) throw new Error(`Empty R2 object: ${key}`);
    return body;
  });
}

async function putText(key: string, text: string, contentType: string) {
  await withClient(async (client) => {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: Buffer.from(text, 'utf8'),
        ContentType: contentType,
        CacheControl: MANIFEST_CACHE,
        Metadata: {
          sha256: crypto.createHash('sha256').update(text).digest('hex'),
        },
      })
    );
  });
}

async function listKeys(prefix: string): Promise<string[]> {
  return withClient(async (client) => {
    const keys: string[] = [];
    let token: string | undefined;

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET!,
          Prefix: prefix,
          ContinuationToken: token,
        })
      );
      for (const item of response.Contents ?? []) {
        if (item.Key) keys.push(item.Key);
      }
      token = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (token);

    return keys;
  });
}

async function deleteKeys(keys: string[]) {
  if (keys.length === 0) return;
  await withClient(async (client) => {
    for (const key of keys) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: key,
        })
      );
    }
  });
}

export async function rebuildBlogManifest(): Promise<BlogPost[]> {
  const prefix = blogPrefix();
  const keys = await listKeys(`${prefix}/`);
  const postKeys = keys.filter((key) => key.endsWith('/post.md'));

  const posts = await Promise.all(
    postKeys.map(async (key) => {
      const folder = key.slice(prefix.length + 1).split('/')[0];
      const raw = await readText(key);
      return parsePostFile(raw, folder, folder);
    })
  );

  posts.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
  });

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    posts: posts.filter((post) => post.isPublic !== false),
  };

  await putText(
    manifestKey(),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'application/json; charset=utf-8'
  );

  return posts;
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  try {
    const raw = await readText(manifestKey());
    const data = JSON.parse(raw) as { posts?: BlogPost[] };
    if (Array.isArray(data.posts)) return data.posts;
  } catch {
    // Rebuild when the manifest is missing or cannot be parsed.
  }
  return rebuildBlogManifest();
}

export async function getBlogPostRaw(id: string): Promise<string> {
  if (!isValidPostId(id)) throw new Error('文章 ID 不合法');
  return readText(postKey(id));
}

export async function saveBlogPost(
  id: string,
  markdown: string
): Promise<BlogPost[]> {
  if (!isValidPostId(id)) throw new Error('文章 ID 不合法');
  const parsed = parsePostFile(markdown, id, id);
  if (parsed.id !== id) {
    throw new Error(
      `frontmatter 里的 id "${parsed.id}" 与目录 "${id}" 不一致`
    );
  }

  await putText(postKey(id), markdown.trim() + '\n', 'text/markdown; charset=utf-8');
  return rebuildBlogManifest();
}

export async function setBlogPostVisibility(
  id: string,
  isPublic: boolean
): Promise<BlogPost[]> {
  if (!isValidPostId(id)) throw new Error('Invalid post id');
  const raw = await readText(postKey(id));
  const end = raw.indexOf('\n---', 3);
  if (end === -1) throw new Error('Missing frontmatter');

  const head = raw.slice(0, end);
  const tail = raw.slice(end);
  const nextHead = /^public:\s*.*$/m.test(head)
    ? head.replace(/^public:\s*.*$/m, `public: ${isPublic}`)
    : `${head}\npublic: ${isPublic}`;

  await putText(
    postKey(id),
    `${nextHead}${tail}`.trim() + '\n',
    'text/markdown; charset=utf-8'
  );
  return rebuildBlogManifest();
}

export async function deleteBlogPost(
  id: string,
  deleteImages: boolean
): Promise<BlogPost[]> {
  if (!isValidPostId(id)) throw new Error('文章 ID 不合法');
  const prefix = `${blogPrefix()}/${id}/`;
  const keys = await listKeys(prefix);
  const targets = deleteImages
    ? keys
    : keys.filter((key) => key.endsWith('/post.md'));
  await deleteKeys(targets);
  return rebuildBlogManifest();
}
