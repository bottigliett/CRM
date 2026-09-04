const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Maps a platform to the multer field prefix used for per-platform media overrides
const PLATFORM_FIELD_CODE: Record<string, string> = {
  INSTAGRAM: 'ig',
  FACEBOOK: 'fb',
  LINKEDIN: 'in',
  TIKTOK: 'tt',
};

function appendPlatformMedia(formData: FormData, platformMediaFiles?: Record<string, { file?: File; coverFile?: File }>) {
  if (!platformMediaFiles) return;
  for (const [platform, m] of Object.entries(platformMediaFiles)) {
    const code = PLATFORM_FIELD_CODE[platform];
    if (!code) continue;
    if (m.file) formData.append(`${code}Media`, m.file);
    if (m.coverFile) formData.append(`${code}Cover`, m.coverFile);
  }
}

function getAuthHeader() {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Non autenticato');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request<T = any>(url: string, options?: RequestInit): Promise<{ success: boolean; data: T; message?: string }> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: { ...getAuthHeader(), ...options?.headers },
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Errore API');
  return json;
}

export const socialAPI = {
  // === Dashboard ===
  getDashboard: () => request('/social/dashboard'),

  // === Accounts ===
  getAccounts: (contactId?: number) =>
    request(`/social/accounts${contactId ? `?contactId=${contactId}` : ''}`),

  startOAuth: (platform: string, contactId?: number) =>
    request(`/social/auth/${platform}${contactId ? `?contactId=${contactId}` : ''}`),

  disconnectAccount: (id: number) =>
    request(`/social/accounts/${id}`, { method: 'DELETE' }),

  updateAccountMetadata: (id: number, metadata: Record<string, any>) =>
    request(`/social/accounts/${id}`, { method: 'PATCH', body: JSON.stringify({ metadata }) }),

  moveAccount: (id: number, contactId: number | null) =>
    request(`/social/accounts/${id}/move`, { method: 'POST', body: JSON.stringify({ contactId }) }),

  refreshToken: (id: number) =>
    request(`/social/accounts/${id}/refresh`, { method: 'POST' }),

  // === Posts ===
  getPosts: (params: { contactId?: number; status?: string; stage?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.contactId) qs.set('contactId', String(params.contactId));
    if (params.status) qs.set('status', params.status);
    if (params.stage) qs.set('stage', params.stage);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return request(`/social/posts${q ? `?${q}` : ''}`);
  },

  getPost: (id: number) => request(`/social/posts/${id}`),

  /**
   * Create post — sends FormData (supports inline file upload)
   */
  createPost: async (data: {
    contactId: number;
    content: string;
    platformContent?: Record<string, string>;
    postType?: string;
    targetAccountIds?: number[];
    hashtags?: string[];
    scheduledAt?: string;
    accountSchedules?: Record<string, string>;
    publishNow?: boolean;
    templateId?: number;
    coverImageUrl?: string;
    shareToFeed?: boolean;
    files?: File[];
    coverFile?: File;
    platformMediaFiles?: Record<string, { file?: File; coverFile?: File }>;
    mediaUrls?: string[];
    stage?: string;
    ideaCategory?: string;
    ideaPhase?: string;
    ideaStatus?: string;
    ideaScript?: string;
    ideaCaption?: string;
    ideaObiettivo?: string;
    ideaCreativita?: string;
    ideaNotes?: string;
  }) => {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('contactId', String(data.contactId));
    formData.append('content', data.content);
    if (data.platformContent) formData.append('platformContent', JSON.stringify(data.platformContent));
    if (data.postType) formData.append('postType', data.postType);
    if (data.targetAccountIds?.length) formData.append('targetAccountIds', JSON.stringify(data.targetAccountIds));
    if (data.hashtags?.length) formData.append('hashtags', JSON.stringify(data.hashtags));
    if (data.scheduledAt) formData.append('scheduledAt', data.scheduledAt);
    if (data.accountSchedules) formData.append('accountSchedules', JSON.stringify(data.accountSchedules));
    if (data.publishNow) formData.append('publishNow', 'true');
    if (data.templateId) formData.append('templateId', String(data.templateId));
    if (data.coverImageUrl) formData.append('coverImageUrl', data.coverImageUrl);
    if (data.shareToFeed !== undefined) formData.append('shareToFeed', String(data.shareToFeed));
    if (data.mediaUrls?.length) formData.append('mediaUrls', JSON.stringify(data.mediaUrls));
    if (data.stage) formData.append('stage', data.stage);
    if (data.ideaCategory) formData.append('ideaCategory', data.ideaCategory);
    if (data.ideaPhase) formData.append('ideaPhase', data.ideaPhase);
    if (data.ideaStatus) formData.append('ideaStatus', data.ideaStatus);
    if (data.ideaScript) formData.append('ideaScript', data.ideaScript);
    if (data.ideaCaption) formData.append('ideaCaption', data.ideaCaption);
    if (data.ideaObiettivo) formData.append('ideaObiettivo', data.ideaObiettivo);
    if (data.ideaCreativita) formData.append('ideaCreativita', data.ideaCreativita);
    if (data.ideaNotes) formData.append('ideaNotes', data.ideaNotes);
    data.files?.forEach(f => formData.append('files', f));
    if (data.coverFile) formData.append('coverFile', data.coverFile);
    appendPlatformMedia(formData, data.platformMediaFiles);

    const res = await fetch(`${API_BASE_URL}/social/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Errore creazione post');
    return json;
  },

  /**
   * Update post — sends FormData
   */
  updatePost: async (id: number, data: {
    content?: string;
    platformContent?: Record<string, string>;
    postType?: string;
    targetAccountIds?: number[];
    hashtags?: string[];
    scheduledAt?: string;
    coverImageUrl?: string;
    shareToFeed?: boolean;
    files?: File[];
    mediaUrls?: string[];
    ideaCategory?: string;
    ideaPhase?: string;
    ideaStatus?: string;
    ideaScript?: string;
    ideaCaption?: string;
    ideaObiettivo?: string;
    ideaCreativita?: string;
    ideaNotes?: string;
  }) => {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    if (data.content !== undefined) formData.append('content', data.content);
    if (data.platformContent) formData.append('platformContent', JSON.stringify(data.platformContent));
    if (data.postType) formData.append('postType', data.postType);
    if (data.targetAccountIds) formData.append('targetAccountIds', JSON.stringify(data.targetAccountIds));
    if (data.hashtags) formData.append('hashtags', JSON.stringify(data.hashtags));
    if (data.scheduledAt !== undefined) formData.append('scheduledAt', data.scheduledAt || '');
    if (data.coverImageUrl !== undefined) formData.append('coverImageUrl', data.coverImageUrl || '');
    if (data.shareToFeed !== undefined) formData.append('shareToFeed', String(data.shareToFeed));
    if (data.mediaUrls) formData.append('mediaUrls', JSON.stringify(data.mediaUrls));
    if (data.ideaCategory !== undefined) formData.append('ideaCategory', data.ideaCategory || '');
    if (data.ideaPhase !== undefined) formData.append('ideaPhase', data.ideaPhase || '');
    if (data.ideaStatus !== undefined) formData.append('ideaStatus', data.ideaStatus || '');
    if (data.ideaScript !== undefined) formData.append('ideaScript', data.ideaScript || '');
    if (data.ideaCaption !== undefined) formData.append('ideaCaption', data.ideaCaption || '');
    if (data.ideaObiettivo !== undefined) formData.append('ideaObiettivo', data.ideaObiettivo || '');
    if (data.ideaCreativita !== undefined) formData.append('ideaCreativita', data.ideaCreativita || '');
    if (data.ideaNotes !== undefined) formData.append('ideaNotes', data.ideaNotes || '');
    data.files?.forEach(f => formData.append('files', f));

    const res = await fetch(`${API_BASE_URL}/social/posts/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Errore aggiornamento post');
    return json;
  },

  deletePost: (id: number) =>
    request(`/social/posts/${id}`, { method: 'DELETE' }),

  approvePost: (id: number) =>
    request(`/social/posts/${id}/approve`, { method: 'POST' }),

  schedulePost: (id: number, scheduledAt: string) =>
    request(`/social/posts/${id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt }) }),

  publishNow: (id: number) =>
    request(`/social/posts/${id}/publish`, { method: 'POST' }),

  retryPost: (id: number) =>
    request(`/social/posts/${id}/retry`, { method: 'POST' }),

  duplicatePost: (id: number, targetContactId?: number) =>
    request(`/social/posts/${id}/duplicate`, {
      method: 'POST',
      body: targetContactId ? JSON.stringify({ targetContactId }) : undefined,
    }),

  duplicatePostBulk: (id: number, targetContactIds: number[]) =>
    request(`/social/posts/${id}/duplicate-bulk`, { method: 'POST', body: JSON.stringify({ targetContactIds }) }),

  promoteIdea: async (id: number, data?: {
    content: string;
    hashtags: string[];
    postType: string;
    accountSchedules: Record<string, string>;
    files: File[];
    coverFile?: File;
    shareToFeed?: boolean;
    publishNow?: boolean;
    platformContent?: Record<string, string>;
    platformMediaFiles?: Record<string, { file?: File; coverFile?: File }>;
  }) => {
    if (!data) {
      // Legacy: simple promote without dialog
      return request(`/social/posts/${id}/promote`, { method: 'POST' });
    }
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('content', data.content);
    formData.append('postType', data.postType);
    formData.append('hashtags', JSON.stringify(data.hashtags));
    formData.append('accountSchedules', JSON.stringify(data.accountSchedules));
    if (data.platformContent && Object.keys(data.platformContent).length) formData.append('platformContent', JSON.stringify(data.platformContent));
    if (data.shareToFeed !== undefined) formData.append('shareToFeed', String(data.shareToFeed));
    if (data.publishNow) formData.append('publishNow', 'true');
    data.files.forEach(f => formData.append('files', f));
    if (data.coverFile) formData.append('coverFile', data.coverFile);
    appendPlatformMedia(formData, data.platformMediaFiles);

    const res = await fetch(`${API_BASE_URL}/social/posts/${id}/promote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.message || 'Errore promozione idea');
    return json;
  },

  getPostMetrics: (id: number) =>
    request(`/social/posts/${id}/metrics`),

  // === Calendar ===
  getCalendar: (params: { contactId?: number; startDate: string; endDate: string }) => {
    const qs = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
    if (params.contactId) qs.set('contactId', String(params.contactId));
    return request(`/social/calendar?${qs}`);
  },

  // === Analytics ===
  getAnalyticsOverview: (params: { startDate?: string; endDate?: string; platform?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    if (params.platform) qs.set('platform', params.platform);
    const q = qs.toString();
    return request(`/social/analytics/overview${q ? `?${q}` : ''}`);
  },

  getAnalytics: (contactId: number, params: { startDate?: string; endDate?: string; platform?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    if (params.platform) qs.set('platform', params.platform);
    const q = qs.toString();
    return request(`/social/analytics/${contactId}${q ? `?${q}` : ''}`);
  },

  compareAnalytics: (contactId: number, params: { startDate?: string; endDate?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    const q = qs.toString();
    return request(`/social/analytics/${contactId}/compare${q ? `?${q}` : ''}`);
  },

  getPostAnalytics: (contactId: number, platform?: string) => {
    const qs = platform ? `?platform=${platform}` : '';
    return request(`/social/analytics/${contactId}/posts${qs}`);
  },

  getBenchmark: (contactId: number) =>
    request(`/social/analytics/${contactId}/benchmark`),

  // === AI ===
  getAiStatus: () => request('/social/ai/status'),

  aiGenerateIdeas: (contactId: number, count?: number, answers?: string) =>
    request('/social/ai/generate-ideas', { method: 'POST', body: JSON.stringify({ contactId, count, answers }) }),

  aiClarifyingQuestions: (contactId: number, mode?: 'ideas' | 'calendar' | 'shoot') =>
    request('/social/ai/clarifying-questions', { method: 'POST', body: JSON.stringify({ contactId, mode }) }),

  aiPostGroup: (contactId: number, mode: 'calendar' | 'shoot', answers?: string, count?: number) =>
    request('/social/ai/post-group', { method: 'POST', body: JSON.stringify({ contactId, mode, answers, count }) }),

  aiEnhanceCaption: (caption: string, tone?: string, contactId?: number) =>
    request('/social/ai/enhance', { method: 'POST', body: JSON.stringify({ caption, tone, contactId }) }),

  aiSuggestHashtags: (content: string, contactId?: number) =>
    request('/social/ai/suggest-hashtags', { method: 'POST', body: JSON.stringify({ content, contactId }) }),

  aiCheckDuplicate: (contactId: number, content: string, excludeId?: number) =>
    request('/social/ai/check-duplicate', { method: 'POST', body: JSON.stringify({ contactId, content, excludeId }) }),

  aiGenerateBrief: (contactId: number) =>
    request('/social/ai/generate-brief', { method: 'POST', body: JSON.stringify({ contactId }) }),

  aiGenerateCaption: (topic: string, tone?: string, contactId?: number) =>
    request('/social/ai/generate-caption', { method: 'POST', body: JSON.stringify({ topic, tone, contactId }) }),

  aiInsights: (contactId: number) =>
    request('/social/ai/insights', { method: 'POST', body: JSON.stringify({ contactId }) }),

  aiTranscribe: (postId: number) =>
    request('/social/ai/transcribe', { method: 'POST', body: JSON.stringify({ postId }) }),

  aiRefreshBrief: (contactId: number) =>
    request('/social/ai/refresh-brief', { method: 'POST', body: JSON.stringify({ contactId }) }),

  aiSmartSuggestions: (contactId: number) =>
    request('/social/ai/smart-suggestions', { method: 'POST', body: JSON.stringify({ contactId }) }),

  aiFeedback: (data: { kind: string; rating: 1 | -1; content?: string; contactId?: number; note?: string }) =>
    request('/social/ai/feedback', { method: 'POST', body: JSON.stringify(data) }),

  aiReview: (data: { contactId: number; content: string; caption?: string; instruction?: string }) =>
    request('/social/ai/review', { method: 'POST', body: JSON.stringify(data) }),

  // === Context events ===
  getContextEvents: (contactId?: number) =>
    request(`/social/context-events${contactId ? `?contactId=${contactId}` : ''}`),

  createContextEvent: (data: { title: string; description?: string; category?: string; startDate: string; endDate?: string; contactId?: number | null }) =>
    request('/social/context-events', { method: 'POST', body: JSON.stringify(data) }),

  updateContextEvent: (id: number, data: { title?: string; description?: string; category?: string; startDate?: string; endDate?: string; isActive?: boolean }) =>
    request(`/social/context-events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteContextEvent: (id: number) =>
    request(`/social/context-events/${id}`, { method: 'DELETE' }),

  // === Notion import (read-only on Notion) ===
  notionPreview: () =>
    request('/social/notion/preview', { method: 'POST' }),

  notionImport: () =>
    request('/social/notion/import', { method: 'POST' }),

  getAiSettings: () => request('/social/ai/settings'),

  updateAiSettings: (data: { provider?: string; deepseekApiKey?: string; deepseekBaseUrl?: string; deepseekModel?: string; claudeApiKey?: string; claudeModel?: string }) =>
    request('/social/ai/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // === Templates ===
  getTemplates: (contactId?: number) =>
    request(`/social/templates${contactId ? `?contactId=${contactId}` : ''}`),

  createTemplate: (data: { contactId?: number; name: string; content: string; postType?: string; platforms?: string[] }) =>
    request('/social/templates', { method: 'POST', body: JSON.stringify(data) }),

  updateTemplate: (id: number, data: any) =>
    request(`/social/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTemplate: (id: number) =>
    request(`/social/templates/${id}`, { method: 'DELETE' }),

  // === Reports ===
  getReports: (contactId?: number) =>
    request(`/social/reports${contactId ? `?contactId=${contactId}` : ''}`),

  createReport: (data: { contactId: number; name: string; frequency?: string; recipients: string[]; config?: any }) =>
    request('/social/reports', { method: 'POST', body: JSON.stringify(data) }),

  updateReport: (id: number, data: any) =>
    request(`/social/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteReport: (id: number) =>
    request(`/social/reports/${id}`, { method: 'DELETE' }),

  // === Client Config ===
  registerClient: (contactId: number, folder?: string) =>
    request('/social/clients/register', { method: 'POST', body: JSON.stringify({ contactId, folder }) }),

  getClientConfig: (contactId: number) =>
    request(`/social/clients/${contactId}/config`),

  updateClientConfig: (contactId: number, data: { requireApproval?: boolean; approvalMode?: string; defaultTimezone?: string; cedColumns?: any; folder?: string | null }) =>
    request(`/social/clients/${contactId}/config`, { method: 'PUT', body: JSON.stringify(data) }),

  // === Brief ===
  getBrief: (contactId: number) =>
    request(`/social/clients/${contactId}/brief`),

  updateBrief: (contactId: number, data: { tone?: string; audience?: string; goals?: string; notes?: string; aiInstructions?: string }) =>
    request(`/social/clients/${contactId}/brief`, { method: 'PUT', body: JSON.stringify(data) }),
  // === Portal ===
  getPortalLink: (contactId: number) =>
    request(`/social/clients/${contactId}/portal-link`),

  // === Admin ===
  getAuthOverview: () => request('/social/accounts/auth-overview'),

  // === Browser Automation ===
  browserConnect: (contactId: number, platform: string, accountName?: string) =>
    request(`/social/accounts/browser-connect`, { method: 'POST', body: JSON.stringify({ contactId, platform, accountName }) }),

  browserLogin: (accountId: number) =>
    request(`/social/accounts/${accountId}/browser-login`, { method: 'POST' }),

  browserStatus: (accountId: number) =>
    request<{ active: boolean; hasSavedProfile: boolean }>(`/social/accounts/${accountId}/browser-status`),

  browserDeleteSession: (accountId: number) =>
    request(`/social/accounts/${accountId}/browser-session`, { method: 'DELETE' }),
};
