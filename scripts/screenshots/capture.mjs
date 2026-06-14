// scripts/screenshots/capture.mjs
// Generates the documentation screenshots in docs/screenshots/ from a curated,
// synthetic POTA feed — no live data, no real callsigns. Playwright is a dev-only
// tool and is intentionally NOT a dependency in package.json (see README in this
// folder). Run:
//
//   npm i --no-save playwright        # or: npx playwright install chromium
//   node scripts/screenshots/capture.mjs
//
// It boots the real src/server.js, intercepts the api.pota.app calls (and the
// same-origin /api/hamlog/health probe so the "Also log to HamLog" box appears),
// then drives the UI through each state and shoots it.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { buildFeed, buildProfile } from './synthetic-feed.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const OUT = join(root, 'docs', 'screenshots');
const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
const { spots, hunted } = buildFeed();

function json(route, body) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function main() {
  // 1. boot the real server
  const server = spawn('node', ['src/server.js'], {
    cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
  });
  await sleep(1200);

  // Use the system-installed Google Chrome (channel) — avoids downloading a
  // bundled browser, which has no build for very new Linux distros.
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Pre-seed settings so the board shows a full, attractive grid (defaults filter
  // to Band 20M / Mode Phone). Runs before the page's restore() reads localStorage.
  await page.addInitScript(() => {
    const s = { pota_band: 'ALL', pota_mode: 'ALL', pota_program: 'all',
      pota_qrt: 'hide', pota_hunted: 'hide', pota_sortField: 'time',
      pota_sortDir: 'desc', pota_basemap: 'color', pota_mapZoom: '6', pota_ovOpen: '0' };
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  });

  // 2. intercept POTA + the HamLog health probe (so nothing live is hit)
  await page.route('**/spot/activator*', r => json(r, spots));
  await page.route('**/spot/hunted/**', r => json(r, hunted));
  await page.route('**/stats/user/**', r => {
    const call = decodeURIComponent(r.request().url().split('/').pop().split('?')[0]);
    return json(r, buildProfile(call));
  });
  await page.route('**/api/hamlog/health', r => json(r, { ok: true }));

  const shots = [];
  const shoot = async (name, opts = {}) => {
    await page.screenshot({ path: join(OUT, name), ...opts });
    shots.push(name);
  };

  // 3. load and wait for the board
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.spot');
  await sleep(2500); // let map tiles + fonts settle

  await shoot('01-board-dark.png');

  // filter dropdown open (Band)
  try {
    await page.locator('#filters .fpill').first().click();
    await sleep(400);
    await shoot('03-filters.png');
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('#filters .fpill').first().click().catch(() => {}); // close
    await sleep(200);
  } catch (e) { console.error('filters shot failed:', e.message); }

  // single spot card close-up
  try { await page.locator('.spot').first().screenshot({ path: join(OUT, '04-spot-card.png') }); shots.push('04-spot-card.png'); }
  catch (e) { console.error('card shot failed:', e.message); }

  // operator profile card (hover a callsign)
  try {
    await page.locator('.scall').first().hover();
    await page.waitForSelector('#opCard', { state: 'visible', timeout: 4000 });
    await sleep(700);
    await shoot('05-operator-card.png');
    await page.mouse.move(10, 10); await sleep(200);
  } catch (e) { console.error('operator card failed:', e.message); }

  // park map hover preview
  try {
    await page.locator('.map').first().hover();
    await sleep(1200);
    await shoot('06-map-hover.png');
    await page.mouse.move(10, 10); await sleep(200);
  } catch (e) { console.error('map hover failed:', e.message); }

  // overview map panel (expand it first — the board hero keeps it collapsed)
  try {
    await page.locator('#ovToggle').click();
    await sleep(800);
    await page.locator('#ovFit').click().catch(() => {});
    await sleep(1800);
    await page.locator('#overview').screenshot({ path: join(OUT, '07-overview-map.png') });
    shots.push('07-overview-map.png');
    await page.locator('#ovToggle').click(); // collapse again
    await sleep(400);
  } catch (e) { console.error('overview failed:', e.message); }

  // map zoom modal (click a mini-map)
  try {
    await page.locator('.map').first().click();
    await page.waitForSelector('#mapModal.open', { timeout: 4000 });
    await sleep(2200);
    await shoot('08-map-modal.png');
    await page.keyboard.press('Escape'); await sleep(400);
  } catch (e) { console.error('map modal failed:', e.message); }

  // re-spot modal (with the HamLog checkbox visible)
  try {
    await page.locator('.respotbtn').first().click();
    await page.waitForSelector('#spotModal.open', { timeout: 4000 });
    await page.waitForSelector('#spHamlogRow:not([hidden])', { timeout: 4000 }).catch(() => {});
    await sleep(500);
    await shoot('09-respot-modal.png');
    await page.locator('#spCancel').click(); await sleep(400);
  } catch (e) { console.error('respot modal failed:', e.message); }

  // add-spot (self-spot) modal
  try {
    await page.locator('#addspot').click();
    await page.waitForSelector('#spotModal.open', { timeout: 4000 });
    await sleep(400);
    await shoot('10-addspot-modal.png');
    await page.locator('#spCancel').click(); await sleep(400);
  } catch (e) { console.error('addspot modal failed:', e.message); }

  // settings panel open
  try {
    await page.locator('#gear').click();
    await sleep(600);
    await shoot('11-settings.png');
    await page.locator('#gear').click(); await sleep(300);
  } catch (e) { console.error('settings failed:', e.message); }

  // light theme board (do last; toggles persist)
  try {
    await page.locator('#theme').click();
    await sleep(1500);
    await shoot('02-board-light.png');
  } catch (e) { console.error('light board failed:', e.message); }

  console.log('captured:', shots.join(', '));
  await browser.close();
  server.kill('SIGTERM');
}

main().catch(err => { console.error(err); process.exit(1); });
