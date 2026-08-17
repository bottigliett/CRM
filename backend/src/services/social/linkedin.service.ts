/**
 * LinkedIn API service
 */

const LINKEDIN_API = 'https://api.linkedin.com/v2';
const LINKEDIN_OAUTH = 'https://www.linkedin.com/oauth/v2';
const CLIENT_ID = () => process.env.LINKEDIN_CLIENT_ID || '';
const CLIENT_SECRET = () => process.env.LINKEDIN_CLIENT_SECRET || '';
const REDIRECT_BASE = () => process.env.SOCIAL_OAUTH_REDIRECT_BASE || '';

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  return res.json() as Promise<any>;
}

/** Block fetching internal/private IPs (SSRF guard) */
function assertPublicUrl(url: string): void {
  const parsed = new URL(url);
  const host = parsed.hostname;
  if (
    host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
    host.startsWith('10.') || host.startsWith('192.168.') ||
    host.startsWith('169.254.') || host.startsWith('172.') ||
    host.endsWith('.internal') || host.endsWith('.local') ||
    parsed.protocol === 'file:'
  ) {
    throw new Error('URL non consentito');
  }
}

// === OAuth ===

export function getLinkedInAuthUrl(state: string): string {
  const scopes = 'openid profile email w_member_social r_organization_social rw_organization_admin r_organization_followers';
  const redirectUri = `${REDIRECT_BASE()}/linkedin/callback`;
  return `${LINKEDIN_OAUTH}/authorization?response_type=code&client_id=${CLIENT_ID()}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
}> {
  const redirectUri = `${REDIRECT_BASE()}/linkedin/callback`;
  const data = await fetchJson(`${LINKEDIN_OAUTH}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      redirect_uri: redirectUri,
    }),
  });
  if (data.error) throw new Error(data.error_description || data.error);
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
    refreshTokenExpiresIn: data.refresh_token_expires_in,
  };
}

export async function refreshLinkedInToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}> {
  const data = await fetchJson(`${LINKEDIN_OAUTH}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
    }),
  });
  if (data.error) throw new Error(data.error_description || data.error);
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token || refreshToken,
  };
}

export async function getLinkedInProfile(accessToken: string): Promise<{ id: string; name: string; profilePicUrl?: string }> {
  const data = await fetchJson(`${LINKEDIN_API}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (data.error) throw new Error(data.message || 'Failed to get LinkedIn profile');
  return {
    id: data.sub,
    name: data.name,
    profilePicUrl: data.picture,
  };
}

/**
 * List the organizations (company pages) the authenticated user can manage.
 * Uses the "Look up organizations" endpoint — returns id + localized name.
 */
export async function getLinkedInOrganizations(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const data = await fetchJson(
    `${LINKEDIN_API}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(*,organization~(id,localizedName)))`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (data.status && data.status >= 400) throw new Error(data.message || 'Failed to get LinkedIn organizations');

  const orgs: Array<{ id: string; name: string }> = [];
  for (const el of data.elements || []) {
    const org = el['organization~'] || el.organization;
    if (!org?.id) continue;
    const name = org.localizedName || el.organizationName || `Organizzazione ${org.id}`;
    // Skip duplicates (same org listed via multiple ACLs)
    if (!orgs.some(o => o.id === org.id)) orgs.push({ id: org.id, name });
  }
  return orgs;
}

/** Get the logo/avatar of an organization page. */
export async function getLinkedInOrgLogo(accessToken: string, organizationId: string): Promise<string | undefined> {
  try {
    const data = await fetchJson(
      `${LINKEDIN_API}/organizations/${organizationId}?projection=(logoV2(original~:playableStreams))`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const logo = data?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier;
    return logo || undefined;
  } catch {
    return undefined;
  }
}

// === Publishing ===

export async function publishToLinkedIn(accessToken: string, authorUrn: string, content: string, mediaUrls?: string[]): Promise<{ id: string }> {
  const body: any = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: mediaUrls?.length ? 'IMAGE' : 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  if (mediaUrls?.length) {
    const mediaAssets = await Promise.all(mediaUrls.map(async (url) => {
      const regData = await fetchJson(`${LINKEDIN_API}/assets?action=registerUpload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
          },
        }),
      });
      const uploadUrl = regData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = regData.value.asset;

      assertPublicUrl(url);
      const imgRes = await fetch(url);
      const imgBuffer = await imgRes.arrayBuffer();
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: Buffer.from(imgBuffer),
      });

      return { status: 'READY', media: asset };
    }));

    body.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets.map(a => ({
      status: a.status,
      media: a.media,
    }));
  }

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(err.message || `LinkedIn publish failed: ${res.status}`);
  }

  const postId = res.headers.get('x-restli-id') || '';
  return { id: postId };
}

// === Analytics ===

export async function getLinkedInShareStats(accessToken: string, shareUrn: string): Promise<{
  likes?: number; comments?: number; shares?: number; impressions?: number; clicks?: number;
}> {
  const data = await fetchJson(
    `${LINKEDIN_API}/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodeURIComponent(shareUrn)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (data.status && data.status >= 400) throw new Error(data.message || 'LinkedIn share stats failed');
  const el = data.elements?.[0]?.totalShareStatistics;
  if (!el) return {};
  return {
    likes: el.likeCount,
    comments: el.commentCount,
    shares: el.shareCount,
    impressions: el.impressionCount,
    clicks: el.clickCount,
  };
}

export async function getLinkedInAnalytics(accessToken: string, organizationId: string, startDate: number, endDate: number): Promise<any> {
  const data = await fetchJson(
    `${LINKEDIN_API}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startDate}&timeIntervals.timeRange.end=${endDate}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (data.status && data.status >= 400) throw new Error(data.message || 'LinkedIn analytics failed');
  return data.elements;
}
