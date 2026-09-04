/**
 * Meta Graph API service for Instagram + Facebook
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const META_APP_ID = () => process.env.META_APP_ID || '';
const META_APP_SECRET = () => process.env.META_APP_SECRET || '';
const REDIRECT_BASE = () => process.env.SOCIAL_OAUTH_REDIRECT_BASE || '';

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  return res.json() as Promise<any>;
}

/** Authed fetch — sends token via Authorization header, never in URL */
async function fetchAuthed(url: string, token: string, init?: RequestInit): Promise<any> {
  const headers = { ...((init?.headers as Record<string, string>) || {}), Authorization: `Bearer ${token}` };
  return fetchJson(url, { ...init, headers });
}

// === OAuth ===

export function getMetaAuthUrl(platform: 'INSTAGRAM' | 'FACEBOOK', state: string): string {
  const scopes = platform === 'INSTAGRAM'
    ? 'instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management'
    : 'pages_show_list,pages_read_engagement,pages_manage_posts,read_insights,business_management';

  const redirectUri = `${REDIRECT_BASE()}/${platform.toLowerCase()}/callback`;

  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID()}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
}

// ponytail: OAuth token exchange endpoints require credentials as query params per Meta spec — not a leak
export async function exchangeMetaCode(code: string, platform: 'INSTAGRAM' | 'FACEBOOK'): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const redirectUri = `${REDIRECT_BASE()}/${platform.toLowerCase()}/callback`;

  const data = await fetchJson(`${GRAPH_API_BASE}/oauth/access_token?client_id=${META_APP_ID()}&client_secret=${META_APP_SECRET()}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
  if (data.error) throw new Error(data.error.message);

  // Exchange for long-lived token
  const longData = await fetchJson(`${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID()}&client_secret=${META_APP_SECRET()}&fb_exchange_token=${data.access_token}`);
  if (longData.error) throw new Error(longData.error.message);

  return {
    accessToken: longData.access_token,
    expiresIn: longData.expires_in || 5184000,
  };
}

export async function getMetaPages(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  accessToken: string;
  instagramAccountId?: string;
}>> {
  const data = await fetchAuthed(`${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&limit=200`, accessToken);
  if (data.error) throw new Error(data.error.message);

  const pages = new Map<string, { id: string; name: string; accessToken: string; instagramAccountId?: string }>();
  const addPage = (page: any) => {
    if (!page?.id) return;
    if (!pages.has(page.id)) {
      pages.set(page.id, {
        id: page.id,
        name: page.name || page.id,
        accessToken: page.access_token,
        instagramAccountId: page.instagram_business_account?.id,
      });
    }
  };

  (data.data || []).forEach(addPage);

  // Business Manager: fetch pages owned/client by the businesses the user manages.
  // /me/accounts only returns pages where the user is a DIRECT admin; pages managed
  // through a Business Manager are exposed via /me/businesses.
  try {
    const businesses = await fetchAuthed(`${GRAPH_API_BASE}/me/businesses?fields=id,name&limit=200`, accessToken);
    for (const b of businesses.data || []) {
      for (const rel of ['owned_pages', 'client_pages']) {
        try {
          const bp = await fetchAuthed(`${GRAPH_API_BASE}/${b.id}/${rel}?fields=id,name,access_token,instagram_business_account&limit=200`, accessToken);
          (bp.data || []).forEach(addPage);
        } catch { /* best effort per relation */ }
      }
    }
  } catch { /* business_management may not be granted; keep direct pages */ }

  return [...pages.values()];
}

/** Fetch username + profile picture for an Instagram business account. */
export async function getMetaInstagramProfile(id: string, token: string): Promise<{ username?: string; profilePicUrl?: string }> {
  try {
    const data = await fetchAuthed(`${GRAPH_API_BASE}/${id}?fields=username,profile_picture_url`, token);
    return { username: data?.username || undefined, profilePicUrl: data?.profile_picture_url || undefined };
  } catch {
    return {};
  }
}

/** Fetch the profile picture URL for a Facebook page or Instagram business account. */
export async function getMetaProfilePic(platform: 'INSTAGRAM' | 'FACEBOOK', id: string, token: string): Promise<string | undefined> {
  try {
    if (platform === 'FACEBOOK') {
      const data = await fetchAuthed(`${GRAPH_API_BASE}/${id}/picture?redirect=false&type=large`, token);
      return data?.data?.url || undefined;
    }
    const data = await fetchAuthed(`${GRAPH_API_BASE}/${id}?fields=profile_picture_url`, token);
    return data?.profile_picture_url || undefined;
  } catch {
    return undefined;
  }
}

export async function refreshMetaToken(accessToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  // ponytail: token exchange requires fb_exchange_token as query param per Meta spec
  const data = await fetchJson(`${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID()}&client_secret=${META_APP_SECRET()}&fb_exchange_token=${accessToken}`);
  if (data.error) throw new Error(data.error.message);
  return { accessToken: data.access_token, expiresIn: data.expires_in || 5184000 };
}

// === Publishing ===

export async function publishToFacebook(pageAccessToken: string, pageId: string, content: string, mediaUrls?: string[]): Promise<{ id: string }> {
  if (mediaUrls && mediaUrls.length > 0) {
    if (mediaUrls.length === 1) {
      // Video (REEL) → publish via /videos; photo → /photos
      const url = mediaUrls[0];
      const isVideo = /\.(mp4|mov|webm)$/i.test(url);
      if (isVideo) {
        const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}/videos`, pageAccessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: url, description: content }),
        });
        if (data.error) throw new Error(data.error.message);
        return { id: data.id };
      }
      const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}/photos`, pageAccessToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, message: content }),
      });
      if (data.error) throw new Error(data.error.message);
      return { id: data.post_id || data.id };
    }

    const photoIds = await Promise.all(mediaUrls.map(async (url) => {
      const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}/photos`, pageAccessToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, published: false }),
      });
      if (data.error) throw new Error(data.error.message);
      return data.id;
    }));

    // attached_media must be sent form-encoded (not JSON), otherwise Facebook
    // silently ignores it and publishes a text-only post.
    const form = new URLSearchParams({ message: content });
    photoIds.forEach((id: string, i: number) => {
      form.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
    });

    const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}/feed`, pageAccessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (data.error) throw new Error(data.error.message);
    return { id: data.id };
  }

  const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}/feed`, pageAccessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: content }),
  });
  if (data.error) throw new Error(data.error.message);
  return { id: data.id };
}

