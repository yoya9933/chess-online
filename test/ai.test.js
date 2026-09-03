import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../public/ai-core.js');
const AI = globalThis.ChuheAI;

function emptyBoard() {
  const b = Array.from({ length: 10 }, () => Array(9).fill(null));
  b[9][4] = { t: 'K', c: 'red' };
  b[0][4] = { t: 'K', c: 'black' };
  b[5][4] = { t: 'P', c: 'red' }; // keep the generals from facing each other
  return b;
}

function board() {
  const b = emptyBoard();
  b[9][0] = { t: 'R', c: 'red' };
  b[1][0] = { t: 'P', c: 'black' };
  b[2][7] = { t: 'H', c: 'black' };
  return b;
}

function sameMove(a, b) {
  return a?.from?.x === b?.from?.x && a?.from?.y === b?.from?.y &&
    a?.to?.x === b?.to?.x && a?.to?.y === b?.to?.y;
}

function hasMove(list, from, to) {
  return list.some((move) => sameMove(move, { from, to }));
}

test('AI exposes evaluation and returns a legal iterative alpha-beta move', () => {
  const b = board();
  assert.equal(typeof AI.evaluate, 'function');
  assert.equal(typeof AI.chooseMove, 'function');
  assert.equal(typeof AI.getLastSearchStats, 'function');
  assert.equal(typeof AI.evaluate(b, 'red', 'standard'), 'number');
  const move = AI.chooseMove(b, 'red', 'standard', 'normal', {
    maxDepth: 3,
    nodeLimit: 24000,
    timeMs: 1000,
    quiescenceDepth: 2
  });
  assert.ok(move);
  assert.ok(AI.legalMoves(b, 'red', 'standard').some((candidate) => sameMove(candidate, move)));
  const stats = AI.getLastSearchStats();
  assert.ok(stats.completedDepth >= 2);
  assert.ok(stats.nodes > 0);
  assert.ok(stats.qNodes > 0);
  assert.ok(stats.ttSize > 0);
  assert.ok(stats.ttStores > 0);
  assert.equal(stats.moveGenerator, 'piece-directed');
});

test('AI 3.1 profiles raise search ceilings without increasing think-time caps', () => {
  assert.ok(AI.profiles.normal.maxDepth >= 6);
  assert.ok(AI.profiles.hard.maxDepth >= 9);
  assert.equal(AI.profiles.normal.timeMs, 320);
  assert.equal(AI.profiles.hard.timeMs, 850);
  assert.ok(AI.profiles.hard.nodeLimit > AI.profiles.normal.nodeLimit);
  assert.ok(AI.profiles.hard.quiescenceDepth > AI.profiles.normal.quiescenceDepth);
});

test('piece-directed generator preserves rook blockers and cannon screens', () => {
  const rookBoard = emptyBoard();
  rookBoard[7][4] = { t: 'R', c: 'red' };
  rookBoard[7][2] = { t: 'P', c: 'black' };
  rookBoard[7][6] = { t: 'P', c: 'red' };
  const rookMoves = AI.legalMoves(rookBoard, 'red', 'standard');
  assert.ok(hasMove(rookMoves, { y: 7, x: 4 }, { y: 7, x: 2 }));
  assert.ok(hasMove(rookMoves, { y: 7, x: 4 }, { y: 7, x: 3 }));
  assert.equal(hasMove(rookMoves, { y: 7, x: 4 }, { y: 7, x: 1 }), false);
  assert.equal(hasMove(rookMoves, { y: 7, x: 4 }, { y: 7, x: 6 }), false);

  const cannonBoard = emptyBoard();
  cannonBoard[7][4] = { t: 'C', c: 'red' };
  cannonBoard[7][3] = { t: 'P', c: 'red' };
  cannonBoard[7][1] = { t: 'R', c: 'black' };
  const cannonMoves = AI.legalMoves(cannonBoard, 'red', 'standard');
  assert.ok(hasMove(cannonMoves, { y: 7, x: 4 }, { y: 7, x: 1 }));
  assert.equal(hasMove(cannonMoves, { y: 7, x: 4 }, { y: 7, x: 2 }), false);
  assert.ok(hasMove(cannonMoves, { y: 7, x: 4 }, { y: 7, x: 5 }));
});

test('search board copies share untouched pieces but never mutate the input board', () => {
  const b = board();
  const originalKing = b[0][4];
  const originalRook = b[9][0];
  const next = AI.applyMove(b, { from: { y: 9, x: 0 }, to: { y: 8, x: 0 } });
  assert.equal(next[0][4], originalKing);
  assert.notEqual(next[8][0], originalRook);
  assert.equal(b[9][0], originalRook);
  assert.equal(b[8][0], null);
});

test('piece-square tables reward useful horse centralization', () => {
  const edge = emptyBoard();
  const center = emptyBoard();
  edge[7][0] = { t: 'H', c: 'red' };
  center[7][4] = { t: 'H', c: 'red' };
  assert.ok(AI.evaluate(center, 'red', 'standard') > AI.evaluate(edge, 'red', 'standard'));
});

