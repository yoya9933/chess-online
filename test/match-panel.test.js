import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/match-panel.css', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

test('match panel polish uses one stylesheet', () => {
  assert.match(loader, /match-panel\.css/);
  assert.ok(loader.indexOf('match-panel.css') > loader.indexOf('timeout-finish.css'));
  assert.doesNotMatch(loader, /match-panel-align\.css/);
});

test('match panel groups room status, tools and side choice into clear UI hierarchy', () => {
  assert.match(styles, /\.game-info>div:first-child/);
  assert.match(styles, /\.room-presence\[data-state="waiting"\]/);
  assert.match(styles, /\.side-tool-grid/);
  assert.match(styles, /\.side-choice-row/);
  assert.match(styles, /side-choice-locked/);
  assert.match(styles, /grid-template-columns:minmax\(300px,320px\)/);
});

test('side choice label and segmented control share the same vertical center line', () => {
  assert.match(styles, /grid-template-columns:max-content minmax\(0,1fr\)!important/);
  assert.match(styles, /align-items:center!important/);
  assert.match(styles, /align-content:center!important/);
  assert.match(styles, /min-height:66px/);
  assert.match(styles, /height:38px/);
  assert.match(styles, /padding:2px 0 0!important/);
});

test('service worker cannot pin an old enhancement loader forever', () => {
  assert.ok(serviceWorker.includes(`chuhe-shell-v${version}`));
  assert.match(serviceWorker, /u\.pathname==='\/enhancements-loader\.js'/);
  assert.match(serviceWorker, /cache:'no-store'/);
  assert.doesNotMatch(serviceWorker, /match-panel-align\.css/);
});

test('match panel keeps mobile and reduced-motion fallbacks', () => {
  assert.match(styles, /@media \(max-width:560px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
});
