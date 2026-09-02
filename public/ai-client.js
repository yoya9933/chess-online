(() => {
  if (!globalThis.ChuheAI) return;
  const KEY = 'xiangqi-ai-difficulty';
  let difficulty = localStorage.getItem(KEY) || 'normal';

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
  const sameMove = (a, b) => a?.from?.x === b?.from?.x && a?.from?.y === b?.from?.y && a?.to?.x === b?.to?.x && a?.to?.y === b?.to?.y;
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

  makeAiMove = function makeAiMoveV3() {
    if (!localMode || sandboxActive || replayActive || setupActive || state.winner || state.turn === myColor) {
      aiThinking = false;
      render();
      return;
    }

    const aiColor = state.turn;
    const choice = avoidPerpetualCheck(globalThis.ChuheAI.chooseMove(state.board, aiColor, state.variant || 'standard', difficulty), aiColor);
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