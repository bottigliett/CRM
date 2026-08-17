import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

// Local fallback: when R2 is not configured, store media on the local disk
// under backend/uploads/social and serve it via /uploads/social (static).
const isR2Configured = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
const BUCKET = process.env.R2_BUCKET_NAME || 'crm-social-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const LOCAL_PORT = process.env.PORT || '3001';
const SOCIAL_UPLOADS_DIR = path.join(__dirname, '../../../uploads/social');
const LOCAL_URL_BASE = `http://localhost:${LOCAL_PORT}/uploads/social`;

const s3 = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

function generateKey(contactId: number, originalName: string, folder?: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(8).toString('hex');
  const prefix = folder ? `${contactId}/${folder}` : `${contactId}`;
  return `${prefix}/${Date.now()}-${hash}${ext}`;
}

function localPathFor(key: string): string {
  return path.join(SOCIAL_UPLOADS_DIR, key);
}

export async function uploadToR2(
  buffer: Buffer,
  contactId: number,
  originalName: string,
  mimeType: string,
  folder?: string
): Promise<{ key: string; url: string }> {
  const key = generateKey(contactId, originalName, folder);

  if (!isR2Configured) {
    const fullPath = localPathFor(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { key, url: `${LOCAL_URL_BASE}/${key}` };
  }

  await s3!.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const url = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;
  return { key, url };
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!isR2Configured) {
    await fs.unlink(localPathFor(key)).catch(() => {});
    return;
  }
  await s3!.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

export async function getSignedR2Url(key: string, expiresIn = 3600): Promise<string> {
  if (!isR2Configured) return `${LOCAL_URL_BASE}/${key}`;
  if (PUBLIC_URL) return `${PUBLIC_URL}/${key}`;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3!, command, { expiresIn });
}

/** Download an R2 object (or local file) to a Buffer. Works with keys and full URLs. */
export async function downloadFromR2(keyOrUrl: string): Promise<Buffer> {
  // Local fallback path (either a local URL or a bare key when R2 is off)
  if (!isR2Configured || keyOrUrl.startsWith(LOCAL_URL_BASE) || keyOrUrl.startsWith('http://localhost')) {
    const rel = keyOrUrl.startsWith(LOCAL_URL_BASE)
      ? keyOrUrl.slice(LOCAL_URL_BASE.length + 1)
      : keyOrUrl;
    return await fs.readFile(localPathFor(rel));
  }

  const key = PUBLIC_URL && keyOrUrl.startsWith(PUBLIC_URL)
    ? keyOrUrl.slice(PUBLIC_URL.length + 1)
    : keyOrUrl;
  const res = await s3!.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
