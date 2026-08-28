import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = new URL('../public/', import.meta.url);
const securityClient = readFileSync(new URL('../public/security-client.js', import.meta.url), 'utf8');
const performanceClient = readFileSync(new URL('../public/performance-client.js', import.meta.url), 'utf8');
const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const workerIndex = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');

function assetBytes() {
  return readdirSync(publicDir)
    .filter((name) => /\.(?:js|css)$/.test(name))
    .reduce((sum, name) => sum + statSync(join(publicDir.pathname, name)).size, 0);
}

test('static JavaScript and CSS stay inside the current 400 KiB performance budget', () => {
  assert.ok(assetBytes() < 400 * 1024, `JS/CSS budget exceeded: ${assetBytes()} bytes`);
});

test('room GET requests carry room id but never player token in the URL', () => {
  assert.match(securityClient, /\?room=/);
  assert.doesNotMatch(securityClient, /[?&]token=/);
});

test('adaptive sync backs off hidden tabs and loader preserves script order', () => {
  assert.match(performanceClient, /hiddenIntervalMs = 15000/);
  assert.match(performanceClient, /visibleIntervalMs = 2400/);
  assert.match(loader, /script\.async = false/);
});

test('worker defines explicit cache policy for version, shell, and static assets', () => {
  assert.match(workerIndex, /version\.json/);
  assert.match(workerIndex, /max-age=0, must-revalidate/);
  assert.match(workerIndex, /stale-while-revalidate=86400/);
});
