import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenHash } from '../worker/history.js';

test('history token hashes are deterministic and never expose the raw token', async () => {
  const token = '123e4567-e89b-12d3-a456-426614174000';
  const first = await tokenHash(token);
  const second = await tokenHash(token);
  const other = await tokenHash('223e4567-e89b-12d3-a456-426614174000');
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, token);
  assert.notEqual(first, other);
});
