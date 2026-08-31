import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader=readFileSync(new URL('../public/enhancements-loader.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/solo-setup.css',import.meta.url),'utf8');
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');

test('solo setup stylesheet loads after match panel polish',()=>{
  assert.match(loader,/solo-setup\.css/);
  assert.ok(loader.indexOf('solo-setup.css')>loader.indexOf('match-panel-align.css'));
});

test('name room and AI difficulty share the dark tech field treatment',()=>{
  assert.match(styles,/#ai-difficulty-wrap select/);
  assert.match(styles,/appearance:none/);
  assert.match(styles,/color-scheme:dark/);
  assert.match(styles,/border-radius:10px/);
  assert.match(styles,/border-color:#62e4ed/);
  assert.match(styles,/#name\{text-transform:none\}/);
});

test('PWA shell includes the solo setup stylesheet and current cache generation',()=>{
  assert.match(sw,/chuhe-shell-v1\.14\.8/);
  assert.match(sw,/solo-setup\.css/);
});
