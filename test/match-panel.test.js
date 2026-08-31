import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/match-panel.css', import.meta.url), 'utf8');

test('match panel polish stylesheet is loaded after the existing game styles', () => {
  assert.match(loader, /match-panel\.css/);
  assert.ok(loader.indexOf('match-panel.css') > loader.indexOf('timeout-finish.css'));
});

test('match panel polish groups room status, tools and side choice into clear UI hierarchy', () => {
  assert.match(styles, /\.game-info>div:first-child/);
  assert.match(styles, /\.room-presence\[data-state="waiting"\]/);
  assert.match(styles, /\.side-tool-grid/);
  assert.match(styles, /\.side-choice-row/);
  assert.match(styles, /side-choice-locked/);
  assert.match(styles, /grid-template-columns:minmax\(300px,320px\)/);
});

test('match panel polish keeps mobile and reduced-motion fallbacks', () => {
  assert.match(styles, /@media \(max-width:560px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
});
