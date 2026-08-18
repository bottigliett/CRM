/**
 * TikTok Business API service
 */

const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize';
const TIKTOK_API = 'https://open.tiktokapis.com/v2';
const CLIENT_KEY = () => process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = () => process.env.TIKTOK_CLIENT_SECRET || '';
const REDIRECT_BASE = () => process.env.SOCIAL_OAUTH_REDIRECT_BASE || '';

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  return res.json() as Promise<any>;
}

/**
 * TikTok Open API always returns an `error` object in its JSON response, even on
 * success (where `error.code === "ok"`). Only treat it as a real error when the
 * code is present and different from "ok".
 */
function isTikTokError(data: any): boolean {
  return !!(data?.error && data.error.code && data.error.code !== 'ok');
}

// === OAuth ===

export function getTikTokAuthUrl(state: string): string {
  const scopes = 'user.info.basic,video.upload';
  const redirectUri = `${REDIRECT_BASE()}/tiktok/callback`;
  return `${TIKTOK_AUTH}/?client_key=${CLIENT_KEY()}&response_type=code&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

export async function exchangeTikTokCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  openId: string;
}> {
  const redirectUri = `${REDIRECT_BASE()}/tiktok/callback`;
  const data = await fetchJson(`${TIKTOK_API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: CLIENT_KEY(),
      client_secret: CLIENT_SECRET(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  if (data.error) {
    console.error('[tiktok] exchangeTikTokCode error:', JSON.stringify(data));
    throw new Error(data.error_description || data.error || 'TikTok token exchange failed');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    openId: data.open_id,
  };
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const data = await fetchJson(`${TIKTOK_API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: CLIENT_KEY(),
      client_secret: CLIENT_SECRET(),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (data.error) throw new Error(data.error_description || data.error);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

export async function getTikTokProfile(accessToken: string): Promise<{ id: string; name: string; profilePicUrl?: string }> {
  const data = await fetchJson(`${TIKTOK_API}/user/info/?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (isTikTokError(data)) {
    console.error('[tiktok] getTikTokProfile error:', JSON.stringify(data));
    const msg = data.error.message || data.error.description || data.error.code || JSON.stringify(data.error);
    throw new Error(msg || 'Failed to get TikTok profile');
  }
  const user = data.data?.user;
  if (!user?.open_id) {
    console.error('[tiktok] getTikTokProfile: unexpected response', JSON.stringify(data));
    throw new Error('TikTok profile response missing user info');
  }
  return {
    id: user.open_id,
    name: user.display_name || '',
    profilePicUrl: user.avatar_url,
  };
}

// === Publishing ===

const TIKTOK_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk (API max)

/**
 * Upload a video to TikTok as a DRAFT (video.upload scope, FILE_UPLOAD source).
 * Flow: init → upload chunks → (optional) status check.
 * The creator reviews and publishes the draft manually from the TikTok app.
 */
export async function publishToTikTok(accessToken: string, videoBuffer: Buffer, caption: string): Promise<{ id: string }> {
  const size = videoBuffer.length;
  const chunkCount = Math.ceil(size / TIKTOK_CHUNK_SIZE);

  // 1) Init the upload
  const init = await fetchJson(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        // Sandbox requires SELF_ONLY; production → PUBLIC_TO_EVERYONE
        privacy_level: 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: TIKTOK_CHUNK_SIZE,
        total_chunk_count: chunkCount,
      },
    }),
  });
  if (isTikTokError(init)) throw new Error(init.error.message || 'TikTok init failed');
  const publishId = init.data?.publish_id;
  if (!publishId) throw new Error('TikTok init missing publish_id');

  // 2) Upload chunks
  for (let i = 0; i < chunkCount; i++) {
    const start = i * TIKTOK_CHUNK_SIZE;
    const end = Math.min(start + TIKTOK_CHUNK_SIZE, size) - 1;
    const chunk = videoBuffer.subarray(start, end + 1);

    const up = await fetch(`${TIKTOK_API}/post/publish/video/upload/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${end}/${size}`,
      },
      body: new Uint8Array(chunk),
    });
    const upJson: any = await up.json().catch(() => ({}));
    if (!up.ok || isTikTokError(upJson)) {
      throw new Error(upJson.error?.message || `TikTok chunk upload failed (${up.status})`);
    }
  }

  // 3) Poll status until the draft is ready (or failed)
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const st = await fetchJson(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (isTikTokError(st)) throw new Error(st.error.message || 'TikTok status fetch failed');
    const status = st.data?.status;
    if (status === 'SEND_TO_USER_DRAFT' || status === 'PUBLISH_COMPLETE') {
      return { id: publishId };
    }
    if (status === 'FAILED') {
      throw new Error(st.data?.fail_reason || 'TikTok upload failed');
    }
  }

  // Return the publish id even if still processing — the draft will appear shortly
  return { id: publishId };
}

// === Analytics ===

export async function getTikTokVideoStats(accessToken: string, videoId: string): Promise<{
  likes?: number; comments?: number; shares?: number; views?: number;
}> {
  const data = await fetchJson(`${TIKTOK_API}/video/query/?fields=like_count,comment_count,share_count,view_count`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
  });
  if (isTikTokError(data)) throw new Error(data.error.message || 'TikTok video stats failed');
  const v = data.data?.videos?.[0];
  if (!v) return {};
  return {
    likes: v.like_count,
    comments: v.comment_count,
    shares: v.share_count,
    views: v.view_count,
  };
}

export async function getTikTokVideoList(accessToken: string): Promise<any[]> {
  const data = await fetchJson(`${TIKTOK_API}/video/list/?fields=id,title,like_count,comment_count,share_count,view_count,create_time`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ max_count: 20 }),
  });
  if (isTikTokError(data)) throw new Error(data.error.message || 'TikTok video list failed');
  return data.data?.videos || [];
}
