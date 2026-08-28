import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../public/accessibility.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/accessibility.css', import.meta.url), 'utf8');

test('accessibility layer keeps keyboard grid semantics', () => {
  assert.match(script, /role', 'grid'/);
  assert.match(script, /role', 'gridcell'/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /Enter/);
  assert.match(script, /aria-live/);
});

test('accessibility styles keep visible focus and reduced-motion support', () => {
  assert.match(styles, /focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
});
