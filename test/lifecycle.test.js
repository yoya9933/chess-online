import test from 'node:test';
import assert from 'node:assert/strict';
import { presenceState } from '../worker/lifecycle.js';

test('presenceState distinguishes online, temporary offline, and expired seats', () => {
  const now = 1_000_000;
  assert.equal(presenceState(now - 10_000, now), 'online');
  assert.equal(presenceState(now - 60_000, now), 'offline');
  assert.equal(presenceState(now - 130_000, now), 'expired');
  assert.equal(presenceState(null, now), 'expired');
});
