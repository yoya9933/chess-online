import test from 'node:test';
import assert from 'node:assert/strict';
import { resetClockForRestart, resumeClockAfterUndo, settleClockValue } from '../worker/clock.js';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../public/clock-client.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/platform-runtime.css', import.meta.url), 'utf8');

test('clock deducts elapsed time from active player', () => {
  const clock = { configured:true, started:true, active:'red', runningSince:1000, redMs:60000, blackMs:60000, incrementMs:0 };
  const result = settleClockValue(clock, 11000);
  assert.equal(result.clock.redMs, 50000);
  assert.equal(result.timedOut, null);
});

test('clock reports server-authoritative timeout', () => {
  const clock = { configured:true, started:true, active:'black', runningSince:1000, redMs:5000, blackMs:3000, incrementMs:0 };
  const result = settleClockValue(clock, 5000);
  assert.equal(result.clock.blackMs, 0);
  assert.equal(result.timedOut, 'black');
});

test('undo preserves remaining time while switching active side', () => {
  const clock = { configured:true, started:true, active:'black', runningSince:5000, redMs:51000, blackMs:43000, incrementMs:0 };
  const result = resumeClockAfterUndo(clock, 'red', 9000);
  assert.equal(result.redMs, 51000);
  assert.equal(result.blackMs, 43000);
  assert.equal(result.active, 'red');
  assert.equal(result.runningSince, 9000);
});

test('restart preserves time control but resets both players to the initial clock', () => {
  const clock = { configured:true, started:true, active:'black', runningSince:5000, initialMs:600000, redMs:520000, blackMs:411000, incrementMs:5000 };
  const result = resetClockForRestart(clock);
  assert.deepEqual(result, {
    configured: true,
    initialMs: 600000,
    incrementMs: 5000,
    redMs: 600000,
    blackMs: 600000,
    started: false,
    active: 'red',
    runningSince: null,
  });
});

test('clock UI supports presets, custom controls, low-time warning and midpoint server sync', () => {
  assert.match(client, /10 分鐘/);
  assert.match(client, /30 分鐘/);
  assert.match(client, /3 分 \+ 2 秒/);
  assert.match(client, /每步加秒/);
  assert.match(client, /sampleOffset/);
  assert.match(client, /sentAt \+ receivedAt/);
  assert.match(client, /low-time/);
  assert.match(client, /toFixed\(1\)/);
  assert.match(styles, /clock-low-time/);
});
