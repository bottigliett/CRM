import { Request, Response } from 'express';
import prisma from '../config/database';
import { generateContentIdeas, enhanceCaption, suggestHashtags, checkDuplicate, generateClientBrief, generateCaption, generateAnalyticsInsights, isAiConfigured, textSimilarity, refreshClientBrief, generateSmartSuggestions, reviewContent, generateClarifyingQuestions, generatePostGroup, invalidateAiSettingsCache } from '../services/social/ai.service';
import { transcribePostMedia } from '../services/social/transcription.service';

/** GET /api/social/ai/status */
export const aiStatus = async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.socialAiSettings.findUnique({ where: { id: 1 } });
    return res.json({
      success: true,
      data: {
        configured: isAiConfigured(),
        provider: settings?.provider || 'claude',
        hasDeepseekKey: !!(settings?.deepseekApiKey || process.env.DEEPSEEK_API_KEY),
        hasClaudeKey: !!settings?.claudeApiKey,
      },
    });
  } catch {
    return res.json({ success: true, data: { configured: isAiConfigured(), provider: 'claude', hasDeepseekKey: false, hasClaudeKey: false } });
  }
};

/** GET /api/social/ai/settings — read provider + masked keys */
export const aiGetSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.socialAiSettings.findUnique({ where: { id: 1 } });
    const masked = (key: string) => key ? `••••${key.slice(-4)}` : '';
    return res.json({
      success: true,
      data: {
        provider: settings?.provider || 'claude',
        deepseekApiKey: masked(settings?.deepseekApiKey || process.env.DEEPSEEK_API_KEY || ''),
        deepseekBaseUrl: settings?.deepseekBaseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        deepseekModel: settings?.deepseekModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        claudeApiKey: masked(settings?.claudeApiKey || ''),
        claudeModel: settings?.claudeModel || 'claude-sonnet-4-5-20250929',
        hasDeepseekKey: !!(settings?.deepseekApiKey || process.env.DEEPSEEK_API_KEY),
        hasClaudeKey: !!settings?.claudeApiKey,
      },
    });
  } catch (error: any) {
    console.error('[social-ai] get-settings', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** PUT /api/social/ai/settings — update provider + keys (empty key keeps existing) */
export const aiUpdateSettings = async (req: Request, res: Response) => {
  try {
    const { provider, deepseekApiKey, deepseekBaseUrl, deepseekModel, claudeApiKey, claudeModel } = req.body;

    const existing = await prisma.socialAiSettings.findUnique({ where: { id: 1 } });

    const data: any = {
      ...(provider && { provider: provider === 'deepseek' ? 'deepseek' : 'claude' }),
      ...(deepseekBaseUrl && { deepseekBaseUrl }),
      ...(deepseekModel && { deepseekModel }),
      ...(claudeModel && { claudeModel }),
    };
    // Only overwrite a key when a non-empty, non-masked value is provided
    if (deepseekApiKey && !deepseekApiKey.includes('•')) data.deepseekApiKey = deepseekApiKey;
    if (claudeApiKey && !claudeApiKey.includes('•')) data.claudeApiKey = claudeApiKey;

    const settings = await prisma.socialAiSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });

    invalidateAiSettingsCache();

    return res.json({
      success: true,
      data: {
        provider: settings.provider,
        hasDeepseekKey: !!(settings.deepseekApiKey || existing?.deepseekApiKey || process.env.DEEPSEEK_API_KEY),
        hasClaudeKey: !!settings.claudeApiKey,
      },
    });
  } catch (error: any) {
    console.error('[social-ai] update-settings', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/generate-ideas  { contactId, count?, answers? } */
export const aiGenerateIdeas = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    const count = parseInt(req.body.count) || 5;
    const answers = req.body.answers ? String(req.body.answers) : undefined;
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });

    const result = await generateContentIdeas(contactId, Math.min(Math.max(count, 1), 10), answers);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] generate-ideas', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/clarifying-questions  { contactId, mode? } — AI asks what it needs */
export const aiClarifyingQuestions = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    const mode = req.body.mode || 'ideas';
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });
    const result = await generateClarifyingQuestions(contactId, mode);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] clarifying-questions', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/post-group  { contactId, mode, answers?, count? } — monthly calendar or shoot plan */
export const aiPostGroup = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    const mode = req.body.mode === 'shoot' ? 'shoot' : 'calendar';
    const answers = req.body.answers ? String(req.body.answers) : '';
    const count = Math.min(Math.max(parseInt(req.body.count) || 4, 1), 12);
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });
    const result = await generatePostGroup(contactId, mode, answers, count);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] post-group', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/enhance  { caption, tone?, contactId? } */
export const aiEnhanceCaption = async (req: Request, res: Response) => {
  try {
    const { caption, tone, contactId } = req.body;
    if (!caption?.trim()) return res.status(400).json({ success: false, message: 'caption richiesta' });
    const cid = contactId ? parseInt(contactId) : undefined;
    const result = await enhanceCaption(caption, tone || '', cid);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] enhance', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/suggest-hashtags  { content, contactId? } */
export const aiSuggestHashtags = async (req: Request, res: Response) => {
  try {
    const { content, contactId } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'content richiesto' });
    const cid = contactId ? parseInt(contactId) : undefined;
    const result = await suggestHashtags(content, cid);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] suggest-hashtags', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/check-duplicate  { contactId, content } */
