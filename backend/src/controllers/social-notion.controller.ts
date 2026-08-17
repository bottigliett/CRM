import { Request, Response } from 'express';
import { scanNotionCed, importNotionCed } from '../services/social/notion.service';
import prisma from '../config/database';

// Re-export a small matching helper for the preview (mirrors notion.service.matchClient)
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`]/g, "'").replace(/®|™/g, '').replace(/\s+/g, ' ').trim();
}
const OVERRIDES: Record<string, string> = {
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
};

/** POST /api/social/notion/preview — scan Notion (read-only) and show what would be imported + match resolution */
export const notionPreview = async (_req: Request, res: Response) => {
  try {
    const clients = await scanNotionCed();
    const total = clients.reduce((s, c) => s + c.posts.length, 0);

    // resolve matches for reporting (read-only)
    const contacts = await prisma.contact.findMany({ select: { id: true, name: true } });
    const byNorm = new Map(contacts.map(c => [normalize(c.name), { id: c.id, name: c.name }]));
    const excluded = new Set(['tecnocasa borgo roma']);

    const clientsWithMatch = clients.map(c => {
      const key = normalize(c.clientName);
      let match: { id: number; name: string } | null = null;
      if (OVERRIDES[key]) match = byNorm.get(normalize(OVERRIDES[key])) || null;
      else match = byNorm.get(key) || null;
      return {
        category: c.category,
        clientName: c.clientName,
        postCount: c.posts.length,
        excluded: excluded.has(key),
        matched: excluded.has(key) ? null : (match?.name || null),
      };
    });

    res.json({
      success: true,
      data: { totalPosts: total, clients: clientsWithMatch },
    });
  } catch (error: any) {
    console.error('[notion] preview', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/social/notion/import — import all Notion CED posts as local IDEA posts (read-only on Notion) */
export const notionImport = async (_req: Request, res: Response) => {
  try {
    const result = await importNotionCed();
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[notion] import', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
