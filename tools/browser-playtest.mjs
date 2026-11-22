// Real-browser playtest for Kebun Terakhir: opens the game in headless
// Chromium, clicks through a real turn, targets a pest, forces a win and
// a loss through the debug hook, and fails on any page error.
// Usage: node tools/browser-playtest.mjs
import { chromium } from '/home/hatch/workspace/repos/prompt-optimizer/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const server = spawn('node', ['serve.ts', '--port', '8124'], { cwd: root, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1200));

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text());
});

const results = [];
const check = (name, ok) => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) errors.push('check failed: ' + name);
};

await page.goto('http://localhost:8124/?seed=42', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
check('title overlay visible', await page.locator('#overlay:not(.hidden) h1').isVisible());
await page.click('#btn-start');
await page.waitForTimeout(400);
check('title overlay hidden after start', await page.locator('#overlay.hidden').count() === 1);

// Play a plant card from the hand (click the first playable plant).
const planted = await page.evaluate(() => {
  const s = window.__kebun.state;
  const plant = s.sides[0].hand.find((c) => c.suit === 'plant');
  if (!plant) return 'no-plant-in-hand';
  window.__kebun.playCard(s, 0, plant.uid, null);
  window.__kebun.render();
  return s.sides[0].beds.some((b) => b !== null) ? 'planted' : 'not-planted';
});
check('plant card lands on a bed', planted === 'planted');

// Force a pest into the hand, select it, target an enemy plant.
const pestResult = await page.evaluate(() => {
  const s = window.__kebun.state;
  if (!s.sides[1].beds.some((b) => b !== null)) {
    s.sides[1].beds[0] = { uid: 7771, id: 'tomat', name: 'Tomat Manis', art: '🍅', hasil: 2, tumbuh: 1, duri: 0 };
  }
  s.sides[0].hand.push({ uid: 7772, id: 'ulat', name: 'Ulat Rakus', suit: 'pest', cost: 2, eat: 99, dmg: 3, art: '🐛', text: 'x' });
  s.sides[0].energy = 6;
  window.__kebun.render();
  return 'ready';
});
check('pest forced into hand', pestResult === 'ready');
await page.locator('.card[data-uid="7772"]').click();
await page.waitForTimeout(300);
const targetable = await page.locator('.plant-tile.targetable').count();
check('enemy plant highlights as pest target', targetable >= 1);
await page.locator('.plant-tile.targetable').first().click();
await page.waitForTimeout(300);
const eaten = await page.evaluate(() => window.__kebun.state.sides[1].beds[0] === null);
check('pest eats the targeted plant', eaten);

// End the turn: AI plays, round advances.
await page.click('#btn-end');
await page.waitForTimeout(6000);
const round2 = await page.evaluate(() => window.__kebun.state.round);
check('AI turn runs and round advances', round2 === 2);

// Force a win: player has a plant on a bed, AI at 1 health, end turn.
await page.evaluate(() => {
  const s = window.__kebun.state;
  s.sides[0].beds[0] = { uid: 7774, id: 'labu', name: 'Labu Raksasa', art: '🎃', hasil: 4, tumbuh: 1, duri: 0 };
  s.sides[1].health = 1;
  window.__kebun.render();
});
await page.click('#btn-end');
await page.waitForTimeout(6000);
const winState = await page.evaluate(() => ({ phase: window.__kebun.state.phase, winner: window.__kebun.state.winner }));
check(`win reached (phase=${winState.phase} winner=${winState.winner})`, winState.phase === 'over' && winState.winner === 0);
const winText = await page.locator('#overlay h1').textContent();
check('win overlay says PANEN RAYA', /PANEN RAYA/.test(winText || ''));

// Restart, force a loss: player at 1 health, AI garden alive.
await page.click('#btn-again');
await page.waitForTimeout(500);
await page.evaluate(() => {
  const s = window.__kebun.state;
  s.sides[0].health = 1;
  s.sides[1].health = 40;
  s.sides[1].beds[0] = { uid: 7773, id: 'labu', name: 'Labu Raksasa', art: '🎃', hasil: 4, tumbuh: 1, duri: 0 };
  s.sides[0].beds = [null, null, null, null];
});
await page.click('#btn-end');
await page.waitForTimeout(6000);
check('loss overlay shows', await page.locator('#overlay:not(.hidden) h1').isVisible());
const lossText = await page.locator('#overlay h1').textContent();
check('loss overlay says KEBUNMU LAYU', /LAYU/.test(lossText || ''));

await browser.close();
server.kill();
console.log(results.join('\n'));
if (errors.length) {
  console.log('ERRORS:');
  for (const e of errors) console.log('  ' + e);
  process.exit(1);
}
console.log('browser playtest: all checks passed, no page errors');
