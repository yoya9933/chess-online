import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeClockAfterUndo, settleClockValue } from '../worker/clock.js';

test('undo resumes the restored side without refunding either clock', () => {
  const settled = {
    configured: true,
    started: true,
    active: 'black',
    runningSince: 5_000,
    redMs: 51_000,
    blackMs: 43_000,
    incrementMs: 0,
  };
  const resumed = resumeClockAfterUndo(settled, 'red', 9_000);
  assert.equal(resumed.redMs, 51_000);
  assert.equal(resumed.blackMs, 43_000);
  assert.equal(resumed.active, 'red');
  assert.equal(resumed.runningSince, 9_000);
});

test('server clock timeout is deterministic and cannot go below zero', () => {
  const clock = {
    configured: true,
    started: true,
    active: 'black',
    runningSince: 1_000,
    redMs: 60_000,
    blackMs: 1_500,
    incrementMs: 0,
  };
  const result = settleClockValue(clock, 3_000);
  assert.equal(result.clock.blackMs, 0);
  assert.equal(result.timedOut, 'black');
});

test('settling a clock never increases remaining time', () => {
  const clock = {
    configured: true,
    started: true,
    active: 'red',
    runningSince: 10_000,
    redMs: 25_000,
    blackMs: 30_000,
    incrementMs: 0,
  };
  const result = settleClockValue(clock, 12_500);
  assert.ok(result.clock.redMs <= clock.redMs);
  assert.equal(result.clock.blackMs, clock.blackMs);
});
