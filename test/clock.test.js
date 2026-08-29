import test from 'node:test';
import assert from 'node:assert/strict';
import { settleClockValue } from '../worker/clock.js';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../public/clock-client.js', import.meta.url), 'utf8');

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

test('clock UI supports presets, increment, custom controls and server sync', () => {
  assert.match(client, /10 分鐘/);
  assert.match(client, /30 分鐘/);
  assert.match(client, /每步加秒/);
  assert.match(client, /\/api\/clock/);
  assert.match(client, /setInterval/);
});
