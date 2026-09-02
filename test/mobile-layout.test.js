import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/responsive.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
const browser = readFileSync(new URL('../e2e/browser-smoke.sh', import.meta.url), 'utf8');

test('responsive stylesheet is the single final mobile layer', () => {
  assert.ok(loader.indexOf('responsive.css') > loader.indexOf('solo-setup.css'));
  assert.doesNotMatch(loader, /mobile-hardening\.css/);
});

test('decorative lobby text cannot widen the mobile viewport', () => {
  assert.match(styles, /\.lobby::before/);
  assert.match(styles, /width:100%!important/);
  assert.match(styles, /max-width:100%!important/);
  assert.match(styles, /overflow:hidden/);
});

test('narrow phones receive stacked controls and parent-sized board', () => {
  assert.match(styles, /@media \(max-width:380px\)/);
  assert.match(styles, /\.game-info \.side-tool-grid\{grid-template-columns:1fr!important\}/);
  assert.match(styles, /\.game-info \.in-game-color\{grid-template-columns:1fr!important/);
  assert.match(styles, /\.board\{width:min\(100%,560px\);max-width:100%;touch-action:manipulation\}/);
});

test('mobile piece glyphs scale down and stay inside circular pieces', () => {
  assert.match(styles, /\.board \.piece\{[^}]*font-size:clamp\(14px,4\.4vw,21px\)/);
  assert.match(styles, /\.board \.piece\{[^}]*line-height:1/);
  assert.match(styles, /\.board \.piece\{[^}]*white-space:nowrap/);
  assert.match(styles, /\.board \.piece\{[^}]*overflow:hidden/);
});

test('mobile header can wrap version metadata without horizontal overflow', () => {
  assert.match(styles, /grid-template-areas:"brand connection" "version version"/);
  assert.match(styles, /header #app-version\{[^}]*max-width:100%!important/);
});

test('PWA and browser smoke use current responsive asset and narrow widths', () => {
  assert.ok(sw.includes(`chuhe-shell-v${version}`));
  assert.match(sw, /responsive\.css/);
  assert.doesNotMatch(sw, /mobile-hardening\.css/);
  assert.match(browser, /--window-size=390,844/);
  assert.match(browser, /--window-size=360,800/);
  assert.match(browser, /--window-size=320,568/);
});
