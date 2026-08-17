import prisma from '../../config/database';

/**
 * Social AI service — supports multiple providers (DeepSeek / Claude).
 *
 * Provider + API keys are stored in the DB (social_ai_settings, singleton id=1)
 * so they can be changed from the Settings UI. DeepSeek env vars are used as
 * fallback defaults when the DB row has no key set.
 */

interface AiSettings {
  provider: 'deepseek' | 'claude';
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  claudeApiKey: string;
  claudeModel: string;
}

// In-memory cache of the settings row (refreshed on write / periodically)
let settingsCache: AiSettings | null = null;
let settingsCacheAt = 0;
const SETTINGS_TTL = 10_000; // 10s

export function invalidateAiSettingsCache(): void {
  settingsCache = null;
  settingsCacheAt = 0;
}

async function getAiSettings(): Promise<AiSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheAt < SETTINGS_TTL) return settingsCache;

  const row = await prisma.socialAiSettings.findUnique({ where: { id: 1 } }).catch(() => null);
  const s: AiSettings = {
    provider: (row?.provider === 'claude' ? 'claude' : 'deepseek'),
    deepseekApiKey: row?.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
    deepseekBaseUrl: row?.deepseekBaseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    deepseekModel: row?.deepseekModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    claudeApiKey: row?.claudeApiKey || '',
    claudeModel: row?.claudeModel || 'claude-sonnet-4-5-20250929',
  };
  settingsCache = s;
  settingsCacheAt = now;
  return s;
}

export function isAiConfigured(): boolean {
  // Synchronous check using cache or env (fast path). Full check happens in chat().
  if (settingsCache) {
    return settingsCache.provider === 'claude'
      ? !!settingsCache.claudeApiKey
      : !!settingsCache.deepseekApiKey;
  }
  return !!(process.env.DEEPSEEK_API_KEY || process.env.CLAUDE_API_KEY);
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenAI-compatible (DeepSeek) completion. */
async function chatOpenAI(s: AiSettings, messages: ChatMessage[], opts: { temperature?: number; json?: boolean }): Promise<string> {
  const res = await fetch(`${s.deepseekBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.deepseekApiKey}` },
    body: JSON.stringify({
      model: s.deepseekModel,
      messages,
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Errore AI DeepSeek (${res.status})`);
  }
  return data.choices?.[0]?.message?.content ?? '';
}

/** Anthropic Claude (Messages API) completion. */
async function chatClaude(s: AiSettings, messages: ChatMessage[], opts: { temperature?: number; json?: boolean }): Promise<string> {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const rest = messages.filter(m => m.role !== 'system');
  const body: any = {
    model: s.claudeModel,
    max_tokens: 4096,
    temperature: opts.temperature ?? 0.7,
    messages: rest.map(m => ({ role: m.role, content: m.content })),
  };
  if (system) body.system = system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': s.claudeApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Errore AI Claude (${res.status})`);
  }
  // Claude returns content as an array of blocks
  return (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
}

async function chat(messages: ChatMessage[], opts: { temperature?: number; json?: boolean } = {}): Promise<string> {
  const s = await getAiSettings();

  if (s.provider === 'claude') {
    if (!s.claudeApiKey) throw new Error('AI non configurata: imposta la chiave Claude nelle Impostazioni AI');
    return chatClaude(s, messages, opts);
  }

  if (!s.deepseekApiKey) throw new Error('AI non configurata: imposta la chiave DeepSeek nelle Impostazioni AI');
  return chatOpenAI(s, messages, opts);
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract the first JSON object if the model wrapped it in text
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error('Risposta AI non valida (JSON)');
  }
}

// === Local text similarity (no LLM) — for fast duplicate detection ===

function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Italian function words + common verb forms. Filtering them avoids the false
// positives where e.g. "Chi ha scelto Piacenza..." matched "Chi siamo" just
// because they both contain "chi".
const ITALIAN_STOPWORDS = new Set([
  // articles, prepositions, conjunctions, pronouns
  'il','lo','la','i','gli','le','un','uno','una','di','a','da','in','con','su','per','tra','fra',
  'e','ed','o','ma','se','che','cui','chi','del','dello','della','dei','degli','delle','al','allo',
  'alla','ai','agli','alle','dal','dallo','dalla','dai','dagli','dalle','nel','nello','nella','nei',
  'negli','nelle','sul','sullo','sulla','sui','sugli','sulle','ad','non','piu','come','cosa','quando',
  'dove','perche','anche','ancora','sempre','mai','gia','ora','oggi','domani','ieri','questo','questa',
  'questi','queste','quello','quella','quelli','quelle','molto','poco','tanto','tutti','tutte','tutto',
  'loro','nostro','nostra','nostri','nostre','vostro','vostra','vostri','vostre','mio','mia','miei',
  'mie','tuo','tua','tuoi','tue','suo','sua','suoi','sue',
  // common verb forms (essere, avere, fare, potere, dovere, volere, andare, venire, stare)
  'essere','sono','sei','siamo','siete','era','erano','sara','saranno','stato','stata','stati','state',
  'avere','ho','hai','ha','abbiamo','avete','hanno','aveva','avevano','avuto','avuta','avuti',
  'fare','fa','fai','facciamo','fate','fanno','fatto','fatta','fatti',
  'potere','puo','possono','puoi','possiamo','dovere','devo','devi','deve','dobbiamo','devono',
  'volere','vuoi','vuole','vogliamo','vogliono','andare','va','vai','andiamo','vanno',
  'venire','viene','vengono','stare','sta','stanno',
]);

function tokenize(s: string): Set<string> {
  return new Set(
    normalizeText(s)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !ITALIAN_STOPWORDS.has(w))
  );
}

export function textSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  // Exact match (normalized) is a definitive duplicate
  if (na === nb) return 1;
  const ta = tokenize(na);
  const tb = tokenize(nb);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  // A single shared word is too weak to call two posts "similar" (it was the
  // source of false positives like "Chi ha scelto Piacenza…" ~ "Chi siamo").
  if (inter < 2) return 0;
  return inter / Math.min(ta.size, tb.size);
}

// === Temporal context: seasons, holidays, local events ===

const ITALIAN_MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function seasonFor(date: Date): string {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return 'inverno';
  if (m <= 4) return 'primavera';
  if (m <= 7) return 'estate';
  return 'autunno';
}

