import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/mobile-hardening.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
const browser = readFileSync(new URL('../e2e/browser-smoke.sh', import.meta.url), 'utf8');

test('mobile hardening stylesheet loads last', () => {
  assert.match(loader, /mobile-hardening\.css/);
  assert.ok(loader.indexOf('mobile-hardening.css') > loader.indexOf('solo-setup.css'));
});

test('decorative lobby text cannot widen the mobile viewport', () => {
  assert.match(styles, /\.lobby::before/);
  assert.match(styles, /width:\s*100%\s*!important/);
  assert.match(styles, /max-width:\s*100%\s*!important/);
  assert.match(styles, /overflow:\s*hidden/);
});

test('narrow phones receive stacked controls and parent-sized board', () => {
  assert.match(styles, /@media \(max-width: 380px\)/);
  assert.match(styles, /\.side-tool-grid[\s\S]*grid-template-columns:\s*1fr\s*!important/);
  assert.match(styles, /\.in-game-color[\s\S]*grid-template-columns:\s*1fr\s*!important/);
  assert.match(styles, /\.board[\s\S]*width:\s*min\(100%, 560px\)\s*!important/);
});

test('mobile header can wrap version metadata without horizontal overflow', () => {
  assert.match(styles, /grid-template-areas:[\s\S]*"brand connection"[\s\S]*"version version"/);
  assert.match(styles, /header #app-version[\s\S]*max-width:\s*100%\s*!important/);
});

test('PWA and browser smoke include current mobile hardening assets and narrow widths', () => {
  assert.match(sw, new RegExp(`chuhe-shell-v${version.replaceAll('.', '\\.')}`));
  assert.match(sw, /mobile-hardening\.css/);
  assert.match(browser, /--window-size=390,844/);
  assert.match(browser, /--window-size=360,800/);
  assert.match(browser, /--window-size=320,568/);
});
