/**
 * Browser Session Manager — persistent Chromium contexts per social account.
 * Adapted from AutoSocial/src/account-manager.js persistent context pattern.
 */
import { chromium, BrowserContext } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const BROWSER_PROFILES_DIR = process.env.BROWSER_PROFILES_DIR || path.join(process.cwd(), '.browser-profiles');

interface ManagedContext {
  context: BrowserContext;
  socialAccountId: number;
  platform: string;
}

// ponytail: global map, per-account map if concurrency matters
const activeContexts = new Map<string, ManagedContext>();

function contextKey(socialAccountId: number, platform: string): string {
  return `${socialAccountId}:${platform}`;
}

function profileDir(socialAccountId: number, platform: string): string {
  return path.join(BROWSER_PROFILES_DIR, String(socialAccountId), platform.toLowerCase());
}

export async function getOrCreateContext(
  socialAccountId: number,
  platform: string
): Promise<BrowserContext> {
  const key = contextKey(socialAccountId, platform);
  const existing = activeContexts.get(key);
  if (existing) return existing.context;

  const dir = profileDir(socialAccountId, platform);
  await fs.mkdir(dir, { recursive: true });

  const context = await chromium.launchPersistentContext(dir, {
    headless: true,
    viewport: { width: 1400, height: 1000 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  const managed: ManagedContext = { context, socialAccountId, platform };
  activeContexts.set(key, managed);

  context.on('close', () => {
    activeContexts.delete(key);
  });

  return context;
}

export async function closeContext(socialAccountId: number, platform: string): Promise<void> {
  const key = contextKey(socialAccountId, platform);
  const managed = activeContexts.get(key);
  if (!managed) return;
  activeContexts.delete(key);
  await managed.context.close().catch(() => {});
}

export async function getSessionStatus(socialAccountId: number, platform: string): Promise<{ active: boolean; hasSavedProfile: boolean }> {
  const key = contextKey(socialAccountId, platform);
  const active = activeContexts.has(key);

  const dir = profileDir(socialAccountId, platform);
  let hasSavedProfile = false;
  try {
    const cookiePaths = [
      path.join(dir, 'Default', 'Cookies'),
      path.join(dir, 'Cookies'),
      path.join(dir, 'Network', 'Cookies'),
    ];
    for (const p of cookiePaths) {
      try {
        const stat = await fs.stat(p);
        if (stat.isFile() && stat.size > 0) {
          hasSavedProfile = true;
          break;
        }
      } catch {
        // not found, continue
      }
    }
  } catch {
    // dir doesn't exist
  }

  return { active, hasSavedProfile };
}

export async function deleteSession(socialAccountId: number, platform: string): Promise<void> {
  await closeContext(socialAccountId, platform);
  const dir = profileDir(socialAccountId, platform);
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

/** Open a headed browser for manual login. Returns the page URL. */
export async function openLoginBrowser(socialAccountId: number, platform: string): Promise<{ url: string }> {
  // Close any existing context first
  await closeContext(socialAccountId, platform);

  const dir = profileDir(socialAccountId, platform);
  await fs.mkdir(dir, { recursive: true });

  const context = await chromium.launchPersistentContext(dir, {
    headless: false, // Headed for manual login
    viewport: { width: 1400, height: 1000 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
    ],
  });

  const key = contextKey(socialAccountId, platform);
  activeContexts.set(key, { context, socialAccountId, platform });
  context.on('close', () => { activeContexts.delete(key); });

  const page = context.pages()[0] || await context.newPage();
  const urls: Record<string, string> = {
    tiktok: 'https://www.tiktok.com/tiktokstudio/upload',
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
    linkedin: 'https://www.linkedin.com/',
  };
  const targetUrl = urls[platform.toLowerCase()] || 'about:blank';
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  return { url: page.url() };
}

/**
 * Health check — open headless context, load platform, see if we're logged in.
 * Returns true if session appears valid (not redirected to login page).
 */
export async function checkSessionHealth(socialAccountId: number, platform: string): Promise<boolean> {
  const dir = profileDir(socialAccountId, platform);
  let context;
  try {
    context = await chromium.launchPersistentContext(dir, {
      headless: true,
      viewport: { width: 1280, height: 720 },
      args: ['--disable-blink-features=AutomationControlled', '--no-first-run'],
    });
    const page = context.pages()[0] || await context.newPage();

    const checkUrls: Record<string, { url: string; loginIndicators: RegExp[] }> = {
      tiktok: {
        url: 'https://www.tiktok.com/tiktokstudio',
        loginIndicators: [/login/i, /sign.?in/i, /log.?in/i],
      },
      instagram: {
        url: 'https://www.instagram.com/',
        loginIndicators: [/accounts\/login/i, /login/i],
      },
      facebook: {
        url: 'https://www.facebook.com/',
        loginIndicators: [/login/i, /checkpoint/i],
      },
      linkedin: {
        url: 'https://www.linkedin.com/feed/',
        loginIndicators: [/login/i, /signin/i, /authwall/i],
      },
    };

    const check = checkUrls[platform.toLowerCase()];
    if (!check) return false;

    await page.goto(check.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    const isLoggedOut = check.loginIndicators.some(re => re.test(finalUrl));
    return !isLoggedOut;
  } catch {
    return false;
  } finally {
    await context?.close().catch(() => {});
  }
}
