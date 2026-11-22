// Screenshot runner for Kebun Terakhir: serves game/ locally, opens each
// ?shot= scene in headless Chromium, and saves a JPEG per shots.json.
// Usage: node tools/shots.mjs
import { chromium } from '/home/hatch/workspace/repos/prompt-optimizer/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));

const server = spawn('node', ['serve.ts', '--port', '8123'], { cwd: root, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1200));

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text());
});

for (const shot of shots) {
  await page.goto('http://localhost:8123/' + shot.query, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const path = join(root, 'screenshots', shot.name);
  await page.screenshot({ path, type: 'jpeg', quality: 82 });
  const size = statSync(path).size;
  console.log(`${shot.name}: ${size} bytes${size > 262144 ? '  OVER 256KiB!' : ''}`);
}
await browser.close();
server.kill();
if (errors.length) {
  console.log('PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
  process.exit(1);
}
console.log('shots done, no page errors');