export async function publishToInstagram(accessToken: string, igAccountId: string, content: string, mediaUrls: string[], postType: string = 'POST'): Promise<{ id: string }> {
  if (!mediaUrls.length) throw new Error('Instagram requires at least one media');

  if (postType === 'CAROUSEL' && mediaUrls.length > 1) {
    const itemIds = await Promise.all(mediaUrls.map(async (url) => {
      const isVideo = /\.(mp4|mov)$/i.test(url);
      const data = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}/media`, accessToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isVideo ? 'video_url' : 'image_url']: url,
          is_carousel_item: true,
        }),
      });
      if (data.error) throw new Error(data.error.message);
      return data.id;
    }));

    // Instagram needs time to process each carousel item container before the
    // CAROUSEL container can reference them, otherwise it returns "Media ID is not
    // available". Poll each item until it is FINISHED (with a safety timeout).
    for (const itemId of itemIds) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const st = await fetchAuthed(`${GRAPH_API_BASE}/${itemId}?fields=status_code`, accessToken);
        if (st?.status_code === 'FINISHED') break;
        if (st?.error) throw new Error(st.error.message || 'Instagram item status failed');
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const container = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}/media`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: itemIds.join(','),
        caption: content,
      }),
    });
    if (container.error) throw new Error(container.error.message);

    // The CAROUSEL container itself must also reach FINISHED before media_publish,
    // otherwise Instagram returns "Media ID is not available".
    for (let attempt = 0; attempt < 10; attempt++) {
      const st = await fetchAuthed(`${GRAPH_API_BASE}/${container.id}?fields=status_code`, accessToken);
      if (st?.status_code === 'FINISHED') break;
      if (st?.error) throw new Error(st.error.message || 'Instagram container status failed');
      await new Promise(r => setTimeout(r, 1500));
    }

    const pub = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id }),
    });
    if (pub.error) throw new Error(pub.error.message);
    return { id: pub.id };
  }

  // Single media
  const url = mediaUrls[0];
  const isVideo = /\.(mp4|mov)$/i.test(url);
  const mediaType = postType === 'REEL' ? 'REELS' : postType === 'STORY' ? 'STORIES' : undefined;

  const container = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}/media`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      [isVideo ? 'video_url' : 'image_url']: url,
      caption: content,
      ...(mediaType && { media_type: mediaType }),
    }),
  });
  if (container.error) throw new Error(container.error.message);

  const pub = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id }),
  });
  if (pub.error) throw new Error(pub.error.message);
  return { id: pub.id };
}

// === Analytics ===

export async function getInstagramInsights(accessToken: string, igAccountId: string, since: number, until: number): Promise<any> {
  const metrics = 'impressions,reach,follower_count,profile_views';
  const data = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}`, accessToken);
  if (data.error) throw new Error(data.error.message);
  return data.data;
}

