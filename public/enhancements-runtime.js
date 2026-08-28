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

(() => {
  if (typeof socket === 'undefined' || typeof renderPlayers !== 'function' || typeof showGame !== 'function') return;

  const joinForm = document.querySelector('#join-form');
  const joinButton = joinForm?.querySelector('button[type="submit"]');
  const copyButton = document.querySelector('#copy-link');
  const roomLabel = document.querySelector('#room-label');
  let previousPlayerCount = 0;
  let pendingOperations = 0;

  function ensurePresence() {
    let presence = document.querySelector('#room-presence');
    if (!presence && roomLabel) {
      presence = document.createElement('p');
      presence.id = 'room-presence';
      presence.className = 'room-presence';
      presence.setAttribute('role', 'status');
      presence.setAttribute('aria-live', 'polite');
      roomLabel.insertAdjacentElement('afterend', presence);
    }
    return presence;
  }

  function updatePresence() {
    const presence = ensurePresence();
    if (!presence) return;
    if (localMode) {
      presence.hidden = true;
      return;
    }
    presence.hidden = false;
    const seated = players.filter((player) => player.color === 'red' || player.color === 'black');
    if (seated.length < 2) {
      presence.dataset.state = 'waiting';
      presence.textContent = '等待另一位棋友加入…';
    } else {
      presence.dataset.state = 'ready';
      presence.textContent = '雙方已就位，可以開始對弈';
    }
  }

  function setControlBusy(element, busy, busyLabel) {
    if (!element) return;
    if (busy) {
      if (!element.dataset.idleLabel) element.dataset.idleLabel = element.textContent;
      element.disabled = true;
      element.classList.add('is-loading');
      if (busyLabel) element.textContent = busyLabel;
    } else {
      element.disabled = false;
      element.classList.remove('is-loading');
      if (element.dataset.idleLabel) element.textContent = element.dataset.idleLabel;
    }
  }

  const controls = {
    'join-room': [joinButton, '進入棋局中…'],
    restart: [document.querySelector('#restart'), '重新開局中…'],
    'request-undo': [document.querySelector('#undo-request'), '送出請求中…'],
    'respond-undo': [document.querySelector('#undo-accept'), '處理中…'],
    'change-color': [null, '切換中…'],
    'custom-setup': [document.querySelector('#setup-save'), '套用中…'],
    move: [null, '同步中…'],
  };

  const baseEmit = socket.emit.bind(socket);
  socket.emit = async function roomUxEmit(event, payload, callback) {
    const [control, busyLabel] = controls[event] || [];
    pendingOperations += 1;
    document.body.classList.add('network-busy');
    if (event === 'change-color') {
      setControlBusy(document.querySelector('#choose-red'), true, '切換中…');
      setControlBusy(document.querySelector('#choose-black'), true, '切換中…');
    } else {
      setControlBusy(control, true, busyLabel);
    }

    try {
      return await baseEmit(event, payload, callback);
    } finally {
      pendingOperations = Math.max(0, pendingOperations - 1);
      if (event === 'change-color') {
        setControlBusy(document.querySelector('#choose-red'), false);
        setControlBusy(document.querySelector('#choose-black'), false);
        if (typeof renderSideChoice === 'function') renderSideChoice();
      } else {
        setControlBusy(control, false);
      }
      if (!pendingOperations) document.body.classList.remove('network-busy');
    }
  };

  const baseRenderPlayers = renderPlayers;
  renderPlayers = function roomUxRenderPlayers() {
    const before = previousPlayerCount;
    baseRenderPlayers();
    const current = players.filter((player) => player.color === 'red' || player.color === 'black').length;
    if (!localMode && before > 0 && current > before) {
      const newest = players[players.length - 1];
      toast(`${newest?.name || '棋友'} 已加入房間`);
    }
    previousPlayerCount = current;
    updatePresence();
  };

  const baseShowGame = showGame;
  showGame = function roomUxShowGame(result) {
    previousPlayerCount = (result.players || []).filter((player) => player.color === 'red' || player.color === 'black').length;
    baseShowGame(result);
    updatePresence();
  };

  if (copyButton) {
    copyButton.onclick = async () => {
      const idle = copyButton.textContent;
      try {
        await navigator.clipboard.writeText(location.href);
        copyButton.textContent = '已複製邀請連結 ✓';
        copyButton.classList.add('copy-success');
        toast('邀請連結已複製');
      } catch {
        toast('無法自動複製，請手動複製網址');
      } finally {
        setTimeout(() => {
          copyButton.textContent = idle;
          copyButton.classList.remove('copy-success');
        }, 1600);
      }
    };
  }

  async function copyRoomCode() {
    if (!roomId || localMode) return;
    try {
      await navigator.clipboard.writeText(roomId);
      toast(`房間代碼 ${roomId} 已複製`);
    } catch {
      toast(`房間代碼：${roomId}`);
    }
  }

  if (roomLabel) {
    roomLabel.classList.add('room-label-copyable');
    roomLabel.title = '點擊複製房間代碼';
    roomLabel.tabIndex = 0;
    roomLabel.addEventListener('click', copyRoomCode);
    roomLabel.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        copyRoomCode();
      }
    });
  }
})();
