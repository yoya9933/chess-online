(() => {
  if (typeof ensureAudio !== 'function' || typeof tone !== 'function' || typeof showMoveEffects !== 'function') return;

  function playChessSfx(kind) {
    if (!soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (kind === 'capture') {
      tone(ctx, 190, now, 0.11, 0.14, 'square');
      tone(ctx, 118, now + 0.055, 0.2, 0.1, 'sine');
      return;
    }
    if (kind === 'check') {
      tone(ctx, 470, now, 0.1, 0.1, 'triangle');
      tone(ctx, 620, now + 0.085, 0.15, 0.1, 'triangle');
      return;
    }
    if (kind === 'victory') {
      tone(ctx, 392, now, 0.13, 0.09, 'triangle');
      tone(ctx, 523, now + 0.11, 0.15, 0.1, 'triangle');
      tone(ctx, 659, now + 0.23, 0.24, 0.11, 'triangle');
      return;
    }
    if (kind === 'defeat') {
      tone(ctx, 330, now, 0.14, 0.08, 'sine');
      tone(ctx, 247, now + 0.12, 0.18, 0.08, 'sine');
      tone(ctx, 165, now + 0.26, 0.28, 0.09, 'sine');
      return;
    }
    tone(ctx, 350, now, 0.075, 0.09, 'triangle');
    tone(ctx, 245, now + 0.022, 0.07, 0.05, 'sine');
  }

  playMoveSound = function enhancedMoveSound(capture = false) {
    playChessSfx(capture ? 'capture' : 'move');
  };

  const baseShowMoveEffects = showMoveEffects;
  showMoveEffects = function enhancedMoveEffects(capture, winner, to, check = false) {
    baseShowMoveEffects(capture, winner, to, check);
    if (winner) {
      const outcome = winner === myColor || (localMode && winner === myColor) ? 'victory' : 'defeat';
      setTimeout(() => playChessSfx(outcome), capture ? 240 : 80);
    } else if (check) {
      setTimeout(() => playChessSfx('check'), capture ? 190 : 70);
    }
  };

  updateSoundToggle();
})();
