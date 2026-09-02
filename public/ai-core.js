(() => {
  const VALUES = { K: 100000, R: 900, C: 450, H: 400, E: 220, A: 220, P: 120 };
  const MATE = 900000;
  const SEARCH_ABORT = Symbol('search-abort');

  // Piece-square tables are expressed from the moving side's point of view:
  // row 0 is its home rank and row 9 is the opponent's home rank.
  const PST = {
    K: [
      [0, 0, 0, 10, 14, 10, 0, 0, 0],
      [0, 0, 0, 8, 12, 8, 0, 0, 0],
      [0, 0, 0, 4, 6, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    R: [
      [0, 4, 6, 8, 10, 8, 6, 4, 0],
      [4, 8, 10, 12, 14, 12, 10, 8, 4],
      [4, 8, 12, 14, 16, 14, 12, 8, 4],
      [6, 10, 14, 16, 18, 16, 14, 10, 6],
      [6, 10, 14, 18, 20, 18, 14, 10, 6],
      [6, 10, 14, 18, 20, 18, 14, 10, 6],
      [6, 10, 14, 16, 18, 16, 14, 10, 6],
      [4, 8, 12, 14, 16, 14, 12, 8, 4],
      [4, 8, 10, 12, 14, 12, 10, 8, 4],
      [0, 4, 6, 8, 10, 8, 6, 4, 0]
    ],
    C: [
      [0, 2, 4, 6, 8, 6, 4, 2, 0],
      [2, 6, 8, 10, 12, 10, 8, 6, 2],
      [4, 8, 10, 12, 14, 12, 10, 8, 4],
      [4, 8, 12, 14, 16, 14, 12, 8, 4],
      [4, 8, 12, 16, 18, 16, 12, 8, 4],
      [4, 8, 12, 16, 18, 16, 12, 8, 4],
      [4, 8, 12, 14, 16, 14, 12, 8, 4],
      [4, 8, 10, 12, 14, 12, 10, 8, 4],
      [2, 6, 8, 10, 12, 10, 8, 6, 2],
      [0, 2, 4, 6, 8, 6, 4, 2, 0]
    ],
    H: [
      [-12, -8, -4, -2, 0, -2, -4, -8, -12],
      [-8, -2, 4, 8, 10, 8, 4, -2, -8],
      [-4, 4, 10, 14, 16, 14, 10, 4, -4],
      [-2, 8, 14, 18, 20, 18, 14, 8, -2],
      [0, 10, 16, 20, 24, 20, 16, 10, 0],
      [0, 10, 16, 20, 24, 20, 16, 10, 0],
      [-2, 8, 14, 18, 20, 18, 14, 8, -2],
      [-4, 4, 10, 14, 16, 14, 10, 4, -4],
      [-8, -2, 4, 8, 10, 8, 4, -2, -8],
      [-12, -8, -4, -2, 0, -2, -4, -8, -12]
    ],
    E: [
      [0, 0, 8, 0, 0, 0, 8, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [8, 0, 0, 0, 12, 0, 0, 0, 8],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 10, 0, 0, 0, 10, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    A: [
      [0, 0, 0, 6, 0, 6, 0, 0, 0],
      [0, 0, 0, 0, 10, 0, 0, 0, 0],
      [0, 0, 0, 6, 0, 6, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    P: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 2, 0, 4, 0, 2, 0, 0],
      [2, 4, 6, 8, 10, 8, 6, 4, 2],
      [6, 8, 10, 12, 14, 12, 10, 8, 6],
      [12, 14, 18, 22, 26, 22, 18, 14, 12],
      [18, 22, 26, 30, 34, 30, 26, 22, 18],
      [22, 26, 30, 34, 38, 34, 30, 26, 22],
      [24, 28, 32, 36, 40, 36, 32, 28, 24],
      [24, 28, 32, 36, 40, 36, 32, 28, 24]
    ]
  };

  const PROFILES = Object.freeze({
    easy: Object.freeze({ maxDepth: 2, nodeLimit: 3000, timeMs: 90, quiescenceDepth: 2, ttLimit: 5000, randomTop: 4, randomJitter: 120 }),
    normal: Object.freeze({ maxDepth: 5, nodeLimit: 32000, timeMs: 320, quiescenceDepth: 4, ttLimit: 36000, randomTop: 1, randomJitter: 0 }),
    hard: Object.freeze({ maxDepth: 8, nodeLimit: 120000, timeMs: 850, quiescenceDepth: 6, ttLimit: 100000, randomTop: 1, randomJitter: 0 })
  });

  let lastSearchStats = null;
  const opposite = (c) => c === 'red' ? 'black' : 'red';
  const clone = (b) => b.map((r) => r.map((p) => p ? { ...p } : null));
  const inside = (p) => p && p.x >= 0 && p.x < 9 && p.y >= 0 && p.y < 10;
  const now = () => globalThis.performance?.now?.() ?? Date.now();
  const moveKey = (m) => `${m.from.y}${m.from.x}${m.to.y}${m.to.x}`;
  const sameMoveKey = (m, key) => Boolean(m && key && moveKey(m) === key);

  function pathCount(f, t, b) {
    let n = 0;
    if (f.y === t.y) {
      for (let x = Math.min(f.x, t.x) + 1; x < Math.max(f.x, t.x); x++) if (b[f.y][x]) n++;
    } else {
      for (let y = Math.min(f.y, t.y) + 1; y < Math.max(f.y, t.y); y++) if (b[y][f.x]) n++;
    }
    return n;
  }

  function pseudo(f, t, b, variant = 'standard') {
    if (!inside(f) || !inside(t)) return false;
    const p = b[f.y]?.[f.x];
    const d = b[t.y]?.[t.x];
    if (!p || (d && d.c === p.c)) return false;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const red = p.c === 'red';
    // Hidden Jieqi pieces are searched only by their public movement identity.
    const type = p.h ? p.o : p.t;
    const free = variant === 'jieqi' && !p.h;
    if (type === 'R') return (dx === 0 || dy === 0) && pathCount(f, t, b) === 0;
    if (type === 'C') return (dx === 0 || dy === 0) && pathCount(f, t, b) === (d ? 1 : 0);
    if (type === 'H') return (ax === 2 && ay === 1 && !b[f.y][f.x + dx / 2]) || (ax === 1 && ay === 2 && !b[f.y + dy / 2][f.x]);
    if (type === 'E') return ax === 2 && ay === 2 && !b[f.y + dy / 2][f.x + dx / 2] && (free || (red ? t.y >= 5 : t.y <= 4));
    if (type === 'A') return ax === 1 && ay === 1 && (free || (t.x >= 3 && t.x <= 5 && (red ? t.y >= 7 : t.y <= 2)));
    if (type === 'K') {
      if (d?.t === 'K' && dx === 0 && pathCount(f, t, b) === 0) return true;
      return ax + ay === 1 && t.x >= 3 && t.x <= 5 && (red ? t.y >= 7 : t.y <= 2);
    }
    if (type === 'P') return (dy === (red ? -1 : 1) && dx === 0) || ((red ? f.y <= 4 : f.y >= 5) && dy === 0 && ax === 1);
    return false;
  }

  function inCheck(color, b, variant = 'standard') {
    let k;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) if (b[y]?.[x]?.t === 'K' && b[y][x].c === color) k = { y, x };
    if (!k) return true;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) if (b[y]?.[x] && b[y][x].c !== color && pseudo({ y, x }, k, b, variant)) return true;
    return false;
  }

  function apply(b, move) {
    const n = clone(b);
    const piece = n[move.from.y][move.from.x];
    const wasHidden = Boolean(piece?.h);
    // Search must not reveal a hidden true type. It substitutes the public wrapper
    // movement identity, while the real game state reveals normally in app.js.
    n[move.to.y][move.to.x] = { ...piece, h: false, t: wasHidden ? (piece.o || 'P') : piece.t, simulatedReveal: wasHidden };
    n[move.from.y][move.from.x] = null;
    return n;
  }

  function legal(color, f, t, b, variant = 'standard') {
    if (b[f?.y]?.[f?.x]?.c !== color || !pseudo(f, t, b, variant)) return false;
    return !inCheck(color, apply(b, { from: f, to: t }), variant);
  }

  function pieceValue(p) {
    if (!p) return 0;
    if (p.h) return 300;
    return VALUES[p.t] || 300;
  }

  function moves(b, color, variant = 'standard') {
    const out = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        if (b[y]?.[x]?.c !== color) continue;
        for (let ty = 0; ty < 10; ty++) {
          for (let tx = 0; tx < 9; tx++) {
            if (!legal(color, { y, x }, { y: ty, x: tx }, b, variant)) continue;
            const capture = b[ty][tx];
            out.push({
              from: { y, x },
              to: { y: ty, x: tx },
              capture: capture ? pieceValue(capture) : 0
            });
          }
        }
      }
    }
    return out;
  }

  function pstValue(p, x, y) {
    // A covered Jieqi piece deliberately receives no type-specific positional
    // bonus. Its actual identity is not public information.
    if (!p || p.h || !PST[p.t]) return 0;
    const row = p.c === 'red' ? 9 - y : y;
    return PST[p.t][row]?.[x] || 0;
  }

  function evaluate(b, perspective, variant = 'standard') {
    let score = 0;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const p = b[y][x];
        if (!p) continue;
        let v = pieceValue(p) + pstValue(p, x, y);
        if (!p.h && p.t === 'P') {
          const crossed = p.c === 'red' ? y <= 4 : y >= 5;
          if (crossed) v += 35;
        }
        score += (p.c === perspective ? 1 : -1) * v;
      }
    }
    if (inCheck(opposite(perspective), b, variant)) score += 28;
    if (inCheck(perspective, b, variant)) score -= 28;
    return score;
  }

  function positionKey(b, turn, variant) {
    // Do not include p.t for covered pieces. This is both a search key and an
    // information boundary: two positions differing only by secret identities
    // intentionally map to the same TT state.
    let key = `${variant === 'jieqi' ? 'j' : 's'}${turn === 'red' ? 'r' : 'b'}|`;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const p = b[y][x];
        if (!p) key += '.';
        else if (p.h) key += `${p.c === 'red' ? 'r' : 'b'}h${p.o || '?'};`;
        else key += `${p.c === 'red' ? 'r' : 'b'}${p.t || '?'};`;
      }
      key += '/';
    }
    return key;
  }

  function mateScore(turn, perspective, ply) {
    return turn === perspective ? -MATE + ply : MATE - ply;
  }

  function profileFor(difficulty, overrides = {}) {
    const base = PROFILES[difficulty] || PROFILES.normal;
    const p = { ...base };
    for (const key of ['maxDepth', 'nodeLimit', 'timeMs', 'quiescenceDepth', 'ttLimit', 'randomTop', 'randomJitter']) {
      if (Number.isFinite(overrides[key])) p[key] = Math.max(key === 'timeMs' ? 1 : 0, overrides[key]);
    }
    return p;
  }

  function visit(ctx, quiescence = false) {
    ctx.nodes++;
    if (quiescence) ctx.qNodes++;
    if (ctx.nodes >= ctx.profile.nodeLimit) throw SEARCH_ABORT;
    if ((ctx.nodes & 63) === 0 && now() >= ctx.deadline) throw SEARCH_ABORT;
  }

  function storeTT(ctx, key, entry) {
    if (ctx.tt.has(key) || ctx.tt.size < ctx.profile.ttLimit) {
      ctx.tt.set(key, entry);
      ctx.ttStores++;
    }
  }

  function recordCutoff(ctx, turn, move, depth, ply) {
    ctx.cutoffs++;
    if (move.capture) return;
    const key = moveKey(move);
    const killers = ctx.killers[ply] || [];
    if (!killers.includes(key)) ctx.killers[ply] = [key, ...killers].slice(0, 2);
    const historyKey = `${turn}:${key}`;
    ctx.history.set(historyKey, (ctx.history.get(historyKey) || 0) + Math.max(1, depth * depth));
  }

  function orderMoves(b, list, turn, variant, ctx, ply, ttBestKey = '') {
    const killer = ctx.killers[ply] || [];
    return list.map((move) => {
      const next = apply(b, move);
      const key = moveKey(move);
      const mover = b[move.from.y]?.[move.from.x];
      let order = 0;
      if (sameMoveKey(move, ttBestKey)) order += 1000000000;
      if (move.capture) order += 100000 + move.capture * 16 - Math.min(1200, pieceValue(mover));
      if (inCheck(opposite(turn), next, variant)) order += 18000;
      if (killer[0] === key) order += 9000;
      else if (killer[1] === key) order += 6000;
      order += ctx.history.get(`${turn}:${key}`) || 0;
      order += Math.max(0, 4 - Math.abs(move.to.x - 4)) * 5;
      return { move, next, order };
    }).sort((a, b) => b.order - a.order);
  }

  function quiescence(b, turn, perspective, variant, alpha, beta, ctx, depth, ply) {
    visit(ctx, true);
    const maximizing = turn === perspective;
    const checked = inCheck(turn, b, variant);
    const standPat = evaluate(b, perspective, variant);

    if (!checked) {
      if (maximizing) {
        if (standPat >= beta) return standPat;
        alpha = Math.max(alpha, standPat);
      } else {
        if (standPat <= alpha) return standPat;
        beta = Math.min(beta, standPat);
      }
      if (depth <= 0) return standPat;
    } else if (depth < -1) {
      return standPat;
    }

    let list = moves(b, turn, variant);
    if (!list.length) return mateScore(turn, perspective, ply);
    if (!checked) list = list.filter((move) => move.capture > 0);
    if (!list.length) return standPat;

    const ordered = orderMoves(b, list, turn, variant, ctx, ply);
    let best = checked ? (maximizing ? -Infinity : Infinity) : standPat;
    for (const item of ordered) {
      const score = quiescence(item.next, opposite(turn), perspective, variant, alpha, beta, ctx, depth - 1, ply + 1);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, best);
      }
      if (beta <= alpha) {
        recordCutoff(ctx, turn, item.move, 1, ply);
        break;
      }
    }
    return best;
  }

  function search(b, turn, perspective, variant, depth, alpha, beta, ctx, ply) {
    visit(ctx);
    if (depth <= 0) return quiescence(b, turn, perspective, variant, alpha, beta, ctx, ctx.profile.quiescenceDepth, ply);

    const key = positionKey(b, turn, variant);
    const alphaOriginal = alpha;
    const betaOriginal = beta;
    const cached = ctx.tt.get(key);
    let ttBestKey = '';
    if (cached) {
      ctx.ttMoveUses++;
      ttBestKey = cached.bestMove || '';
      if (cached.depth >= depth) {
        ctx.ttHits++;
        if (cached.flag === 'EXACT') return cached.score;
        if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
        else if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
        if (alpha >= beta) return cached.score;
      }
    }

    const list = moves(b, turn, variant);
    if (!list.length) return mateScore(turn, perspective, ply);
    const ordered = orderMoves(b, list, turn, variant, ctx, ply, ttBestKey);
    const maximizing = turn === perspective;
    let best = maximizing ? -Infinity : Infinity;
    let bestMove = ordered[0].move;

    for (const item of ordered) {
      const score = search(item.next, opposite(turn), perspective, variant, depth - 1, alpha, beta, ctx, ply + 1);
      if ((maximizing && score > best) || (!maximizing && score < best)) {
        best = score;
        bestMove = item.move;
      }
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) {
        recordCutoff(ctx, turn, item.move, depth, ply);
        break;
      }
    }

    const flag = best <= alphaOriginal ? 'UPPER' : best >= betaOriginal ? 'LOWER' : 'EXACT';
    storeTT(ctx, key, { depth, score: best, flag, bestMove: moveKey(bestMove) });
    return best;
  }

  function rootSearch(board, color, variant, depth, ctx) {
    const key = positionKey(board, color, variant);
    const cached = ctx.tt.get(key);
    const list = moves(board, color, variant);
    if (!list.length) return { move: null, score: -MATE, scored: [] };
    const ordered = orderMoves(board, list, color, variant, ctx, 0, cached?.bestMove || '');
    let alpha = -Infinity;
    const beta = Infinity;
    let bestScore = -Infinity;
    let bestMove = ordered[0].move;
    const scored = [];

    for (const item of ordered) {
      const score = search(item.next, opposite(color), color, variant, depth - 1, alpha, beta, ctx, 1);
      scored.push({ move: item.move, score });
      if (score > bestScore) {
        bestScore = score;
        bestMove = item.move;
      }
      alpha = Math.max(alpha, bestScore);
    }

    scored.sort((a, b) => b.score - a.score);
    storeTT(ctx, key, { depth, score: bestScore, flag: 'EXACT', bestMove: moveKey(bestMove) });
    return { move: bestMove, score: bestScore, scored };
  }

  function chooseMove(board, color, variant = 'standard', difficulty = 'normal', overrides = {}) {
    const profile = profileFor(difficulty, overrides);
    const start = now();
    const ctx = {
      profile,
      deadline: start + profile.timeMs,
      nodes: 0,
      qNodes: 0,
      tt: new Map(),
      ttHits: 0,
      ttMoveUses: 0,
      ttStores: 0,
      cutoffs: 0,
      killers: [],
      history: new Map()
    };

    const legal = moves(board, color, variant);
    if (!legal.length) {
      lastSearchStats = {
        difficulty,
        maxDepth: profile.maxDepth,
        completedDepth: 0,
        nodes: 0,
        qNodes: 0,
        ttHits: 0,
        ttMoveUses: 0,
        ttStores: 0,
        ttSize: 0,
        cutoffs: 0,
        elapsedMs: Math.round((now() - start) * 10) / 10,
        score: -MATE,
        aborted: false
      };
      return null;
    }

    let bestMove = legal[0];
    let bestScore = -Infinity;
    let completedDepth = 0;
    let lastScored = legal.map((move) => ({ move, score: -Infinity }));
    let aborted = false;

    for (let depth = 1; depth <= profile.maxDepth; depth++) {
      if (depth > 1 && now() >= ctx.deadline) {
        aborted = true;
        break;
      }
      try {
        const result = rootSearch(board, color, variant, depth, ctx);
        if (result.move) {
          bestMove = result.move;
          bestScore = result.score;
          lastScored = result.scored;
          completedDepth = depth;
        }
        if (Math.abs(bestScore) >= MATE - 100) break;
      } catch (error) {
        if (error !== SEARCH_ABORT) throw error;
        aborted = true;
        break;
      }
    }

    if (difficulty === 'easy' && lastScored.length > 1) {
      const candidates = lastScored.slice(0, Math.min(profile.randomTop, lastScored.length)).map((entry) => ({
        ...entry,
        noisyScore: entry.score + (Math.random() - 0.5) * profile.randomJitter
      })).sort((a, b) => b.noisyScore - a.noisyScore);
      bestMove = candidates[Math.floor(Math.random() * Math.min(profile.randomTop, candidates.length))]?.move || bestMove;
    }

    lastSearchStats = {
      difficulty,
      maxDepth: profile.maxDepth,
      completedDepth,
      nodes: ctx.nodes,
      qNodes: ctx.qNodes,
      ttHits: ctx.ttHits,
      ttMoveUses: ctx.ttMoveUses,
      ttStores: ctx.ttStores,
      ttSize: ctx.tt.size,
      cutoffs: ctx.cutoffs,
      elapsedMs: Math.round((now() - start) * 10) / 10,
      score: bestScore,
      aborted
    };
    return bestMove;
  }

  globalThis.ChuheAI = {
    chooseMove,
    evaluate,
    legalMoves: moves,
    applyMove: apply,
    getLastSearchStats: () => lastSearchStats ? { ...lastSearchStats } : null,
    profiles: PROFILES
  };
})();
