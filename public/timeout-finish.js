(() => {
  if (typeof render !== 'function' || typeof clickCell !== 'function' || typeof boardEl === 'undefined') return;

  const platform = window.ChuhePlatform = window.ChuhePlatform || {};
  const runtime = platform.timeoutFinish = platform.timeoutFinish || { lastShownKey: null };

  function colorName(color) {
    return color === 'red' ? '紅方' : color === 'black' ? '黑方' : '未知方';
  }

  function timeoutCopy(result) {
    if (!result || result.type !== 'timeout') return null;
    const loser = result.loser === 'black' ? 'black' : 'red';
    const winner = result.winner === 'red' || result.winner === 'black'
      ? result.winner
      : (loser === 'red' ? 'black' : 'red');
    const resultText = result.resultText || `${colorName(loser)}超時，${colorName(winner)}勝`;
    return {
      loser,
      winner,
      title: '時間到',
      loserText: `${colorName(loser)}超時`,
      winnerText: `${colorName(winner)}勝`,
      resultText,
    };
  }

  function localClockExpired() {
    if (localMode || state?.result?.finished) return false;
    const clock = state?.clock;
    if (!clock?.configured || !clock.started || !clock.runningSince || !['red', 'black'].includes(clock.active)) return false;
    if (platform.clock?.expiredLocally) return true;
    const serverNow = Date.now() + Number(platform.clock?.serverOffset || 0);
    const elapsed = Math.max(0, serverNow - Number(clock.runningSince));
    return Number(clock[`${clock.active}Ms`] || 0) - elapsed <= 0;
  }

  function lockBoard(locked, pending = false) {
    boardEl.classList.toggle('timeout-locked', Boolean(locked));
    boardEl.setAttribute('aria-disabled', String(Boolean(locked)));
    document.body.classList.toggle('timeout-pending', Boolean(pending));
  }

  function playTimeoutSound() {
    if (!soundEnabled || typeof ensureAudio !== 'function' || typeof tone !== 'function') return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    tone(ctx, 880, now, 0.1, 0.085, 'square');
    tone(ctx, 880, now + 0.15, 0.1, 0.075, 'square');
    tone(ctx, 622, now + 0.31, 0.16, 0.09, 'triangle');
    tone(ctx, 330, now + 0.48, 0.34, 0.105, 'sine');
  }

  function showTimeoutFinish(result) {
    const copy = timeoutCopy(result);
    if (!copy) return;
    const key = `${roomId || 'room'}:${result.at || 0}:${copy.loser}:${copy.winner}`;
    if (runtime.lastShownKey === key) return;
    runtime.lastShownKey = key;

    document.querySelector('.timeout-fx')?.remove();
    const effect = document.createElement('div');
    effect.className = 'timeout-fx';
    effect.setAttribute('role', 'status');
    effect.setAttribute('aria-live', 'assertive');
    effect.setAttribute('aria-label', `${copy.title}，${copy.resultText}`);
    effect.innerHTML = `<div class="timeout-card"><span class="timeout-kicker">${copy.title}</span><strong>${copy.loserText}</strong><em>${copy.winnerText}</em></div>`;
    boardEl.appendChild(effect);

    const status = document.querySelector('#status');
    if (status) status.textContent = copy.resultText;
    document.title = `${copy.resultText} · 楚河棋局`;
    playTimeoutSound();
    setTimeout(() => effect.remove(), 2450);
  }

  function syncTimeoutFinish() {
    if (localMode) {
      lockBoard(false, false);
      document.querySelector('.timeout-fx')?.remove();
      return;
    }
    const result = state?.result;
    const authoritativeTimeout = Boolean(result?.finished && result.type === 'timeout');
    const pending = !authoritativeTimeout && localClockExpired();
    lockBoard(authoritativeTimeout || pending, pending);

    if (pending) {
      const status = document.querySelector('#status');
      if (status) status.textContent = '時間到 · 正在確認結果…';
    }
    if (authoritativeTimeout) showTimeoutFinish(result);
    if (!authoritativeTimeout && !pending) document.querySelector('.timeout-fx')?.remove();
  }

  const baseRender = render;
  render = function timeoutFinishRender() {
    baseRender();
    syncTimeoutFinish();
  };

  const baseClickCell = clickCell;
  clickCell = function timeoutFinishClickGuard(...args) {
    if (state?.result?.finished || localClockExpired()) {
      selected = null;
      syncTimeoutFinish();
      return;
    }
    return baseClickCell(...args);
  };

  window.addEventListener('chuhe:clock-expired-change', () => syncTimeoutFinish());
  runtime.render = syncTimeoutFinish;
  runtime.copy = timeoutCopy;
  syncTimeoutFinish();
})();
