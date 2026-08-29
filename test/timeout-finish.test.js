import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const finish = readFileSync(new URL('../public/timeout-finish.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/timeout-finish.css', import.meta.url), 'utf8');
const loader = readFileSync(new URL('../public/enhancements-loader.js', import.meta.url), 'utf8');
const clock = readFileSync(new URL('../public/clock-client.js', import.meta.url), 'utf8');
const history = readFileSync(new URL('../public/history-client.js', import.meta.url), 'utf8');
const record = readFileSync(new URL('../public/record-system.js', import.meta.url), 'utf8');
const adjudication = readFileSync(new URL('../public/platform-runtime.js', import.meta.url), 'utf8');

test('timeout finish enhancement loads after the authoritative clock client', () => {
  assert.match(loader, /timeout-finish\.css/);
  assert.match(loader, /timeout-finish\.js/);
  assert.ok(loader.indexOf('clock-client.js') < loader.indexOf('timeout-finish.js'));
});

test('local clock expiry immediately locks board while server result is settling', () => {
  assert.match(clock, /expiredLocally/);
  assert.match(clock, /chuhe:clock-expired-change/);
  assert.match(clock, /state\.result = data\.result/);
  assert.match(finish, /localClockExpired/);
  assert.match(finish, /timeout-locked/);
  assert.match(finish, /時間到 · 正在確認結果/);
});

test('authoritative timeout shows dedicated finish copy and sound', () => {
  assert.match(finish, /result\.type !== 'timeout'/);
  assert.match(finish, /title: '時間到'/);
  assert.match(finish, /超時/);
  assert.match(finish, /winnerText/);
  assert.match(finish, /playTimeoutSound/);
  assert.match(finish, /tone\(ctx, 880/);
  assert.match(finish, /aria-live/);
});

test('timeout result is visible in normal status, history and XQPGN metadata', () => {
  assert.match(adjudication, /timeout: '時間到'/);
  assert.match(adjudication, /result\.type === 'timeout'/);
  assert.match(history, /game\.result\?\.type === 'timeout'/);
  assert.match(history, /超時/);
  assert.match(record, /termination: game\?\.result\?\.type/);
  assert.match(record, /\['Termination'/);
  assert.match(record, /\['ResultText'/);
});

test('timeout effect has reduced-motion fallback and locked cells ignore input', () => {
  assert.match(styles, /\.board\.timeout-locked \.cell\{pointer-events:none\}/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /\.timeout-fx/);
  assert.match(styles, /animation:none!important/);
});