/** Computus — date of Easter Sunday for a given year (Gregorian). */
function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Fixed Italian holidays (month 0-based, day) + movable ones computed per year. */
function italianHolidays(year: number): { name: string; date: Date }[] {
  const easter = easterSunday(year);
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return [
    { name: 'Capodanno', date: new Date(year, 0, 1) },
    { name: 'Epifania', date: new Date(year, 0, 6) },
    { name: 'San Valentino', date: new Date(year, 1, 14) },
    { name: 'Festa della donna', date: new Date(year, 2, 8) },
    { name: 'Festa del papà', date: new Date(year, 2, 19) },
    { name: 'Pasqua', date: easter },
    { name: 'Pasquetta', date: addDays(easter, 1) },
    { name: 'Liberazione (25 aprile)', date: new Date(year, 3, 25) },
    { name: 'Festa del lavoro (1 maggio)', date: new Date(year, 4, 1) },
    { name: 'Festa della mamma', date: new Date(year, 4, 10) },
    { name: 'Repubblica (2 giugno)', date: new Date(year, 5, 2) },
    { name: 'Ferragosto', date: new Date(year, 7, 15) },
    { name: 'Halloween', date: new Date(year, 9, 31) },
    { name: 'Ognissanti', date: new Date(year, 10, 1) },
    { name: 'Immacolata', date: new Date(year, 11, 8) },
    { name: 'Natale', date: new Date(year, 11, 25) },
    { name: 'Santo Stefano', date: new Date(year, 11, 26) },
    { name: 'San Silvestro / Capodanno', date: new Date(year, 11, 31) },
  ];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Build a human-readable context block for a given date:
 * season, upcoming/recent holidays (±7 days) and active user-defined context events.
 * Used to ground AI-generated content in the time of year and local events.
 */
export async function getContextSummary(contactId: number, referenceDate: Date = new Date()): Promise<string> {
  const season = seasonFor(referenceDate);
  const month = ITALIAN_MONTHS[referenceDate.getMonth()];
  const year = referenceDate.getFullYear();

  // Holidays within ±7 days
  const nearHolidays = italianHolidays(year)
    .map(h => ({ ...h, diffDays: Math.round((h.date.getTime() - referenceDate.getTime()) / 86400000) }))
    .filter(h => Math.abs(h.diffDays) <= 7)
    .map(h => h.diffDays === 0 ? `${h.name} (oggi)` : h.diffDays > 0 ? `${h.name} (tra ${h.diffDays} giorni)` : `${h.name} (${-h.diffDays} giorni fa)`);

  // Active context events (global + this client's) covering the reference date
  const events = await prisma.socialContextEvent.findMany({
    where: {
      isActive: true,
      startDate: { lte: referenceDate },
      OR: [
        { endDate: null },
        { endDate: { gte: referenceDate } },
      ],
      ...(contactId ? { OR: [{ contactId: null }, { contactId }] } : {}),
    },
    orderBy: { startDate: 'asc' },
    take: 15,
    select: { title: true, description: true, category: true },
  });

  const parts: string[] = [
    `- Periodo dell'anno: ${season}, mese di ${month} ${year}.`,
  ];
  if (nearHolidays.length) parts.push(`- Festività vicine: ${nearHolidays.join(', ')}.`);
  if (events.length) {
    parts.push(`- Eventi/contesti attivi segnalati dall'utente: ${events.map(e => `${e.title}${e.description ? ` — ${e.description}` : ''} (${e.category})`).join('; ')}.`);
  }

  return parts.join('\n');
}

/**
 * Fetch the client's fixed AI directives (aiInstructions) — hard rules the AI must
 * always follow when generating content for this client.
 */
async function getAiInstructions(contactId: number): Promise<string> {
  try {
    const brief = await prisma.socialClientBrief.findUnique({ where: { contactId }, select: { aiInstructions: true } });
    return brief?.aiInstructions?.trim() || '';
  } catch {
    return '';
  }
}

// === AI feedback memory ===

/** Get liked/disliked examples the user rated for a given kind, so the AI learns preferences. */
export async function getFeedbackExamples(
  contactId: number | undefined,
  kind: string,
  limit = 6
): Promise<{ liked: string[]; disliked: string[] }> {
  try {
    const rows = await prisma.socialAiFeedback.findMany({
      where: { kind, ...(contactId !== undefined && { contactId }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { content: true, rating: true },
    });
    const liked: string[] = [];
    const disliked: string[] = [];
    for (const r of rows) {
      if (!r.content?.trim()) continue;
      if (r.rating >= 1) liked.push(r.content);
      else disliked.push(r.content);
      if (liked.length >= limit && disliked.length >= limit) break;
    }
    return { liked: liked.slice(0, limit), disliked: disliked.slice(0, limit) };
  } catch {
    return { liked: [], disliked: [] };
  }
}

function feedbackHint(liked: string[], disliked: string[]): string {
  let s = '';
  if (liked.length) s += `\n- Esempi di output che all'utente SONO piaciuti (segui questo stile):\n${liked.map(x => `  * "${x.slice(0, 200)}"`).join('\n')}`;
  if (disliked.length) s += `\n- Esempi di output che all'utente NON sono piaciuti (evita questo stile/contenuto):\n${disliked.map(x => `  * "${x.slice(0, 200)}"`).join('\n')}`;
  return s;
}

/**
 * Render the client's pre-built AI knowledge (brief.aiData) into a compact prompt
 * block. This is the KEY cost optimisation: the knowledge is computed ONCE by
 * refreshClientBrief and then reused by every generation call, so we never re-send
 * months of posts to the LLM on each request.
 */
function knowledgeHint(aiData: any): string {
  if (!aiData) return '';
  const lines: string[] = [];
  if (aiData.tone) lines.push(`- Tono di voce emerso dai contenuti: ${aiData.tone}`);
  if (aiData.summary) lines.push(`- Riepilogo dei contenuti esistenti: ${aiData.summary}`);
  if (Array.isArray(aiData.themes) && aiData.themes.length) lines.push(`- Temi GIÀ TRATTATI nei post esistenti (NON generare altri contenuti su questi argomenti): ${aiData.themes.join(', ')}`);
  if (Array.isArray(aiData.actors) && aiData.actors.length) lines.push(`- Persone/protagonisti citati: ${aiData.actors.join(', ')}`);
  if (Array.isArray(aiData.trends) && aiData.trends.length) lines.push(`- Tendenze di contenuto: ${aiData.trends.join(', ')}`);
  if (Array.isArray(aiData.bestTimes) && aiData.bestTimes.length) lines.push(`- Orari di pubblicazione migliori (dai dati reali): ${aiData.bestTimes.map((b: any) => `${b.hour}:00`).join(', ')}`);
  if (Array.isArray(aiData.topHashtags) && aiData.topHashtags.length) lines.push(`- Hashtag più usati: ${aiData.topHashtags.map((h: any) => h?.hashtag || h).join(', ')}`);
  if (!lines.length) return '';
  return `CONOSCENZA RACCOLTA (dai contenuti reali del cliente, aggiornata automaticamente):\n${lines.join('\n')}`;
}

// === AI functions ===

export interface IdeaSuggestion {
  content: string;
  title?: string;
  postType: string;
  caption: string;
  hashtags: string[];
}

export async function generateContentIdeas(contactId: number, count = 5, answers?: string): Promise<{ ideas: IdeaSuggestion[] }> {
  const [brief, existing, feedback, context, instructions] = await Promise.all([
    prisma.socialClientBrief.findUnique({ where: { contactId } }),
    // ALL existing idea titles + production content for this client (used for hard dedup)
    prisma.socialPost.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      take: 400,
      select: { content: true, ideaCaption: true },
    }),
    getFeedbackExamples(contactId, 'ideas'),
    getContextSummary(contactId),
    getAiInstructions(contactId),
  ]);

  const existingTexts = existing.map(p => p.content).filter(Boolean) as string[];

  const system = 'Sei un social media manager senior per un\'agenzia immobiliare. Rispondi SOLO con JSON valido.';

  // Helper: is a candidate too similar to existing content or already-chosen ideas?
  // Title-only: caption comparison was too aggressive for niche clients (every
  // caption shares the domain vocabulary) and caused "0 ideas" results.
  const isDup = (title: string, chosen: IdeaSuggestion[]) =>
    existingTexts.some(t => textSimilarity(title, t) >= 0.40)
    || chosen.some(c => textSimilarity(title, c.content) >= 0.5);

  const chosen: IdeaSuggestion[] = [];
  const avoidList = new Set<string>(existingTexts.slice(0, 150));

  // Retry up to 4 rounds to reach `count` unique, non-duplicate ideas.
  for (let round = 0; round < 4 && chosen.length < count; round++) {
    const need = count - chosen.length;
    const user = `Genera ${need} nuove idee di contenuto social per questo cliente "${brief ? '' : ''}".
Contesto:
- Tono di voce: ${brief?.tone || 'non specificato'}
- Audience: ${brief?.audience || 'non specificata'}
- Obiettivi: ${brief?.goals || 'non specificati'}
${context}
${knowledgeHint(brief?.aiData)}
${instructions ? `- INDICAZIONI FISSE dell'utente (segui SEMPRE queste regole):\n${instructions}` : ''}
${answers ? `- Indicazioni specifiche fornite dall'utente (risposte alle tue domande): ${answers}` : ''}
- Contenuti ESISTENTI da NON ripetere (titoli simili a questi sono vietati): ${[...avoidList].slice(0, 150).join(' | ') || 'nessuno'}
${feedbackHint(feedback.liked, feedback.disliked)}

ANTIDUPLICATI (obbligatorio): NON proporre un argomento che sia già nell'elenco "Temi GIÀ TRATTATI" o nei "Contenuti ESISTENTI", e non riformularli con parole diverse. Scegli un ANGOLO NUOVO, non ancora coperto, ma SEMPRE pertinente al settore del cliente. Mantieni tono e stile, cambia argomento.

Rispondi con JSON:
{"ideas":[{"content":"titolo idea","postType":"POST|REEL|CAROUSEL|STORY","caption":"caption completa con emoji","hashtags":["#a","#b"]}]}`;

    let parsed: { ideas: IdeaSuggestion[] };
    try {
      const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.85, json: true });
      parsed = parseJson<{ ideas: IdeaSuggestion[] }>(out);
    } catch (err: any) {
      console.error('[ai] generate-ideas round failed', err.message);
      break;
    }

    for (const idea of parsed.ideas || []) {
      const title = (idea?.content || idea?.title || '').trim();
      if (!title) continue;
      if (isDup(title, chosen)) {
        avoidList.add(title); // tell the AI to avoid it next round
        continue;
      }
      chosen.push({ ...idea, content: title });
      avoidList.add(title);
      if (chosen.length >= count) break;
    }
  }

  return { ideas: chosen.slice(0, count) };
}

/**
 * Ask the AI what it needs to know before creating content, so it can generate
 * better-fitting ideas/post-groups. Returns 3-4 concrete questions in Italian,
 * grounded in the client's context (avoiding things already in the brief).
 */
export async function generateClarifyingQuestions(
  contactId: number,
  mode: 'ideas' | 'calendar' | 'shoot' = 'ideas'
): Promise<{ questions: string[] }> {
  const [brief, context, instructions] = await Promise.all([
    prisma.socialClientBrief.findUnique({ where: { contactId } }),
    getContextSummary(contactId),
    getAiInstructions(contactId),
  ]);

  const modeLabel = mode === 'calendar' ? 'un calendario mensile di post' : mode === 'shoot' ? 'un piano di video per uno shooting' : 'delle idee di contenuto';

  const system = 'Sei un social media manager senior. Rispondi SOLO con JSON valido.';
  const user = `Devi creare ${modeLabel} per un cliente immobiliare. Prima di farlo, poni 3-4 domande brevi e concrete (in italiano) per capire cosa vuole davvero l'utente. Non chiedere informazioni già note.

Cosa sai già del cliente:
- Tono di voce: ${brief?.tone || 'non specificato'}
- Audience: ${brief?.audience || 'non specificata'}
- Obiettivi: ${brief?.goals || 'non specificati'}
${instructions ? `- INDICAZIONI FISSE dell'utente (già note, non chiedere di queste):\n${instructions}` : ''}
${context}

Domande utili possono riguardare: formato preferito, tema/proprietà specifica, tono, target, stagione/evento da sfruttare, obiettivo di conversione.

Rispondi con JSON:
{"questions":["domanda 1","domanda 2","domanda 3"]}`;

  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.6, json: true });
  const parsed = parseJson<{ questions: string[] }>(out);
  return { questions: (parsed.questions || []).filter(Boolean).slice(0, 4) };
}

/**
 * Generate a group of posts: either a monthly content calendar (count posts spread over the
 * next month) or a video-shoot plan (count video concepts). Grounded in client context.
 */
export async function generatePostGroup(
  contactId: number,
  mode: 'calendar' | 'shoot',
  answers: string,
  count = 4
): Promise<{ items: { date?: string; content: string; caption: string; hashtags: string[]; postType: string; note?: string }[] }> {
  const [brief, context, existing, instructions] = await Promise.all([
    prisma.socialClientBrief.findUnique({ where: { contactId } }),
    getContextSummary(contactId),
    prisma.socialPost.findMany({ where: { contactId }, select: { content: true }, take: 200 }),
    getAiInstructions(contactId),
  ]);

  const existingTexts = existing.map(p => p.content).filter(Boolean) as string[];

  const isCalendar = mode === 'calendar';
  const modePrompt = (n: number) => isCalendar
    ? `Crea un calendario editoriale di ESATTAMENTE ${n} post per il mese prossimo. Genera tutti e ${n} gli elementi in un unico array "items". Distribuisci i post su date diverse (indicando per ognuno la data in formato ISO YYYY-MM-DD, a partire da oggi ${new Date().toISOString().slice(0, 10)} in avanti, spaziandoli su ~30 giorni).`
    : `Crea un piano di ESATTAMENTE ${n} video per uno shooting. Genera tutti e ${n} gli elementi in un unico array "items". Per ogni video indica: concept, ambientazione/location, chi compare (attori/persone), e la caption.`;

  const system = 'Sei un social media manager senior per un\'agenzia immobiliare. Rispondi SOLO con JSON valido.';

  const items: any[] = [];
  const seen = new Set<string>();
  const avoidList = new Set<string>(existingTexts.slice(0, 150));

  // Retry up to 2 rounds to reach `count` distinct, non-duplicate items.
  for (let round = 0; round < 2 && items.length < count; round++) {
    const need = count - items.length;
    const user = `${modePrompt(need)}

Contesto cliente:
- Tono di voce: ${brief?.tone || 'non specificato'}
- Audience: ${brief?.audience || 'non specificata'}
- Obiettivi: ${brief?.goals || 'non specificati'}
${context}
${knowledgeHint(brief?.aiData)}
${instructions ? `- INDICAZIONI FISSE dell'utente (segui SEMPRE queste regole):\n${instructions}` : ''}
${answers ? `- Indicazioni specifiche fornite dall'utente: ${answers}` : ''}
- Contenuti ESISTENTI da NON ripetere (vietati): ${[...avoidList].slice(0, 150).join(' | ') || 'nessuno'}

ANTIDUPLICATI (obbligatorio): NON proporre un argomento che sia già nell'elenco "Temi GIÀ TRATTATI" o nei "Contenuti ESISTENTI", e non riformularli con parole diverse. Scegli un ANGOLO NUOVO, non ancora coperto, ma SEMPRE pertinente al settore del cliente. Mantieni tono e stile, cambia argomento.

Rispondi con JSON:
{"items":[{"date":"2026-08-20","content":"titolo","caption":"didascalia","hashtags":["#a"],"postType":"POST|REEL|CAROUSEL|STORY"${isCalendar ? '' : ',"note":"concept e location'}]}`;

    let parsed: { items: any[] };
    try {
      const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.8, json: true });
      parsed = parseJson<{ items: any[] }>(out);
    } catch (err: any) {
      console.error('[ai] post-group round failed', err.message);
      break;
    }

    for (const it of parsed.items || []) {
      const title = (it?.content || it?.title || '').trim();
      if (!title) continue;
      if (existingTexts.some(t => textSimilarity(title, t) >= 0.40)) { avoidList.add(title); continue; }
      if ([...seen].some(s => textSimilarity(title, s) >= 0.5)) { avoidList.add(title); continue; }
      seen.add(title);
      avoidList.add(title);
      items.push({
        date: it.date || undefined,
        content: title,
        caption: it.caption || '',
        hashtags: Array.isArray(it.hashtags) ? it.hashtags : [],
        postType: it.postType || 'POST',
        note: it.note || undefined,
      });
      if (items.length >= count) break;
    }
  }

  return { items };
}

export async function enhanceCaption(caption: string, tone: string, contactId?: number): Promise<{ caption: string; hashtags: string[] }> {
  const [feedback, context, instructions] = await Promise.all([
    getFeedbackExamples(undefined, 'caption'),
    contactId ? getContextSummary(contactId) : Promise.resolve(''),
    contactId ? getAiInstructions(contactId) : Promise.resolve(''),
  ]);
  const system = 'Sei un copywriter social. Rispondi SOLO con JSON valido.';
  const user = `Migliora questa caption mantenendo il senso originale e aggiungi hashtag pertinenti (massimo 8).
Tono di voce: ${tone || 'professionale ma accessibile'}.
Caption originale: "${caption}"
${context}
${instructions ? `INDICAZIONI FISSE dell'utente (segui SEMPRE queste regole):\n${instructions}` : ''}
${feedbackHint(feedback.liked, feedback.disliked)}

Rispondi con JSON:
{"caption":"caption migliorata","hashtags":["#a","#b"]}`;

  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.6, json: true });
  return parseJson<{ caption: string; hashtags: string[] }>(out);
}

export async function suggestHashtags(content: string, contactId?: number): Promise<{ hashtags: string[] }> {
  const [feedback, context, instructions] = await Promise.all([
    getFeedbackExamples(undefined, 'hashtags'),
    contactId ? getContextSummary(contactId) : Promise.resolve(''),
    contactId ? getAiInstructions(contactId) : Promise.resolve(''),
  ]);
  const system = 'Sei un esperto di hashtag social. Rispondi SOLO con JSON valido.';
  const user = `Suggerisci 8 hashtag pertinenti per questo contenuto immobiliare: "${content}".
${context}
${instructions ? `INDICAZIONI FISSE dell'utente (segui SEMPRE queste regole):\n${instructions}` : ''}
${feedbackHint(feedback.liked, feedback.disliked)}
Rispondi con JSON: {"hashtags":["#a","#b"]}`;
  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.5, json: true });
  return parseJson<{ hashtags: string[] }>(out);
}

/**
 * Detect similar content among existing posts (local similarity) and, when AI is available,
 * propose a rewording to differentiate.
 */
export async function checkDuplicate(
  content: string,
  existing: { id: number; content: string }[]
): Promise<{ similar: boolean; matches: { id: number; content: string; score: number }[]; suggestion?: string }> {
  const matches = existing
    .map(p => ({ id: p.id, content: p.content, score: textSimilarity(content, p.content) }))
    .filter(m => m.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  let suggestion: string | undefined;
  if (matches.length && isAiConfigured()) {
    try {
      const system = 'Sei un social media manager. Rispondi SOLO con JSON valido.';
      const user = `Questo nuovo contenuto è simile a contenuti già esistenti.
Nuovo: "${content}"
Simili esistenti: ${matches.map(m => `"${m.content}"`).join(' | ')}
Proponi una riformulazione del nuovo contenuto che lo differenzi (stessa idea, parole diverse).
Rispondi con JSON: {"suggestion":"nuova formulazione"}`;
      const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.7, json: true });
      const parsed = parseJson<{ suggestion: string }>(out);
      suggestion = parsed.suggestion;
    } catch { /* best-effort */ }
  }

  return { similar: matches.length > 0, matches, suggestion };
}

/** Generate an initial client brief (tone, audience, goals, notes) from the contact name. */
export async function generateClientBrief(contactId: number): Promise<{ tone: string; audience: string; goals: string; notes: string }> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true, notes: true } });
  const name = contact?.name || 'questo cliente';
  const existingNotes = contact?.notes?.slice(0, 400) || '';
  const feedback = await getFeedbackExamples(contactId, 'brief');

  const system = 'Sei un social media manager per un\'agenzia immobiliare. Rispondi SOLO con JSON valido.';
  const user = `Crea un brief social per il cliente "${name}".
Informazioni disponibili: ${existingNotes || 'nessuna'}
${feedbackHint(feedback.liked, feedback.disliked)}

Rispondi con JSON:
{"tone":"tono di voce (1-2 frasi)","audience":"target audience","goals":"obiettivi social","notes":"appunti/linee guida"}`;

  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.7, json: true });
  return parseJson<{ tone: string; audience: string; goals: string; notes: string }>(out);
}

/** Generate a caption from a topic/idea. */
export async function generateCaption(topic: string, tone: string, contactId?: number): Promise<{ caption: string; hashtags: string[] }> {
  const [feedback, context, instructions] = await Promise.all([
    getFeedbackExamples(undefined, 'caption'),
    contactId ? getContextSummary(contactId) : Promise.resolve(''),
    contactId ? getAiInstructions(contactId) : Promise.resolve(''),
  ]);
  const system = 'Sei un copywriter social per un\'agenzia immobiliare. Rispondi SOLO con JSON valido.';
  const user = `Scrivi una caption accattivante per questo argomento: "${topic}".
Tono di voce: ${tone || 'professionale ma accessibile'}.
${context}
${instructions ? `INDICAZIONI FISSE dell'utente (segui SEMPRE queste regole):\n${instructions}` : ''}
${feedbackHint(feedback.liked, feedback.disliked)}
Rispondi con JSON: {"caption":"caption completa con emoji","hashtags":["#a","#b"]}`;
  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.8, json: true });
  return parseJson<{ caption: string; hashtags: string[] }>(out);
}

/**
 * Content review: analyze an idea/post text and return what's wrong + a rewritten version.
 * Uses the client's brief tone + past textual feedback (notes) so improvements match
 * the user's style preferences for that specific client.
 */
export async function reviewContent(
  contactId: number,
  content: string,
  caption: string,
  instruction: string
): Promise<{
  issues: string[];
  rewritten: { content: string; caption: string; hashtags: string[] };
}> {
  const [brief, feedback, context, instructions] = await Promise.all([
    prisma.socialClientBrief.findUnique({ where: { contactId } }),
    prisma.socialAiFeedback.findMany({
      where: { kind: 'review', contactId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true, note: true, rating: true },
    }),
    getContextSummary(contactId),
    getAiInstructions(contactId),
  ]);

  const notes = feedback.filter(f => f.note?.trim()).map(f => f.note!).slice(0, 10);
  const liked = feedback.filter(f => f.rating >= 1 && f.content?.trim()).map(f => f.content!).slice(0, 6);
  const disliked = feedback.filter(f => f.rating < 0 && f.content?.trim()).map(f => f.content!).slice(0, 6);

  const system = 'Sei un editor/social media manager senior. Rispondi SOLO con JSON valido.';
  const user = `Rivedi questo contenuto social e correggilo in base alle richieste dell'utente.

Cliente: tono di voce "${brief?.tone || 'professionale ma accessibile'}".

${context}

${instructions ? `INDICAZIONI FISSE dell'utente (segui SEMPRE queste regole):\n${instructions}\n` : ''}
Contenuto attuale:
- Titolo: "${content}"
- Didascalia: "${caption || '(vuota)'}"

Richiesta di revisione dell'utente: "${instruction || 'migliora in generale tono, stile e chiarezza'}"

${notes.length ? `Feedback passati dell'utente su questo cliente (da rispettare):
${notes.map(n => `- ${n}`).join('\n')}` : ''}
${feedbackHint(liked, disliked)}

Analizza e:
1. "issues": elenca 2-5 problemi concreti del contenuto attuale (tono, chiarezza, stile, lunghezza, call-to-action, hashtag) in italiano.
2. "rewritten": riscrivi titolo + didascalia + hashtag applicando la richiesta e rispettando il tono del cliente.

Rispondi con JSON:
{"issues":["problema 1","problema 2"],"rewritten":{"content":"nuovo titolo","caption":"nuova didascalia","hashtags":["#a","#b"]}}`;

  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.5, json: true });
  const parsed = parseJson<{ issues: string[]; rewritten: { content: string; caption: string; hashtags: string[] } }>(out);
  return {
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    rewritten: {
      content: parsed.rewritten?.content || content,
      caption: parsed.rewritten?.caption || caption,
      hashtags: Array.isArray(parsed.rewritten?.hashtags) ? parsed.rewritten.hashtags : [],
    },
  };
}

/** Generate analytics insights: weekly summary + recommendations based on published posts. */
export async function generateAnalyticsInsights(contactId: number): Promise<{ summary: string; recommendations: string[]; hasData: boolean }> {
  const posts = await prisma.socialPost.findMany({
    where: { contactId, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: { content: true, postType: true, publishedAt: true, postMetrics: { orderBy: { collectedAt: 'desc' } } },
  });

  // Has the account any real performance data (likes/comments/reach/impressions)?
  const hasMetrics = posts.some(p => p.postMetrics.length > 0);
  const totalEngagement = posts.reduce((s, p) => {
    const latest = new Map<number, number>();
    for (const m of p.postMetrics) {
      if (!latest.has(m.socialAccountId)) latest.set(m.socialAccountId, m.engagement ?? 0);
    }
    return s + [...latest.values()].reduce((a, b) => a + b, 0);
  }, 0);

  // Don't invent insights when there's nothing to analyze yet.
  if (posts.length === 0 || !hasMetrics) {
    return {
      summary: posts.length === 0
        ? 'Non ci sono ancora post pubblicati per questo cliente. Pubblica qualche contenuto e raccogli le metriche, poi potrò darti un\'analisi reale.'
        : 'I post ci sono ma non ho ancora dati di performance (like, commenti, reach). Collega le metriche e riprova tra qualche giorno.',
      recommendations: [],
      hasData: false,
    };
  }

  const recent = posts.map(p => `${p.postType}: ${p.content.slice(0, 80)} (eng. ${p.postMetrics[0]?.engagement ?? 0})`).join('\n');
  const feedback = await getFeedbackExamples(contactId, 'insights');

  const system = 'Sei un analista social media per un\'agenzia immobiliare. Rispondi SOLO con JSON valido. Basati ESCLUSIVAMENTE sui dati forniti: non inventare numeri o performance.';
  const user = `Analizza questi contenuti pubblicati e le loro performance reali, produci un riepilogo + raccomandazioni concrete.
Contenuti con engagement reale (totale engagement: ${totalEngagement}):
${recent || 'nessun contenuto'}
${feedbackHint(feedback.liked, feedback.disliked)}

Rispondi con JSON:
{"summary":"riepilogo 2-3 frasi basato sui dati","recommendations":["raccomandazione 1","raccomandazione 2","raccomandazione 3"]}`;

  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.7, json: true });
  const parsed = parseJson<{ summary: string; recommendations: string[] }>(out);
  return { summary: parsed.summary, recommendations: parsed.recommendations || [], hasData: true };
}

/**
 * Analyze a reel/video transcript to extract who appears in the video (actors/people),
 * recurring themes and the profile's content trend. Stored on the post and aggregated
 * into the client brief.
 */
export async function analyzeTranscript(
  contactId: number,
  transcript: string,
  postContent?: string
): Promise<{ actors: string[]; themes: string[]; trend: string; summary: string }> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true } });
  const name = contact?.name || 'il cliente';

  const system = 'Sei un analista di contenuti social per un\'agenzia immobiliare. Rispondi SOLO con JSON valido.';
  const user = `Analizza la trascrizione di un reel/video del cliente "${name}" e ricava:
- "actors": le persone che compaiono o vengono citate nel video (nomi/ruoli, es. "Davide - agente"). Se non è chiaro, inferisci dai pronomi/citazioni o lascia array vuoto.
- "themes": i temi principali del video (es. "visita immobiliare", "dietro le quinte", "consigli").
- "trend": la tendenza di contenuto che questo video suggerisce per il profilo (1-2 frasi).
- "summary": riassunto di 2-3 frasi del video.

Trascrizione:
"${transcript.slice(0, 3000)}"

Contenuto del post associato: ${postContent?.slice(0, 300) || 'non disponibile'}

Rispondi con JSON:
{"actors":["nome - ruolo"],"themes":["tema"],"trend":"tendenza","summary":"riassunto"}`;

  const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.4, json: true });
  const parsed = parseJson<{ actors: string[]; themes: string[]; trend: string; summary: string }>(out);
  return {
    actors: Array.isArray(parsed.actors) ? parsed.actors : [],
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    trend: parsed.trend || '',
    summary: parsed.summary || '',
  };
}

/** Aggregate best posting hours from published posts of a given client (hour → engagement/likes). */
async function clientPostingPerformance(contactId: number): Promise<{
  postsByHour: Record<number, { count: number; likes: number; comments: number; engagement: number }>;
  topHashtags: { hashtag: string; count: number }[];
  postTypes: Record<string, number>;
  hasEngagement: boolean;
}> {
  const posts = await prisma.socialPost.findMany({
    where: { contactId, status: 'PUBLISHED' },
    include: {
      hashtags: true,
      postMetrics: { orderBy: { collectedAt: 'desc' } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 200,
  });

  const postsByHour: Record<number, { count: number; likes: number; comments: number; engagement: number }> = {};
  const hashtagCount = new Map<string, number>();
  const postTypes: Record<string, number> = {};
  let hasEngagement = false;

  for (const p of posts) {
    if (p.publishedAt) {
      const h = p.publishedAt.getHours();
      const e = postsByHour[h] || (postsByHour[h] = { count: 0, likes: 0, comments: 0, engagement: 0 });
      e.count++;
      // Latest metrics across all accounts
      const latest = new Map<number, typeof p.postMetrics[0]>();
      for (const m of p.postMetrics) {
        if (!latest.has(m.socialAccountId) || m.collectedAt > latest.get(m.socialAccountId)!.collectedAt) {
          latest.set(m.socialAccountId, m);
        }
      }
      for (const m of latest.values()) {
        e.likes += m.likes ?? 0;
        e.comments += m.comments ?? 0;
        e.engagement += m.engagement ?? 0;
        if ((m.likes ?? 0) > 0 || (m.comments ?? 0) > 0 || (m.reach ?? 0) > 0 || (m.impressions ?? 0) > 0) hasEngagement = true;
      }
    }
    for (const h of p.hashtags) hashtagCount.set(h.hashtag, (hashtagCount.get(h.hashtag) || 0) + 1);
    postTypes[p.postType] = (postTypes[p.postType] || 0) + 1;
  }

  return {
    postsByHour,
    topHashtags: [...hashtagCount.entries()].map(([hashtag, count]) => ({ hashtag, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    postTypes,
    hasEngagement,
  };
}

/**
 * Refresh a client's brief "AI knowledge" block, GROUNDED IN THE REAL POST/REEL CONTENT:
 * captions (content), descriptions (ideaCaption), scripts (ideaScript), notes, hashtags
 * and reel transcripts. The AI summarizes ONLY this real text — never invents facts.
 * Deterministic signals (best times, hashtags, formats) are computed separately.
 *
 * Cost optimisation: first run reads ALL posts (full build); later runs read only
 * posts edited after `aiData.lastSyncedAt` and merge with the stored knowledge, so
 * the weekly refresh never re-reads months of content.
 */
export async function refreshClientBrief(contactId: number): Promise<any> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true } });
  const name = contact?.name || 'questo cliente';

  const brief = await prisma.socialClientBrief.findUnique({ where: { contactId } });
  const prevData = (brief?.aiData as any) || {};
  const now = new Date();

  // === Incremental strategy (cost optimisation) ===
  // First run (no watermark): read ALL posts and build the knowledge from scratch.
  // Subsequent runs (weekly job): read ONLY posts created/edited after the last
  // sync, then merge with the stored knowledge. The LLM never re-reads months of
  // content on every call — only the small delta since the last refresh.
  const watermark: Date | null = prevData.lastSyncedAt ? new Date(prevData.lastSyncedAt) : null;
  const incremental = watermark !== null;

  const [posts, perf, allContacts, totalCount] = await Promise.all([
    prisma.socialPost.findMany({
      where: {
        contactId,
        ...(watermark ? { updatedAt: { gt: watermark } } : {}),
      },
      select: {
        id: true,
        content: true,
        postType: true,
        ideaCaption: true,
        ideaScript: true,
        ideaNotes: true,
        ideaObiettivo: true,
        mediaTranscript: true,
        mediaAiAnalysis: true,
        hashtags: { select: { hashtag: true } },
        publishedAt: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      // Full build reads everything (LLM input is still capped below); incremental
      // only needs the small delta since the last sync.
      take: incremental ? 200 : undefined,
    }),
    clientPostingPerformance(contactId),
    prisma.contact.findMany({
      where: { socialPosts: { some: { status: 'PUBLISHED' } } },
      select: { id: true, name: true },
      take: 50,
    }),
    prisma.socialPost.count({ where: { contactId } }),
  ]);

  // === 1. Build a grounded text corpus from real post/reel content ===
  const corpus: string[] = [];
  for (const p of posts) {
    const parts: string[] = [];
    if (p.content?.trim()) parts.push(`Titolo/caption: ${p.content.trim()}`);
    if (p.ideaCaption?.trim()) parts.push(`Didascalia: ${p.ideaCaption.trim()}`);
    if (p.ideaScript?.trim()) parts.push(`Script: ${p.ideaScript.trim()}`);
    if (p.ideaObiettivo?.trim()) parts.push(`Obiettivo: ${p.ideaObiettivo.trim()}`);
    if (p.ideaNotes?.trim()) parts.push(`Note: ${p.ideaNotes.trim()}`);
    const tags = (p.hashtags || []).map(h => h.hashtag).filter(Boolean);
    if (tags.length) parts.push(`Hashtag: ${tags.join(' ')}`);
    if (p.mediaTranscript?.trim()) parts.push(`Trascrizione reel: ${p.mediaTranscript.trim()}`);
    if (parts.length) corpus.push(`[${p.postType}] ${parts.join(' | ')}`);
  }

  // === 2. AI extraction grounded ONLY in the corpus ===
  // Incremental runs start from the previous knowledge so a small delta can enrich
  // it without re-reading everything; full runs start empty.
  let extraction: { actors: string[]; themes: string[]; trends: string[]; tone: string; summary: string } = {
    actors: (Array.isArray(prevData.actors) ? prevData.actors : []).slice(),
    themes: (Array.isArray(prevData.themes) ? prevData.themes : []).slice(),
    trends: (Array.isArray(prevData.trends) ? prevData.trends : []).slice(),
    tone: prevData.tone || '',
    summary: prevData.summary || '',
  };

  if (corpus.length && isAiConfigured()) {
    try {
      const system = 'Sei un analista di contenuti social. Rispondi SOLO con JSON valido. Basati ESCLUSIVAMENTE sui contenuti forniti: non inventare persone, temi o tendenze che non compaiono nel testo.';
      const prevBlock = incremental
        ? `Conoscenza già raccolta in precedenza (mantienila e arricchiscila; non cancellare attori/temi già noti a meno che i nuovi contenuti li contraddicano):
- attori: ${extraction.actors.join(', ') || 'nessuno'}
- temi: ${extraction.themes.join(', ') || 'nessuno'}
- tendenze: ${extraction.trends.join(', ') || 'nessuna'}
- tono: ${extraction.tone || 'n/d'}
- riepilogo: ${extraction.summary || 'n/d'}`
        : '';
      const contentLabel = incremental ? 'NUOVI contenuti reali (post e reel, dall\'ultimo aggiornamento)' : 'contenuti reali (post e reel)';
      const user = `Analizza i ${contentLabel} del cliente "${name}" e ${incremental ? 'aggiorna' : 'ricava'}:
- "actors": le persone citate o protagoniste (es. "Davide - agente"), solo se compaiono davvero nei testi.
- "themes": i temi/argomenti ricorrenti realmente trattati.
- "trends": 1-2 tendenze di contenuto che emergono dai testi.
- "tone": tono di voce che emerge (1 frase).
- "summary": riepilogo 2-3 frasi basato sui contenuti.

${prevBlock}
Contenuti:
${corpus.map(c => `- ${c.slice(0, 500)}`).join('\n').slice(0, 12000)}

Rispondi con JSON:
{"actors":["nome - ruolo"],"themes":["tema"],"trends":["tendenza"],"tone":"tono","summary":"riepilogo"}`;
      const out = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.3, json: true });
      const parsed = parseJson<any>(out);
      extraction = {
        actors: Array.isArray(parsed.actors) ? parsed.actors : [],
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        trends: Array.isArray(parsed.trends) ? parsed.trends : [],
        tone: parsed.tone || '',
        summary: parsed.summary || '',
      };
    } catch (err: any) {
      console.error('[ai] brief extraction failed', err.message);
    }
  }

  // Fallback: derive themes from the corpus words when AI fails/unconfigured
  if (!extraction.themes.length && corpus.length) {
    const words = new Map<string, number>();
    const stop = new Set(['per','che','con','una','del','della','delle','dei','gli','il','lo','la','le','un','uno','in','di','da','su','a','e','è','sono','non','più','come','cosa','tuo','tuoi','nostro','nostri']);
    for (const c of corpus) {
      for (const w of c.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/)) {
        if (w.length > 4 && !stop.has(w)) words.set(w, (words.get(w) || 0) + 1);
      }
    }
    extraction.themes = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
  }

  // === 3. Deterministic signals (cheap DB aggregation, no LLM) ===
  const bestHours = Object.entries(perf.postsByHour)
    .map(([hour, v]) => ({ hour: parseInt(hour), count: v.count, likes: v.likes, engagement: v.engagement }))
    .sort((a, b) => (b.engagement || b.likes || b.count) - (a.engagement || a.likes || a.count))
    .slice(0, 5);

  const crossClientBestHours: { hour: number; source: string; engagement: number }[] = [];
  const crossClientHashtags: string[] = [];
  const myHashtags = new Set(perf.topHashtags.map(h => h.hashtag));
  const myHours = new Set(bestHours.map(h => h.hour));

  for (const c of allContacts) {
    if (c.id === contactId) continue;
    try {
      const other = await clientPostingPerformance(c.id);
      const otherBest = Object.entries(other.postsByHour)
        .map(([hour, v]) => ({ hour: parseInt(hour), engagement: v.engagement || v.likes || v.count, count: v.count }))
        .sort((a, b) => b.engagement - a.engagement)[0];
      if (otherBest && !myHours.has(otherBest.hour)) {
        crossClientBestHours.push({ hour: otherBest.hour, source: c.name, engagement: otherBest.engagement });
      }
      for (const h of other.topHashtags.slice(0, 3)) {
        if (!myHashtags.has(h.hashtag)) crossClientHashtags.push(h.hashtag);
      }
    } catch { /* skip */ }
  }

  const aiData = {
    actors: extraction.actors.slice(0, 20),
    themes: extraction.themes.slice(0, 20),
    trends: extraction.trends.slice(0, 10),
    tone: extraction.tone,
    summary: extraction.summary,
    contentCount: totalCount,
    bestTimes: bestHours,
    topHashtags: perf.topHashtags.slice(0, 10),
    postTypes: perf.postTypes,
    crossClient: {
      bestHours: crossClientBestHours.slice(0, 5),
      hashtags: [...new Set(crossClientHashtags)].slice(0, 10),
    },
    // Watermark for the incremental weekly refresh
    lastSyncedAt: now.toISOString(),
    syncedPostCount: totalCount,
  };

  const updated = await prisma.socialClientBrief.upsert({
    where: { contactId },
    create: {
      contactId,
      tone: brief?.tone || extraction.tone || '',
      audience: brief?.audience || '',
      goals: brief?.goals || '',
      aiData,
      aiUpdatedAt: now,
    },
    update: {
      aiData,
      aiUpdatedAt: now,
    },
  });

  return updated;
}

/**
 * Cross-client smart suggestions for analytics: recommend changing posting times
 * because they worked for another client, trying different hashtags, etc.
 */
export async function generateSmartSuggestions(contactId: number): Promise<{
  suggestions: { type: string; title: string; detail: string }[];
  hasData: boolean;
}> {
  const my = await clientPostingPerformance(contactId);
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true } });

  const otherClients = await prisma.contact.findMany({
    where: {
      id: { not: contactId },
      socialPosts: { some: { status: 'PUBLISHED' } },
    },
    select: { id: true, name: true },
    take: 30,
  });

  const suggestions: { type: string; title: string; detail: string }[] = [];
  const myHours = new Set(Object.keys(my.postsByHour).map(Number));
  const myHashtags = new Set(my.topHashtags.map(h => h.hashtag));
  const myTypes = new Set(Object.keys(my.postTypes));

  // Best hours on other clients that I'm not already using — ONLY when there's real engagement
  const otherBestHours: { hour: number; source: string; engagement: number }[] = [];
  const otherHashtags = new Set<string>();
  const otherTypes: Record<string, { count: number; source: string }> = {};

  for (const c of otherClients) {
    try {
      const other = await clientPostingPerformance(c.id);
      // Only consider time suggestions from clients that actually have engagement data
      if (other.hasEngagement) {
        const best = Object.entries(other.postsByHour)
          .map(([hour, v]) => ({ hour: parseInt(hour), engagement: v.engagement || v.likes }))
          .filter(x => x.engagement > 0)
          .sort((a, b) => b.engagement - a.engagement)[0];
        if (best && !myHours.has(best.hour)) {
          otherBestHours.push({ hour: best.hour, source: c.name, engagement: best.engagement });
        }
      }
      for (const h of other.topHashtags.slice(0, 5)) if (!myHashtags.has(h.hashtag)) otherHashtags.add(h.hashtag);
      for (const [type, count] of Object.entries(other.postTypes)) {
        if (count > 3 && !otherTypes[type]) otherTypes[type] = { count, source: c.name };
      }
    } catch { /* skip */ }
  }

  otherBestHours.sort((a, b) => b.engagement - a.engagement);
  for (const h of otherBestHours.slice(0, 3)) {
    suggestions.push({
      type: 'time',
      title: `Prova a pubblicare alle ${h.hour}:00`,
      detail: `Sul cliente "${h.source}" l'orario ${h.hour}:00 ha portato i migliori risultati (${Math.round(h.engagement)} interazioni). Potrebbe funzionare anche per ${contact?.name || 'questo cliente'}.`,
    });
  }

  const newHashtags = [...otherHashtags].slice(0, 5);
  if (newHashtags.length) {
    suggestions.push({
      type: 'hashtags',
      title: 'Sperimenta nuovi hashtag',
      detail: `Altri clienti usano con successo: ${newHashtags.join(', ')}. Considera di aggiungerli ai tuoi prossimi post.`,
    });
  }

  const newTypes = Object.entries(otherTypes).sort((a, b) => b[1].count - a[1].count).slice(0, 2);
  for (const [type, info] of newTypes) {
    if (!myTypes.has(type)) {
      suggestions.push({
        type: 'format',
        title: `Formato ${type.toLowerCase()} da esplorare`,
        detail: `Il cliente "${info.source}" pubblica molti ${type} (${info.count}). Potresti provare questo formato per diversificare.`,
      });
    }
  }

  // Fallback time suggestion only when THIS client has real engagement data
  if (!suggestions.length && my.hasEngagement) {
    const bestHour = Object.entries(my.postsByHour)
      .map(([hour, v]) => ({ hour: parseInt(hour), engagement: v.engagement || v.likes }))
      .filter(x => x.engagement > 0)
      .sort((a, b) => b.engagement - a.engagement)[0];
    if (bestHour) {
      suggestions.push({
        type: 'time',
        title: `Consolida l'orario ${bestHour.hour}:00`,
        detail: `È già il tuo orario migliore. Mantienilo e testa anche il giorno successivo alla stessa ora.`,
      });
    }
  }

  return { suggestions, hasData: suggestions.length > 0 };
}
