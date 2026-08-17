import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { startOAuth, handleOAuthCallback, metaDataDeletion } from '../controllers/social-auth.controller';
import { getAccounts, disconnectAccount, refreshAccountToken, updateAccount, moveAccount } from '../controllers/social-account.controller';
import { getPosts, getPostById, createPost, updatePost, deletePost, approvePost, schedulePost, publishNow, duplicatePost, duplicatePostBulk, promoteIdea, getPostMetrics } from '../controllers/social-post.controller';
import { getAnalytics, getAnalyticsOverview, compareAnalytics, getPostAnalytics, getBenchmark } from '../controllers/social-analytics.controller';
import { aiStatus, aiGenerateIdeas, aiEnhanceCaption, aiSuggestHashtags, aiCheckDuplicate, aiGenerateBrief, aiGenerateCaption, aiInsights, aiTranscribe, aiRefreshBrief, aiSmartSuggestions, aiFeedback, aiGetSettings, aiUpdateSettings, aiReview, aiClarifyingQuestions, aiPostGroup } from '../controllers/social-ai.controller';
import { getCalendar } from '../controllers/social-calendar.controller';
import { getReports, createReport, updateReport, deleteReport, getDashboard, registerSocialClient, getClientConfig, updateClientConfig, getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/social-report.controller';
import { getBrief, updateBrief } from '../controllers/social-brief.controller';
import { getContextEvents, createContextEvent, updateContextEvent, deleteContextEvent } from '../controllers/social-context.controller';
import { notionPreview, notionImport } from '../controllers/social-notion.controller';
import { aiLimiter, aiHeavyLimiter } from '../middleware/security';
import { getPortalPosts, portalApprovePost, portalRejectPost, generatePortalLink } from '../controllers/social-portal.controller';
import { browserConnect, browserLogin, browserStatus, browserDeleteSession, authOverview } from '../controllers/social-browser.controller';

const router = express.Router();

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf', // LinkedIn document posts
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});
// Media + optional cover (reel) — fields keeps coverFile out of mediaUrls
// Per-platform overrides allow a different video/cover per social (e.g. IG vs FB reel)
const uploadPostMedia = upload.fields([
  { name: 'files', maxCount: 20 },
  { name: 'coverFile', maxCount: 1 },
  { name: 'igMedia', maxCount: 1 },
  { name: 'igCover', maxCount: 1 },
  { name: 'fbMedia', maxCount: 1 },
  { name: 'fbCover', maxCount: 1 },
  { name: 'inMedia', maxCount: 1 },
  { name: 'inCover', maxCount: 1 },
  { name: 'ttMedia', maxCount: 1 },
  { name: 'ttCover', maxCount: 1 },
]);

// OAuth routes — callback is public (redirect from platform)
router.get('/auth/:platform', authenticate, startOAuth);
router.get('/auth/:platform/callback', handleOAuthCallback);
router.post('/auth/meta/data-deletion', metaDataDeletion);

// Client portal — public, auth via signed token
router.get('/client-portal/posts', getPortalPosts);
router.post('/client-portal/posts/:id/approve', portalApprovePost);
router.post('/client-portal/posts/:id/reject', portalRejectPost);

// All other routes require authentication
router.use(authenticate);

// Duplicate check runs live while typing (cheap local text similarity; the AI
// suggestion is optional), so it must NOT be throttled by the heavy AI limiter.
router.post('/ai/check-duplicate', aiCheckDuplicate);

// AI — rate limited to protect against infinite token burn
router.use('/ai', aiLimiter);

// Heavy AI generation calls get a tighter limit
router.post('/ai/generate-ideas', aiHeavyLimiter, aiGenerateIdeas);
router.post('/ai/enhance', aiEnhanceCaption);
router.post('/ai/suggest-hashtags', aiSuggestHashtags);
router.post('/ai/generate-brief', aiGenerateBrief);
router.post('/ai/generate-caption', aiGenerateCaption);
router.post('/ai/insights', aiInsights);
router.post('/ai/transcribe', aiTranscribe);
router.post('/ai/refresh-brief', aiRefreshBrief);
router.post('/ai/smart-suggestions', aiSmartSuggestions);
router.post('/ai/feedback', aiFeedback);
router.post('/ai/review', aiHeavyLimiter, aiReview);
router.post('/ai/clarifying-questions', aiHeavyLimiter, aiClarifyingQuestions);
router.post('/ai/post-group', aiHeavyLimiter, aiPostGroup);
router.get('/ai/status', aiStatus);
router.get('/ai/settings', aiGetSettings);
router.put('/ai/settings', aiUpdateSettings);

// Dashboard
router.get('/dashboard', getDashboard);

// Accounts
router.get('/accounts', getAccounts);
router.delete('/accounts/:id', disconnectAccount);
router.patch('/accounts/:id', updateAccount);
router.post('/accounts/:id/move', moveAccount);
router.post('/accounts/:id/refresh', refreshAccountToken);

// Browser automation (overview, connect, login, status, cleanup)
router.get('/accounts/auth-overview', authOverview);
router.post('/accounts/browser-connect', browserConnect);
router.post('/accounts/:id/browser-login', browserLogin);
router.get('/accounts/:id/browser-status', browserStatus);
router.delete('/accounts/:id/browser-session', browserDeleteSession);

// Posts (multipart for inline file upload)
router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);
router.post('/posts', uploadPostMedia, createPost);
router.put('/posts/:id', uploadPostMedia, updatePost);
router.delete('/posts/:id', deletePost);
router.post('/posts/:id/approve', approvePost);
router.post('/posts/:id/schedule', schedulePost);
router.post('/posts/:id/publish', publishNow);
router.post('/posts/:id/duplicate', duplicatePost);
router.post('/posts/:id/duplicate-bulk', duplicatePostBulk);
router.post('/posts/:id/promote', uploadPostMedia, promoteIdea);
router.get('/posts/:id/metrics', getPostMetrics);

// Calendar
router.get('/calendar', getCalendar);

// Analytics
router.get('/analytics/overview', getAnalyticsOverview);
router.get('/analytics/:contactId', getAnalytics);
router.get('/analytics/:contactId/compare', compareAnalytics);
router.get('/analytics/:contactId/posts', getPostAnalytics);
router.get('/analytics/:contactId/benchmark', getBenchmark);

// Templates
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Reports
router.get('/reports', getReports);
router.post('/reports', createReport);
router.put('/reports/:id', updateReport);
router.delete('/reports/:id', deleteReport);

// Client registration + config
router.post('/clients/register', registerSocialClient);
router.get('/clients/:contactId/config', getClientConfig);
router.put('/clients/:contactId/config', updateClientConfig);

// Client brief
router.get('/clients/:contactId/brief', getBrief);
router.put('/clients/:contactId/brief', updateBrief);

// Context events (local events/seasonal context for the AI)
router.get('/context-events', getContextEvents);
router.post('/context-events', createContextEvent);
router.put('/context-events/:id', updateContextEvent);
router.delete('/context-events/:id', deleteContextEvent);

// Notion import (READ-ONLY on Notion)
router.post('/notion/preview', notionPreview);
router.post('/notion/import', notionImport);

// Portal link generation (admin)
router.get('/clients/:contactId/portal-link', generatePortalLink);

export default router;
