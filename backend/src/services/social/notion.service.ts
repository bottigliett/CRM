/**
 * Notion import service — READ-ONLY.
 *
 * This service ONLY reads from Notion (search / database query / block children).
 * It NEVER writes, updates or deletes anything on Notion. All mutations happen
 * locally in the CRM (creating IDEA posts).
 */
import prisma from '../../config/database';

const NOTION_TOKEN = () => process.env.NOTION_TOKEN || '';
const NOTION_VERSION = '2022-06-28';

async function nfetch(url: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

const qdb = (id: string) => nfetch(`https://api.notion.com/v1/databases/${id}/query`, { method: 'POST', body: JSON.stringify({ page_size: 100 }) });

/** Query ALL rows of a database with full pagination. */
async function qdbAll(id: string): Promise<any[]> {
  const all: any[] = [];
  let cursor: string | undefined;
  do {
    const body: any = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
    const j = await nfetch(`https://api.notion.com/v1/databases/${id}/query`, { method: 'POST', body: JSON.stringify(body) });
    all.push(...(j.results || []));
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return all;
}
const dbMeta = (id: string) => nfetch(`https://api.notion.com/v1/databases/${id}`);
const children = (id: string) => nfetch(`https://api.notion.com/v1/blocks/${id}/children?page_size=100`);

const titleOf = (p: any) => (Array.isArray(p?.title) ? p.title.map((t: any) => t.plain_text).join('') : '');
const richOf = (p: any) => (Array.isArray(p?.rich_text) ? p.rich_text.map((t: any) => t.plain_text).join('') : '');
const multi = (p: any) => (Array.isArray(p?.multi_select) ? p.multi_select.map((t: any) => t.name) : []);

async function getChildDb(pageId: string): Promise<{ id: string; title: string } | null> {
  const c = await children(pageId);
  for (const b of c.results) {
    if (b.type === 'child_database') return { id: b.id, title: titleOf(b.child_database) };
  }
  return null;
}

function postsFields(props: string[]): boolean {
  return props.includes('Data di pubblicazione') || props.includes('Data') || props.includes('Status') || props.includes('Formato') || props.includes('Tipologia contenuto');
}

export interface NotionPost {
  notionId: string;
  title: string;
  date: string | null;
  status: string | null;
  formato: string[];
  piattaforma: string[];
  categoria: string[];
  fase: string | null;
  obiettivo: string;
  note: string;
  creativita: string | null;
}

export interface NotionClient {
  category: string;
  clientName: string;
  posts: NotionPost[];
}

const MOTHER_DBS = [
  { id: '25680d0b-4c0e-8040-a600-fd63401b1c0e', name: 'CED Clienti Social Media' },
  { id: '30c80d0b-4c0e-802a-bfea-df896a9a4ece', name: 'CED Tecnocasa' }, // duplicate of Tecnocasa Residenziale
  { id: '30c80d0b-4c0e-8000-9b9f-fde72ffdd0cd', name: 'CED Tecnocasa Impresa' }, // duplicate of Tecnocasa Impresa
];

const DUPLICATE_MOTHERS = new Set(['CED Tecnocasa', 'CED Tecnocasa Impresa']);

/** Recursive scan of the whole CED tree (read-only). Returns deduplicated clients. */
export async function scanNotionCed(): Promise<NotionClient[]> {
  const token = NOTION_TOKEN();
  if (!token) throw new Error('NOTION_TOKEN non configurato nel backend/.env');

  const clients: NotionClient[] = [];

  for (const m of MOTHER_DBS) {
    const rows = await qdbAll(m.id);
    for (const row of rows) {
      const brand = titleOf(row.properties?.Name) || '(senza nome)';
      const cdb = await getChildDb(row.id);
      if (!cdb) continue;

      const meta = await dbMeta(cdb.id);
      const props = Object.keys(meta.properties || {});

      if (postsFields(props)) {
        // brand IS a client with posts directly (only if not a duplicate mother)
        if (!DUPLICATE_MOTHERS.has(m.name)) {
          const pRows = await qdbAll(cdb.id);
          const posts = pRows.map((r: any) => normPost(r)).filter((p: NotionPost) => p.title);
          clients.push({ category: m.name, clientName: brand, posts });
        }
      } else {
        // brand is a category: its rows are offices (clients)
        const oRows = await qdbAll(cdb.id);
        for (const orow of oRows) {
          const office = titleOf(orow.properties?.Name) || '(senza nome)';
          const odb = await getChildDb(orow.id);
          let posts: NotionPost[] = [];
          if (odb) {
            const pr = await qdbAll(odb.id);
            posts = pr.map((r: any) => normPost(r)).filter((p: NotionPost) => p.title);
          }
          clients.push({ category: brand, clientName: office, posts });
        }
      }
    }
  }

  return clients;
}

function normPost(r: any): NotionPost {
  const p = r.properties || {};
  return {
    notionId: r.id,
    title: titleOf(p.Name) || titleOf(p['Tipologia contenuto']),
    date: (p['Data di pubblicazione']?.date || p['Data']?.date || {}).start || null,
    status: p.Status?.status?.name || null,
    formato: multi(p.Formato).length ? multi(p.Formato) : multi(p['Tipologia contenuto']),
    piattaforma: multi(p.Piattaforma),
    categoria: multi(p.Categoria),
    fase: p.Fase?.select?.name || richOf(p.Fase) || null,
    obiettivo: richOf(p.Obiettivo),
    note: richOf(p.Note),
    creativita: p['Creatività']?.url || p['Creativita']?.url || null,
  };
}

// === Mapping Notion → Mismo ===

const STATUS_MAP: Record<string, string> = {
  'Idea': 'Idea',
  'Da fare': 'Da fare',
  'Da preparare': 'Da fare',
  'In bozza': 'Da fare',
  'Grafiche pronte': 'Da fare',
  'Video girato': 'Da fare',
  'In lavorazione': 'Da fare',
  'In attesa di approvazione': 'Da fare',
  'Programmato': 'Programmato',
  'Pubblicato': 'Pubblicato',
  'Archiviato': 'Archiviato',
};

/** Parse a Notion date string (date-only "YYYY-MM-DD" or full ISO timestamp) → Date, or null if invalid. */
function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = d.length <= 10 ? new Date(`${d}T12:00:00`) : new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function mapStatus(s: string | null): string {
  if (!s) return 'Idea';
  return STATUS_MAP[s.trim()] || 'Idea';
}

function mapPostType(formato: string[]): string {
  const f = formato.map(x => x.toLowerCase()).join(' ');
  if (f.includes('caros')) return 'CAROUSEL';
  if (f.includes('reel')) return 'REEL';
  if (f.includes('storia') || f.includes('story')) return 'STORY';
  // immagine/foto/articolo/post singolo → POST
  return 'POST';
}

const PLATFORM_MAP: Record<string, string> = {
  'facebook': 'FACEBOOK',
  'instagram': 'INSTAGRAM',
  'linkedin': 'LINKEDIN',
  'tiktok': 'TIKTOK',
};

function mapPlatforms(piattaforma: string[]): string[] {
  const out: string[] = [];
  for (const p of piattaforma) {
    const key = p.toLowerCase().trim();
    if (PLATFORM_MAP[key] && !out.includes(PLATFORM_MAP[key])) out.push(PLATFORM_MAP[key]);
  }
  return out;
}

// Explicit override map: Notion client name (normalized) → CRM contact name.
// Built from the user's confirmed matching decisions.
const CLIENT_MATCH_OVERRIDES: Record<string, string> = {
  'tecnorete castel d\'azzano': 'Immobiliare Castel D\'Azzano Srl',
  'tecnocasa pescantina': 'Immobiliare Pescantina Srl',
  'tecnorete valpolicella': 'Immobiliare Valpo Srl',
  'tecnocasa vigasio': 'Immobiliare Vigasio Srl',
  'tecnorete villafranca di verona': 'Immobiliare Villafranca SRL (Alexandru Adam)',
  'tecnorete sommacampagna': 'Tecnorete Sommacampagna (Alexandru Adam)',
  'tecnocasa manerbio residenziale': 'Tecnomanerbio Srl',
  'tecnocasa bardolino': 'Studio Bardolino SRL',
  'tecnocasa isola della scala': 'MAD Sas (Giovanni Tomasetto)',
  'manerbio industriale': 'Studio Industriale Srl',
  'tecnocasa impresa piacenza': 'Industriale Piacenza SRL',
  'tecnocasa impresa crema': 'Industriale Crema S.r.l.',
  'tecnocasa impresa cremona': 'Industriale Cremona SRL',
  'valedent': 'ValeDent (Serimedical S.R.L.)',
  'paghesolution': 'PagheSolution',
  'mismo': 'MISMO',
  'tecnorete industriale castiglione d/s': 'Industriale Castiglione SRL (Tecnorete Industriale)',
  'tecnorete impresa brescia est': 'Brixia Industriale SRL (Tecnorete Industriale)',
  'tecnocasa impresa desenzano d/g': 'Industriale Desenzano SRL (Tecnocasa Industriale)',
};

const CLIENT_EXCLUDED = new Set(['tecnocasa borgo roma']);

// Folder (Notion category) per client. Direct clients (ValeDent, PagheSolution, MISMO)
// get their own folder named after the brand.
function folderFor(client: NotionClient): string {
  const key = normalize(client.clientName);
  // Direct clients whose "category" is the mother DB name → own folder
  if (client.category === 'CED Clienti Social Media') {
    return client.clientName;
  }
  return client.category;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[’'`]/g, "'")
    .replace(/®|™/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match a Notion client name to a CRM contact id. Returns null if unresolved. */
async function matchClient(notionName: string): Promise<{ contactId: number; name: string } | null> {
  const key = normalize(notionName);

  if (CLIENT_EXCLUDED.has(key)) return null;

  // 1) explicit override
  if (CLIENT_MATCH_OVERRIDES[key]) {
    const c = await prisma.contact.findFirst({ where: { name: CLIENT_MATCH_OVERRIDES[key] } });
    if (c) return { contactId: c.id, name: c.name };
  }

  // 2) build a map of normalized CRM contact names → id
  const contacts = await prisma.contact.findMany({ select: { id: true, name: true } });
  const byNorm = new Map<string, { id: number; name: string }>();
  for (const c of contacts) byNorm.set(normalize(c.name), { id: c.id, name: c.name });

  // 3) exact normalized match
  if (byNorm.has(key)) return { contactId: byNorm.get(key)!.id, name: byNorm.get(key)!.name };

  // 4) fuzzy: strip legal suffixes and match city/brand tokens
  const tokens = key.replace(/s\.r\.l\.?|srl|spa|s\.p\.a\.?/g, ' ').split(/\s+/).filter(t => t.length > 2);
  for (const [normName, v] of byNorm) {
    const nt = normName.replace(/s\.r\.l\.?|srl|spa|s\.p\.a\.?/g, ' ').split(/\s+/).filter(t => t.length > 2);
    const overlap = tokens.filter(t => nt.includes(t)).length;
    if (tokens.length && overlap >= Math.min(tokens.length, 2)) return { contactId: v.id, name: v.name };
  }

  return null;
}

/** Map Notion category (folder) to a Mismo idea category when it differs from the post-level category. */
export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  unmatchedClients: string[];
  byClient: { client: string; contact: string; imported: number }[];
}

export async function importNotionCed(): Promise<ImportResult> {
  const clients = await scanNotionCed();

  const result: ImportResult = { total: 0, imported: 0, skipped: 0, unmatchedClients: [], byClient: [] };

  for (const client of clients) {
    const match = await matchClient(client.clientName);
    if (!match) {
      result.unmatchedClients.push(client.clientName);
      result.total += client.posts.length;
      result.skipped += client.posts.length;
      continue;
    }

    // Register the contact as a social client with its folder (Notion category).
    // Idempotent upsert — keeps existing configs (accounts, approval settings) intact.
    await prisma.socialClientConfig.upsert({
      where: { contactId: match.contactId },
      create: { contactId: match.contactId, folder: folderFor(client) },
      update: { folder: folderFor(client) },
    });

    let imported = 0;
    for (const post of client.posts) {
      result.total++;
      // Idempotency: skip if already imported (tracked in metadata.notionId)
      const existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM social_posts WHERE contact_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.notionId')) = ? LIMIT 1`,
        match.contactId,
        post.notionId
      ) as Array<{ id: number }>;
      if (existing.length) {
        result.skipped++;
        continue;
      }

      const categories = post.categoria.filter((c: string) => c.trim());
      await prisma.socialPost.create({
        data: {
          contactId: match.contactId,
          content: post.title,
          postType: mapPostType(post.formato) as any,
          stage: 'IDEA',
          ideaCategory: categories.length ? JSON.stringify(categories) : undefined,
          ideaStatus: mapStatus(post.status),
          ideaPhase: post.fase || undefined,
          scheduledAt: parseDate(post.date) || undefined,
          platformContent: { platforms: mapPlatforms(post.piattaforma || []) },
          ideaObiettivo: post.obiettivo || undefined,
          ideaNotes: post.note || undefined,
          ideaCreativita: post.creativita || undefined,
          createdById: 1,
          metadata: { notionId: post.notionId },
        },
      });
      imported++;
    }

    result.imported += imported;
    result.byClient.push({ client: client.clientName, contact: match.name, imported });
  }

  return result;
}
