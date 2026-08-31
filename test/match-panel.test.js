import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/match-panel.css', import.meta.url), 'utf8');
const alignStyles = readFileSync(new URL('../public/match-panel-align.css', import.meta.url), 'utf8');

test('match panel polish stylesheet is loaded after the existing game styles', () => {
  assert.match(loader, /match-panel\.css/);
  assert.ok(loader.indexOf('match-panel.css') > loader.indexOf('timeout-finish.css'));
  assert.ok(loader.indexOf('match-panel-align.css') > loader.indexOf('match-panel.css'));
});

test('match panel polish groups room status, tools and side choice into clear UI hierarchy', () => {
  assert.match(styles, /\.game-info>div:first-child/);
  assert.match(styles, /\.room-presence\[data-state="waiting"\]/);
  assert.match(styles, /\.side-tool-grid/);
  assert.match(styles, /\.side-choice-row/);
  assert.match(styles, /side-choice-locked/);
  assert.match(styles, /grid-template-columns:minmax\(300px,320px\)/);
});

test('side choice title and segmented control are centered as a single column', () => {
  assert.match(alignStyles, /display:grid!important/);
  assert.match(alignStyles, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(alignStyles, /justify-content:center/);
  assert.match(alignStyles, /text-align:center/);
  assert.match(alignStyles, /side-section-title::before\{display:none\}/);
});

test('match panel polish keeps mobile and reduced-motion fallbacks', () => {
  assert.match(styles, /@media \(max-width:560px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
});
