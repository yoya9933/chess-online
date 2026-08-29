import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRepetition, positionKey } from '../worker/adjudication.js';

test('position key changes with side to move', () => {
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  board[9][4] = { t: 'K', c: 'red' };
  board[0][4] = { t: 'K', c: 'black' };
  assert.notEqual(positionKey({ board, turn: 'red' }), positionKey({ board, turn: 'black' }));
});

test('third repeated position becomes a draw', () => {
  const rows = [
    { position_key: 'same', mover: 'red', gives_check: 0 },
    { position_key: 'same', mover: 'red', gives_check: 0 },
    { position_key: 'same', mover: 'red', gives_check: 0 },
  ];
  assert.deepEqual(classifyRepetition(rows), { type: 'repetition', winner: null, loser: null });
});

test('repeated checking cycle penalizes the long-checking side', () => {
  const rows = [
    { position_key: 'same', mover: 'red', gives_check: 1 },
    { position_key: 'same', mover: 'red', gives_check: 1 },
    { position_key: 'same', mover: 'red', gives_check: 1 },
  ];
  assert.deepEqual(classifyRepetition(rows), { type: 'long-check', winner: 'black', loser: 'red' });
});
