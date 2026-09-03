(() => {
  if (!globalThis.ChuheAI) return;
  const KEY = 'xiangqi-ai-difficulty';
  const BOOK_MEMORY_KEY = 'xiangqi-ai-opening-memory';
  let difficulty = localStorage.getItem(KEY) || 'normal';
  let lastDecision = null;
  let openingMemory = {};
  try {
    const saved = JSON.parse(localStorage.getItem(BOOK_MEMORY_KEY) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) openingMemory = saved;
  } catch {}

  const OPENING_BOOK = Object.freeze({
    '': [
      { key: '7774', weight: 40, name: '炮二平五' },
      { key: '9776', weight: 28, name: '馬二進三' },
      { key: '6252', weight: 18, name: '兵七進一' },
      { key: '9674', weight: 10, name: '相三進五' },
      { key: '7174', weight: 4, name: '炮八平五' }
    ],
    '7774': [
      { key: '0726', weight: 52, name: '馬８進７' },
      { key: '0122', weight: 28, name: '馬２進３' },
      { key: '2724', weight: 14, name: '炮８平５' },
      { key: '3646', weight: 6, name: '卒７進１' }
    ],
    '9776': [
      { key: '0726', weight: 48, name: '馬８進７' },
      { key: '3646', weight: 24, name: '卒７進１' },
      { key: '2724', weight: 18, name: '炮８平５' },
      { key: '0122', weight: 10, name: '馬２進３' }
    ],
    '6252': [
      { key: '0726', weight: 42, name: '馬８進７' },
      { key: '3646', weight: 30, name: '卒７進１' },
      { key: '2724', weight: 18, name: '炮８平５' },
      { key: '0122', weight: 10, name: '馬２進３' }
    ],
    '9674': [
      { key: '2724', weight: 38, name: '炮８平５' },
      { key: '0726', weight: 34, name: '馬８進７' },
      { key: '3646', weight: 18, name: '卒７進１' },
      { key: '0122', weight: 10, name: '馬２進３' }
    ],
    '7174': [
      { key: '0122', weight: 42, name: '馬２進３' },
      { key: '0726', weight: 32, name: '馬８進７' },
      { key: '2124', weight: 16, name: '炮２平５' },
      { key: '3242', weight: 10, name: '卒３進１' }
    ],
    '7774,0726': [
      { key: '9776', weight: 60, name: '馬二進三' },
      { key: '6252', weight: 25, name: '兵七進一' },
      { key: '9172', weight: 15, name: '馬八進七' }
    ],
    '7774,0122': [
      { key: '9776', weight: 55, name: '馬二進三' },
      { key: '6252', weight: 25, name: '兵七進一' },
      { key: '9172', weight: 20, name: '馬八進七' }
    ],
    '9776,0726': [
      { key: '7774', weight: 50, name: '炮二平五' },
      { key: '6252', weight: 30, name: '兵七進一' },
      { key: '9674', weight: 20, name: '相三進五' }
    ],
    '6252,0726': [
      { key: '9776', weight: 50, name: '馬二進三' },
      { key: '7774', weight: 35, name: '炮二平五' },
      { key: '9674', weight: 15, name: '相三進五' }
    ],
    '9674,2724': [
      { key: '9776', weight: 55, name: '馬二進三' },
      { key: '6252', weight: 25, name: '兵七進一' },
      { key: '7774', weight: 20, name: '炮二平五' }
    ],
    '7774,0726,9776': [
      { key: '0807', weight: 50, name: '車９平８' },
      { key: '0122', weight: 35, name: '馬２進３' },
      { key: '3646', weight: 15, name: '卒７進１' }
    ],
    '9776,0726,7774': [
      { key: '0807', weight: 50, name: '車９平８' },
      { key: '0122', weight: 35, name: '馬２進３' },
      { key: '3646', weight: 15, name: '卒７進１' }
    ],
    '6252,0726,9776': [
      { key: '0807', weight: 45, name: '車９平８' },
      { key: '0122', weight: 35, name: '馬２進３' },
      { key: '3646', weight: 20, name: '卒７進１' }
    ],
    '7774,0726,9776,0807': [
      { key: '9897', weight: 65, name: '車一平二' },
      { key: '6252', weight: 20, name: '兵七進一' },
      { key: '9172', weight: 15, name: '馬八進七' }
    ],
    '9776,0726,7774,0807': [
      { key: '9897', weight: 65, name: '車一平二' },
      { key: '6252', weight: 20, name: '兵七進一' },
      { key: '9172', weight: 15, name: '馬八進七' }
    ],
    '7774,0726,9776,0807,9897': [
      { key: '0122', weight: 60, name: '馬２進３' },
      { key: '3646', weight: 25, name: '卒７進１' },
      { key: '2724', weight: 15, name: '炮８平５' }
    ],
    '9776,0726,7774,0807,9897': [
      { key: '0122', weight: 60, name: '馬２進３' },
      { key: '3646', weight: 25, name: '卒７進１' },
      { key: '2724', weight: 15, name: '炮８平５' }
    ]
  });

  function installControl() {
    const form = document.querySelector('#join-form');
    if (!form || document.querySelector('#ai-difficulty-wrap')) return;
    const field = document.createElement('label');
    field.id = 'ai-difficulty-wrap';
    field.className = 'ai-difficulty-wrap hidden';
    field.innerHTML = `AI 難度<select id="ai-difficulty"><option value="easy">簡單</option><option value="normal">普通</option><option value="hard">困難</option></select>`;
    const roomField = document.querySelector('#room-field');
    roomField?.insertAdjacentElement('afterend', field);
    const select = field.querySelector('select');
    select.value = difficulty;
    select.addEventListener('change', () => {
      difficulty = select.value;
      localStorage.setItem(KEY, difficulty);
    });
    const sync = () => {
      const solo = document.querySelector('input[name="game-mode"]:checked')?.value === 'solo';
      field.classList.toggle('hidden', !solo);
    };
    document.querySelectorAll('input[name="game-mode"]').forEach((input) => input.addEventListener('change', sync));
    sync();
  }

  const opposite = (color) => color === 'red' ? 'black' : 'red';
  const moveKey = (move) => `${move.from.y}${move.from.x}${move.to.y}${move.to.x}`;
  const sameMove = (a, b) => a?.from?.x === b?.from?.x && a?.from?.y === b?.from?.y && a?.to?.x === b?.to?.x && a?.to?.y === b?.to?.y;
  function historyMoveKeys() {
    return (state.history || [])
      .map((entry) => entry?.position?.lastAction)
      .filter((move) => move?.from && move?.to)
      .map(moveKey);
  }
  function historyBookKey() {
    return historyMoveKeys().join(',');
  }
  function matchedOpeningLines() {
    const played = historyMoveKeys();
    if (!played.length) return [''];
    if (played.length > 12) return [];
    const seen = new Set(played);
    const matches = Object.keys(OPENING_BOOK)
      .filter(Boolean)
      .map((line) => ({ line, keys: line.split(',') }))
      .filter(({ keys }) => keys.every((key) => seen.has(key)));
    if (!matches.length) return [];
    const specificity = Math.max(...matches.map(({ keys }) => keys.length));
    return matches.filter(({ keys }) => keys.length === specificity).map(({ line }) => line);
  }
  function rememberOpeningChoice(context, key) {
    openingMemory[context] = key;
    try { localStorage.setItem(BOOK_MEMORY_KEY, JSON.stringify(openingMemory)); } catch {}
  }
  function openingBookMove(color) {
    if ((state.variant || 'standard') !== 'standard') return null;
    const played = historyMoveKeys();
    const lines = matchedOpeningLines();
    if (!lines.length) return null;
    const merged = new Map();
    for (const line of lines) {
      for (const entry of OPENING_BOOK[line] || []) {
        const previous = merged.get(entry.key);
        merged.set(entry.key, previous ? { ...entry, weight: previous.weight + entry.weight } : { ...entry });
      }
    }
    const legalByKey = new Map(globalThis.ChuheAI.legalMoves(state.board, color, 'standard').map((move) => [moveKey(move), move]));
    const available = [...merged.values()].filter((entry) => legalByKey.has(entry.key)).sort((a, b) => b.weight - a.weight);
    if (!available.length) return null;
    const limit = difficulty === 'hard' ? 2 : difficulty === 'normal' ? 3 : available.length;
    const candidates = available.slice(0, limit);
    const context = `${color}:${lines.map((line) => line || 'start').sort().join('|')}`;
    const previousKey = openingMemory[context];
    const repeatFactor = difficulty === 'hard' ? 0.25 : 0;
    const weighted = candidates.map((entry) => ({
      ...entry,
      effectiveWeight: entry.weight * (candidates.length > 1 && entry.key === previousKey ? repeatFactor : 1)
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
    let roll = Math.random() * total;
    let picked = weighted[weighted.length - 1];
    for (const entry of weighted) {
      roll -= entry.effectiveWeight;
      if (roll <= 0) {
        picked = entry;
        break;
      }
    }
    rememberOpeningChoice(context, picked.key);
    const exactLine = historyBookKey();
    const transposed = lines.length > 1 || !lines.includes(exactLine);
    lastDecision = {
      source: 'opening-book',
      line: lines.join('|'),
      matchedBy: transposed ? 'transposition' : 'sequence',
      move: picked.key,
      name: picked.name,
      weight: picked.weight,
      repeatAvoided: Boolean(previousKey && previousKey !== picked.key)
    };
    return legalByKey.get(picked.key);
  }
  function positionSignature(board, turn) {
    return `${turn}|${board.map((row) => row.map((piece) => !piece ? '.' : `${piece.c[0]}${piece.h ? `h${piece.o || '?'}` : piece.t || '?'}`).join(',')).join('/')}`;
  }
  function repeatedCheckingPosition(move, color) {
    const variant = state.variant || 'standard';
    const next = globalThis.ChuheAI.applyMove(state.board, move);
    const nextTurn = opposite(color);
    if (!inCheck(nextTurn, next)) return 0;
    const key = positionSignature(next, nextTurn);
    const repeats = (state.history || []).filter((entry) => entry?.position?.board && positionSignature(entry.position.board, entry.position.turn || nextTurn) === key).length;
    if (!repeats || globalThis.ChuheAI.legalMoves(next, nextTurn, variant).length === 0) return 0;
    return repeats;
  }
  function avoidPerpetualCheck(choice, color) {
    if (!choice) return choice;
    const repeats = repeatedCheckingPosition(choice, color);
    if (!repeats) return choice;
    const variant = state.variant || 'standard';
    const originalScore = globalThis.ChuheAI.evaluate(globalThis.ChuheAI.applyMove(state.board, choice), color, variant);
    const alternative = globalThis.ChuheAI.legalMoves(state.board, color, variant)
      .filter((move) => !sameMove(move, choice) && !repeatedCheckingPosition(move, color))
      .map((move) => ({ move, score: globalThis.ChuheAI.evaluate(globalThis.ChuheAI.applyMove(state.board, move), color, variant) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!alternative) return choice;
    return repeats >= 2 || alternative.score >= originalScore - 120 ? alternative.move : choice;
  }

  makeAiMove = function makeAiMoveV4() {
    if (!localMode || sandboxActive || replayActive || setupActive || state.winner || state.turn === myColor) {
      aiThinking = false;
      render();
      return;
    }

    const aiColor = state.turn;
    const bookChoice = openingBookMove(aiColor);
    const proposed = bookChoice || globalThis.ChuheAI.chooseMove(state.board, aiColor, state.variant || 'standard', difficulty);
    if (!bookChoice) lastDecision = { source: 'search', move: proposed ? moveKey(proposed) : null };
    const choice = avoidPerpetualCheck(proposed, aiColor);
    if (choice && proposed && !sameMove(choice, proposed)) lastDecision = { source: 'perpetual-check-guard', move: moveKey(choice) };
    if (!choice) {
      state.winner = myColor;
      aiThinking = false;
      render();
      return;
    }

    const { from, to } = choice;
    const moving = state.board[from.y][from.x];
    const captured = state.board[to.y][to.x];
    const beforePosition = positionSnapshot(state);
    const wasHidden = Boolean(moving.h);
    const notationMoving = { ...moving, t: moving.h ? moving.o : moving.t };

    state.board[to.y][to.x] = moving;
    state.board[from.y][from.x] = null;
    if (state.board[to.y][to.x]?.h) state.board[to.y][to.x].h = false;
    lastMove = { from, to, capture: Boolean(captured), reveal: wasHidden };

    if (captured) {
      state.captures = state.captures || { red: [], black: [] };
      state.captures[aiColor].push({ t: captured.t, c: captured.c, hidden: Boolean(captured.h) });
    }

    if (captured?.t === 'K') state.winner = aiColor;
    state.turn = aiColor === 'red' ? 'black' : 'red';
    if (!state.winner && !hasAnyLegalMove(state.turn)) state.winner = aiColor;

    state.lastAction = { from, to, capture: Boolean(captured), reveal: wasHidden };
    recordMove(from, to, notationMoving, captured, beforePosition);
    aiThinking = false;
    playMoveSound(Boolean(captured));
    const givesCheck = !state.winner && inCheck(state.turn, state.board);
    render();
    showMoveEffects(Boolean(captured), state.winner, to, givesCheck);
  };

  window.ChuhePlatform = window.ChuhePlatform || {};
  window.ChuhePlatform.ai = {
    get difficulty() { return difficulty; },
    get profiles() { return globalThis.ChuheAI.profiles; },
    get lastSearch() { return globalThis.ChuheAI.getLastSearchStats?.() || null; },
    get lastDecision() { return lastDecision ? { ...lastDecision } : null; },
    get openingBookLines() { return Object.keys(OPENING_BOOK).length; },
    setDifficulty(value) {
      if (['easy', 'normal', 'hard'].includes(value)) {
        difficulty = value;
        localStorage.setItem(KEY, value);
        const select = document.querySelector('#ai-difficulty');
        if (select) select.value = value;
      }
    }
  };

  installControl();
})();