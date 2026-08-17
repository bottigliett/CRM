/**
 * TikTok Browser Uploader — publish videos via Playwright browser automation.
 * Ported from AutoSocial/src/tiktok-uploader.js.
 */
import { Page, BrowserContext } from 'playwright';
import path from 'path';
import { getOrCreateContext, closeContext } from './browser-session.service';
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
      await page.waitForTimeout(250);
      await el.click({ timeout: 5000 });
      return true;
    } catch {
      try { await el.click({ timeout: 5000, force: true }); return true; } catch { /* next */ }
    }
  }
  return false;
}

function normalizeText(value: string): string {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// --- Upload flow ---

async function setVideoFile(page: Page, videoPath: string): Promise<void> {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: 'attached', timeout: 120_000 });
  await fileInput.setInputFiles(videoPath);
}

async function setCaption(page: Page, caption: string): Promise<void> {
  if (!caption) return;
  const candidates = [
    'div[contenteditable="true"]',
    'textarea[placeholder*="caption" i]',
    'textarea',
  ];
  for (const selector of candidates) {
    const target = page.locator(selector).first();
    if ((await target.count()) === 0) continue;
    try {
      await target.click({ timeout: 8000 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await target.type(caption, { delay: 10 });
      return;
    } catch { /* next */ }
  }
}

async function dismissOverlays(page: Page): Promise<void> {
  // Dismiss cancel button
  await page.getByRole('button', { name: ui.pattern('tiktokCancel') })
    .click({ timeout: 800 }).catch(() => {});

  const overlayActions = [
    ui.pattern('tiktokEnable'),
    ui.pattern('tiktokContinue'),
    ui.pattern('tiktokLater'),
    ui.pattern('tiktokClose'),
  ];

  for (let pass = 0; pass < 3; pass++) {
    let clicked = false;
    for (const action of overlayActions) {
      const btn = page.getByRole('button', { name: action }).first();
      if ((await btn.count()) > 0) {
        try { await btn.click({ timeout: 1200 }); clicked = true; await page.waitForTimeout(400); } catch {}
      }
    }
    if (!clicked) break;
  }
}

async function clickPublish(page: Page): Promise<void> {
  await dismissOverlays(page);

  for (let attempt = 0; attempt < 6; attempt++) {
    // eslint-disable-next-line no-eval
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(500);

    // Try text selectors
    const selectors = [
      ui.textSelector('button', 'tiktokPublish'),
      ui.textSelector('[role="button"]', 'tiktokPublish'),
    ];
    for (const sel of selectors) {
      if (await clickFirstVisible(page, page.locator(sel))) return;
    }

    // Try role-based
    const roleBtn = page.getByRole('button', { name: ui.pattern('tiktokPublish') });
    if (await clickFirstVisible(page, roleBtn)) return;

    // Try CSS
    for (const css of ['button[class*="publish" i]', 'button[class*="post-btn" i]', 'button[class*="submit" i]']) {
      if (await clickFirstVisible(page, page.locator(css))) return;
    }

    await dismissOverlays(page);
    await page.waitForTimeout(2000);
  }

  throw new Error('Could not find an enabled Publish/Post button after 6 attempts.');
}

async function waitForConfirmation(page: Page): Promise<{ ok: boolean; reason: string }> {
  const startedUrl = page.url();
  const successPattern = ui.pattern('tiktokPublished');
  const failPattern = ui.pattern('tiktokFailed');

  for (let i = 0; i < 30; i++) {
    await dismissOverlays(page);
    const text = await page.locator('body').innerText().catch(() => '');

    if (failPattern.test(text)) {
      return { ok: false, reason: 'TikTok displayed an error after publish.' };
    }
    if (successPattern.test(text)) {
      return { ok: true, reason: 'Success text found.' };
    }

    // Try secondary confirm dialogs
    const confirmPattern = ui.pattern('tiktokConfirm');
    const confirmBtn = page.locator("[role='dialog'] button, [aria-modal='true'] button")
      .filter({ hasText: confirmPattern });
    await clickFirstVisible(page, confirmBtn);

    // URL change = published
    if (page.url() !== startedUrl && !page.url().includes('/upload')) {
      return { ok: true, reason: 'Navigation changed after publish.' };
    }

    await page.waitForTimeout(2000);
  }

  return { ok: false, reason: 'No publish confirmation within timeout.' };
}

// --- Public API ---

export async function uploadToTikTok(
  socialAccountId: number,
  videoPath: string,
  caption: string
): Promise<BrowserPublishResult> {
  const context = await getOrCreateContext(socialAccountId, 'tiktok');
  const page = context.pages()[0] || await context.newPage();

  try {
    await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded' });
    await setVideoFile(page, path.resolve(videoPath));
    await page.waitForTimeout(5000); // Wait for upload processing
    await setCaption(page, caption);
    await clickPublish(page);
    const confirmation = await waitForConfirmation(page);

    if (!confirmation.ok) {
      throw new Error(`Publish failed: ${confirmation.reason}`);
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
  // ponytail: don't close context — keep session alive for reuse
}