export const aiCheckDuplicate = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    const content = req.body.content;
    const excludeId = req.body.excludeId ? parseInt(req.body.excludeId) : null;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'content richiesto' });

    // Fetch ALL posts (same client + other clients) — no truncation, so older
    // duplicates are found too (previously capped at 500 most-recent).
    // excludeId lets the editor skip the post itself when checking an existing idea.
    const existing = await prisma.socialPost.findMany({
      where: { content: { not: '' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: {
        id: true, content: true, contactId: true, stage: true,
        scheduledAt: true, publishedAt: true,
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const score = (p: { content: string }) => textSimilarity(content, p.content);
    const matchFor = (posts: typeof existing) =>
      posts
        .map(p => ({
          id: p.id,
          content: p.content,
          contactId: p.contactId,
          contactName: p.contact?.name || null,
          stage: p.stage,
          scheduledAt: p.scheduledAt,
          publishedAt: p.publishedAt,
          score: score(p),
        }))
        .filter(m => m.score >= 0.45)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    const sameClient = matchFor(existing.filter(p => p.contactId === contactId));
    const otherClient = matchFor(existing.filter(p => p.contactId !== contactId));

    // Single AI suggestion based on the strongest matches
    let suggestion: string | undefined;
    const topMatches = [...sameClient, ...otherClient].sort((a, b) => b.score - a.score).slice(0, 3);
    if (topMatches.length && isAiConfigured()) {
      try {
        const s = await checkDuplicate(content, topMatches);
        suggestion = s.suggestion;
      } catch { /* best-effort */ }
    }

    return res.json({
      success: true,
      data: {
        sameClient: { similar: sameClient.length > 0, matches: sameClient },
        otherClient: { similar: otherClient.length > 0, matches: otherClient },
        suggestion,
      },
    });
  } catch (error: any) {
    console.error('[social-ai] check-duplicate', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/generate-brief  { contactId } */
export const aiGenerateBrief = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });
    const result = await generateClientBrief(contactId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] generate-brief', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/generate-caption  { topic, tone?, contactId? } */
export const aiGenerateCaption = async (req: Request, res: Response) => {
  try {
    const { topic, tone, contactId } = req.body;
    if (!topic?.trim()) return res.status(400).json({ success: false, message: 'topic richiesto' });
    const cid = contactId ? parseInt(contactId) : undefined;
    const result = await generateCaption(topic, tone || '', cid);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] generate-caption', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/insights  { contactId } */
export const aiInsights = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });
    const result = await generateAnalyticsInsights(contactId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] insights', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/transcribe  { postId } — transcribe a post's reel/video (local Whisper) */
export const aiTranscribe = async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.body.postId);
    if (!postId) return res.status(400).json({ success: false, message: 'postId richiesto' });

    const post = await prisma.socialPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });

    // Run transcription in background (can take a while); respond immediately
    transcribePostMedia(postId).catch(err => console.error('[social-ai] transcribe', err.message));

    return res.json({ success: true, message: 'Trascrizione avviata', data: { postId } });
  } catch (error: any) {
    console.error('[social-ai] transcribe', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/refresh-brief  { contactId } — rebuild the client's AI knowledge in the brief */
export const aiRefreshBrief = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });
    const result = await refreshClientBrief(contactId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] refresh-brief', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/smart-suggestions  { contactId } — cross-client improvement suggestions */
export const aiSmartSuggestions = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    if (!contactId) return res.status(400).json({ success: false, message: 'contactId richiesto' });
    const result = await generateSmartSuggestions(contactId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] smart-suggestions', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/review  { contactId, content, caption?, instruction? } — review + rewrite content */
export const aiReview = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    const { content, caption, instruction } = req.body;
    if (!contactId || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'contactId e content sono obbligatori' });
    }
    const result = await reviewContent(contactId, content, caption || '', instruction || '');
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-ai] review', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/ai/feedback  { kind, rating, content?, contactId?, note? } — rate an AI output */
export const aiFeedback = async (req: Request, res: Response) => {
  try {
    const { kind, rating, content, contactId, note } = req.body;
    const r = parseInt(rating);
    if (!kind || ![-1, 1].includes(r)) {
      return res.status(400).json({ success: false, message: 'kind e rating (1 o -1) sono obbligatori' });
    }
    const cid = contactId ? parseInt(contactId) : null;

    const feedback = await prisma.socialAiFeedback.create({
      data: {
        userId: (req as any).user?.userId || 1,
        contactId: cid,
        kind: String(kind),
        rating: r,
        content: content ? String(content).slice(0, 4000) : null,
        note: note ? String(note).slice(0, 1000) : null,
      },
    });

    return res.status(201).json({ success: true, data: feedback });
  } catch (error: any) {
    console.error('[social-ai] feedback', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