test('quiescence search sees an immediate recapture beyond the nominal leaf', () => {
  const b = emptyBoard();
  b[9][0] = { t: 'R', c: 'red' };
  b[5][0] = { t: 'P', c: 'black' };
  b[4][0] = { t: 'R', c: 'black' };
  const poisoned = { from: { y: 9, x: 0 }, to: { y: 5, x: 0 } };
  assert.ok(AI.legalMoves(b, 'red', 'standard').some((candidate) => sameMove(candidate, poisoned)));
  const move = AI.chooseMove(b, 'red', 'standard', 'normal', {
    maxDepth: 1,
    nodeLimit: 30000,
    timeMs: 1000,
    quiescenceDepth: 4
  });
  assert.ok(move);
  assert.equal(sameMove(move, poisoned), false);
  assert.ok(AI.getLastSearchStats().qNodes > 0);
});

test('difficulty modes and search diagnostics are wired in the UI', () => {
  const client = readFileSync(new URL('../public/ai-client.js', import.meta.url), 'utf8');
  assert.match(client, /簡單/);
  assert.match(client, /普通/);
  assert.match(client, /困難/);
  assert.match(client, /chooseMove/);
  assert.match(client, /lastSearch/);
  assert.match(client, /profiles/);
});

test('standard solo AI opening book supports transpositions and repeated-game variety', () => {
  const client = readFileSync(new URL('../public/ai-client.js', import.meta.url), 'utf8');
  assert.match(client, /const OPENING_BOOK/);
  assert.match(client, /炮二平五/);
  assert.match(client, /馬二進三/);
  assert.match(client, /兵七進一/);
  assert.match(client, /相三進五/);
  assert.match(client, /function historyBookKey/);
  assert.match(client, /function matchedOpeningLines/);
  assert.match(client, /const seen = new Set\(played\)/);
  assert.match(client, /keys\.every\(\(key\) => seen\.has\(key\)\)/);
  assert.match(client, /const BOOK_MEMORY_KEY = 'xiangqi-ai-opening-memory'/);
  assert.match(client, /repeatFactor = difficulty === 'hard' \? 0\.25 : 0/);
  assert.match(client, /matchedBy: transposed \? 'transposition' : 'sequence'/);
  assert.match(client, /function openingBookMove/);
  assert.match(client, /state\.variant \|\| 'standard'\) !== 'standard'/);
  assert.match(client, /difficulty === 'hard' \? 2 : difficulty === 'normal' \? 3/);
  assert.match(client, /bookChoice \|\| globalThis\.ChuheAI\.chooseMove/);
  assert.match(client, /source: 'opening-book'/);
  assert.match(client, /openingBookLines/);
});

test('solo AI breaks repeated checking loops without suppressing checkmate', () => {
  const client = readFileSync(new URL('../public/ai-client.js', import.meta.url), 'utf8');
  assert.match(client, /function repeatedCheckingPosition/);
  assert.match(client, /state\.history/);
  assert.match(client, /legalMoves\(next, nextTurn, variant\)\.length === 0/);
  assert.match(client, /repeats >= 2/);
  assert.match(client, /alternative\.score >= originalScore - 120/);
  assert.match(client, /avoidPerpetualCheck\(proposed, aiColor\)/);
});

test('AI 3.1 uses piece-directed generation instead of testing all 90 destinations', () => {
  const core = readFileSync(new URL('../public/ai-core.js', import.meta.url), 'utf8');
  assert.match(core, /function candidateTargets/);
  assert.match(core, /function rayTargets/);
  assert.match(core, /for \(const to of candidateTargets/);
  assert.doesNotMatch(core, /for \(let ty = 0; ty < 10; ty\+\+\)/);
  assert.match(core, /const clone = \(b\) => b\.map\(\(r\) => r\.slice\(\)\)/);
});

test('AI 3.x source keeps iterative deepening, TT, quiescence and move ordering', () => {
  const core = readFileSync(new URL('../public/ai-core.js', import.meta.url), 'utf8');
  assert.match(core, /for \(let depth = 1; depth <= profile\.maxDepth; depth\+\+\)/);
  assert.match(core, /function positionKey/);
  assert.match(core, /new Map\(\)/);
  assert.match(core, /function quiescence/);
  assert.match(core, /function orderMoves/);
  assert.match(core, /const PST/);
});

test('Jieqi simulation and evaluation never use the hidden true type before reveal', () => {
  const rookSecret = board();
  const pawnSecret = board();
  rookSecret[6][0] = { t: 'R', o: 'P', c: 'red', h: true };
  pawnSecret[6][0] = { t: 'P', o: 'P', c: 'red', h: true };

  assert.equal(AI.evaluate(rookSecret, 'red', 'jieqi'), AI.evaluate(pawnSecret, 'red', 'jieqi'));

  const next = AI.applyMove(rookSecret, { from: { y: 6, x: 0 }, to: { y: 5, x: 0 } });
  assert.equal(next[5][0].t, 'P');
  assert.equal(next[5][0].h, false);

  const options = { maxDepth: 2, nodeLimit: 12000, timeMs: 1000, quiescenceDepth: 2 };
  const a = AI.chooseMove(rookSecret, 'red', 'jieqi', 'normal', options);
  const b = AI.chooseMove(pawnSecret, 'red', 'jieqi', 'normal', options);
  assert.ok(a && b);
  assert.ok(sameMove(a, b));
});