export async function getFacebookPageInsights(pageAccessToken: string, pageId: string, since: number, until: number): Promise<any> {
  // v21: page_impressions/page_engaged_users/page_fans are no longer valid metrics.
  // page_post_engagements (engagement) and page_views_total (profile views) still work;
  // followers come from the `fan_count` field, fetched separately.
  const metrics = 'page_post_engagements,page_views_total';
  const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}`, pageAccessToken);
  if (data.error) throw new Error(data.error.message);
  return data.data;
}

export async function getFacebookFollowerCount(pageAccessToken: string, pageId: string): Promise<number | null> {
  const data = await fetchAuthed(`${GRAPH_API_BASE}/${pageId}?fields=fan_count`, pageAccessToken);
  if (data.error) throw new Error(data.error.message);
  return data.fan_count ?? null;
}

// === Post-level Insights ===

export async function getInstagramMediaInsights(accessToken: string, mediaId: string): Promise<{
  impressions?: number; reach?: number; likes?: number; comments?: number; saves?: number; shares?: number;
}> {
  const metrics = 'impressions,reach,likes,comments,saved,shares';
  const data = await fetchAuthed(`${GRAPH_API_BASE}/${mediaId}/insights?metric=${metrics}`, accessToken);
  if (data.error) throw new Error(data.error.message);
  const result: any = {};
  for (const m of data.data || []) {
    const v = m.values?.[0]?.value ?? null;
    switch (m.name) {
      case 'impressions': result.impressions = v; break;
      case 'reach': result.reach = v; break;
      case 'likes': result.likes = v; break;
      case 'comments': result.comments = v; break;
      case 'saved': result.saves = v; break;
      case 'shares': result.shares = v; break;
    }
  }
  return result;
}

export async function getFacebookPostInsights(accessToken: string, postId: string): Promise<{
  impressions?: number; reach?: number; likes?: number; comments?: number; shares?: number; videoViews?: number;
}> {
  // v21: post_impressions / post_impressions_unique / post_engaged_users are no
  // longer valid post-level metrics. Use post_reactions_like_total (likes),
  // post_video_views (reels) and post_activity_by_action_type (comment/share actions).
  const metrics = 'post_reactions_like_total,post_video_views,post_activity_by_action_type';
  const data = await fetchAuthed(`${GRAPH_API_BASE}/${postId}/insights?metric=${metrics}`, accessToken);
  if (data.error) throw new Error(data.error.message);
  const result: any = {};
  for (const m of data.data || []) {
    const v = m.values?.[0]?.value;
    switch (m.name) {
      case 'post_reactions_like_total': result.likes = v ?? 0; break;
      case 'post_video_views': result.videoViews = v ?? 0; break;
      case 'post_activity_by_action_type':
        if (v && typeof v === 'object') {
          result.comments = v.comment ?? v.comments ?? 0;
          result.shares = v.share ?? v.shares ?? 0;
        }
        break;
    }
  }
  return result;
}

export async function getInstagramFollowerCount(accessToken: string, igAccountId: string): Promise<number | null> {
  const data = await fetchAuthed(`${GRAPH_API_BASE}/${igAccountId}?fields=followers_count`, accessToken);
  if (data.error) throw new Error(data.error.message);
  return data.followers_count ?? null;
}
