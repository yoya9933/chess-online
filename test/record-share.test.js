import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const record = readFileSync(new URL('../public/record-system.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

test('record share prefers native file sharing for full XQPGN payloads', () => {
  assert.match(record, /new File\(\[text\], recordFilename\(\)/);
  assert.match(record, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(record, /navigator\.share\(\{ title: '楚河棋局棋譜', text: '楚河棋局 XQPGN\/2 棋譜檔', files: \[file\] \}\)/);
});

test('record share overrides legacy giant-text handler and has safe fallbacks', () => {
  assert.match(record, /const shareButton = document\.querySelector\('#record-share'\)/);
  assert.match(record, /shareButton\.onclick = shareRecord/);
  assert.match(record, /完整棋譜已複製到剪貼簿/);
  assert.match(record, /error\?\.name === 'AbortError'/);
  assert.match(record, /分享失敗，完整棋譜已複製/);
});

test('record copy has clipboard fallback and PWA cache carries current version', () => {
  assert.match(record, /navigator\.clipboard\?\.writeText/);
  assert.match(record, /document\.execCommand\?\.\('copy'\)/);
  assert.ok(sw.includes(`chuhe-shell-v${version}`));
});
