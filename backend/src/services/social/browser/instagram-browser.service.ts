/**
 * Instagram Browser Uploader — publish via Playwright browser automation.
 * Ported from AutoSocial/src/instagram-uploader.js.
 */
import { Page } from 'playwright';
import path from 'path';
import { getOrCreateContext } from './browser-session.service';
import * as ui from './ui-labels';

export interface BrowserPublishResult {
  ok: boolean;
  error?: string;
}

// --- Helpers ---

async function clickFirstVisible(page: Page, locator: ReturnType<Page['locator']>): Promise<boolean> {
  const total = await locator.count();
  for (let i = 0; i < total; i++) {
    const el = locator.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    if (await el.isDisabled().catch(() => false)) continue;
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 3000 });
      await el.click({ timeout: 5000 });
      return true;
    } catch {
      try { await el.click({ timeout: 5000, force: true }); return true; } catch { /* next */ }
    }
  }
  return false;
}

/** Navigate with retry + exponential backoff for 429s. */
async function navigateWithRetry(page: Page, url: string, maxRetries = 3): Promise<void> {
  const backoffMs = [5000, 15000, 30000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (response && response.status() === 429) {
        throw new Error('HTTP 429 - Instagram rate limit');
      }
      await page.waitForTimeout(1500 + Math.random() * 2000);
      return;
    } catch (err: any) {
      if (attempt >= maxRetries) throw err;
      const delay = backoffMs[attempt] || 30000;
      console.log(`[ig-browser] Nav failed (${attempt + 1}/${maxRetries + 1}): ${err.message}. Retrying in ${delay / 1000}s`);
      await page.waitForTimeout(delay);
    }
  }
}

// --- Upload flow ---

async function ensureCreateFlow(page: Page): Promise<void> {
  // If the create dialog is already open (has the "Select from computer" trigger), skip
  const selectPattern = ui.pattern('instagramUploadTrigger');
  if ((await page.getByRole('button', { name: selectPattern }).count()) > 0) return;

  const createPattern = ui.pattern('create');
  const entryPoints = [
    page.getByRole('link', { name: createPattern }),
    page.getByRole('button', { name: createPattern }),
    page.locator('nav a, nav button, nav [role="button"]').filter({ hasText: createPattern }),
  ];

  for (const entry of entryPoints) {
    if (await clickFirstVisible(page, entry)) {
      await page.waitForTimeout(1500);
      return;
    }
  }
}

async function setFiles(page: Page, filePaths: string[]): Promise<void> {
  await ensureCreateFlow(page);

  // Click "Select from computer" and capture the native file chooser
  const selectPattern = ui.pattern('instagramUploadTrigger');
  const selectBtn = page.getByRole('button', { name: selectPattern }).first();
  await selectBtn.waitFor({ state: 'visible', timeout: 30000 });
  const fcPromise = page.waitForEvent('filechooser', { timeout: 30000 });
  await selectBtn.click({ timeout: 15000 });
  const fileChooser = await fcPromise;
  // Multiple files = carousel
  await fileChooser.setFiles(filePaths.map(f => path.resolve(f)));
}

async function clickNextButtons(page: Page): Promise<void> {
  const nextBtn = page.getByRole('button', { name: ui.pattern('next') });
  for (let pass = 0; pass < 3; pass++) {
    if (!(await clickFirstVisible(page, nextBtn))) break;
    await page.waitForTimeout(1200);
  }
}

async function setCaption(page: Page, caption: string): Promise<void> {
  if (!caption) return;
  // Instagram's caption field is a contenteditable div exposed as role=textbox with aria-label "Write a caption..."
  const captionPattern = ui.pattern('captionAttribute');
  const target = page.getByRole('textbox', { name: captionPattern }).first();
  if ((await target.count()) === 0) return;
  try {
    await target.click({ timeout: 8000 });
    // Select-all + clear, then type real keystrokes so Instagram registers the input
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(caption, { delay: 12 });
  } catch { /* caption is best-effort */ }
}

async function clickShare(page: Page): Promise<boolean> {
  const sharePattern = ui.pattern('share');
  const locators = [
    page.getByRole('button', { name: sharePattern }),
    page.locator('button').filter({ hasText: sharePattern }),
    page.locator('[role="button"]').filter({ hasText: sharePattern }),
  ];
  for (const loc of locators) {
    if (await clickFirstVisible(page, loc)) return true;
  }
  return false;
}

async function waitForConfirmation(page: Page, startedUrl: string): Promise<{ ok: boolean; reason: string }> {
  const postedPattern = ui.pattern('posted');
  const errorPattern = ui.pattern('error');
  const challengePattern = ui.pattern('botChallenge');

  for (let i = 0; i < 60; i++) {
    const text = await page.locator('body').innerText().catch(() => '');
    // Bot / challenge detection FIRST — Instagram often blocks silently otherwise
    if (challengePattern.test(text)) {
      return { ok: false, reason: 'Instagram ha richiesto una verifica (attività sospette rilevate).' };
    }
    if (errorPattern.test(text)) return { ok: false, reason: 'Instagram reported an error.' };
    if (postedPattern.test(text)) return { ok: true, reason: 'Success text found.' };

    if (page.url() !== startedUrl && !/\/create\//i.test(page.url())) {
      return { ok: true, reason: 'Navigation changed after share.' };
    }
    await page.waitForTimeout(1500);
  }
  return { ok: false, reason: 'No confirmation within timeout.' };
}

/** Read the profile post count (e.g. "4 posts") from the currently-loaded page. */
async function getProfilePostCount(page: Page): Promise<number> {
  const text = await page.locator('body').innerText().catch(() => '');
  const m = text.match(/(\d+)\s+posts?\b/i);
  return m ? parseInt(m[1], 10) : -1;
}

// --- Public API ---

export async function uploadToInstagram(
  socialAccountId: number,
  filePaths: string[],
  caption: string
): Promise<BrowserPublishResult> {
  const context = await getOrCreateContext(socialAccountId, 'instagram');
  const page = context.pages()[0] || await context.newPage();

  try {
    await navigateWithRetry(page, 'https://www.instagram.com/');
    await page.waitForTimeout(2000);

    // Capture pre-publish post count from the profile
    const beforeCount = await getProfilePostCount(page);

    await setFiles(page, filePaths);
    await page.waitForTimeout(6000);
    await clickNextButtons(page);
    await setCaption(page, caption);

    const startedUrl = page.url();
    if (!(await clickShare(page))) {
      throw new Error('Could not find/click Instagram Share button.');
    }

    const confirmation = await waitForConfirmation(page, startedUrl);
    if (!confirmation.ok) {
      throw new Error(confirmation.reason);
    }

    // Post-publish verification: the profile post count must actually increase,
    // otherwise Instagram silently blocked the post (anti-bot / challenge).
    const afterCount = await getProfilePostCount(page);
    if (beforeCount >= 0 && afterCount >= 0 && afterCount <= beforeCount) {
      throw new Error('Pubblicazione non confermata: Instagram potrebbe aver bloccato il post (verifica anti-bot richiesta).');
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
