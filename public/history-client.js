(() => {
  const joinCard = document.querySelector('.join-card');
  if (!joinCard) return;

  const button = document.createElement('button');
  button.id = 'recent-games';
  button.type = 'button';
  button.className = 'secondary recent-games-button';
  button.textContent = '最近對局';
  joinCard.appendChild(button);

  const modal = document.createElement('div');
  modal.id = 'history-modal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <section class="history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div class="history-heading">
        <div><p class="eyebrow">MATCH HISTORY</p><h2 id="history-title">最近對局</h2></div>
        <button type="button" class="history-close" aria-label="關閉最近對局">×</button>
      </div>
      <div class="history-list" role="list"></div>
    </section>`;
  document.body.appendChild(modal);

  const list = modal.querySelector('.history-list');
  const closeButton = modal.querySelector('.history-close');

  function close() {
    modal.classList.add('hidden');
    button.focus();
  }

  function resultText(game) {
    if (game.winner === 'red') return `${game.redName} 勝`;
    if (game.winner === 'black') return `${game.blackName} 勝`;
    return '未完局';
  }

  function dateText(timestamp) {
    try {
      return new Intl.DateTimeFormat('zh-TW', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(timestamp));
    } catch {
      return '';
    }
  }

  function openReplay(game) {
    if (!game?.state) return;
    modal.classList.add('hidden');
    document.body.classList.add('history-mode');
    localMode = true;
    myColor = 'spectator';
    roomId = game.roomId;
    players = [
      { name: game.redName || '紅方', color: 'red' },
      { name: game.blackName || '黑方', color: 'black' },
    ];
    undoRequestedBy = null;
    lastMove = null;
    state = cloneState(game.state);
    selected = null;
    sandboxActive = false;
    replayActive = false;
    liveState = null;

    document.querySelector('#lobby')?.classList.add('hidden');
    document.querySelector('#game')?.classList.remove('hidden');
    document.querySelector('#copy-link')?.classList.add('hidden');
    document.querySelector('#room-label').textContent = `歷史對局 · ${game.roomId}`;
    document.querySelector('#game-title').textContent = game.variant === 'jieqi' ? '揭棋回放' : '象棋回放';
    const connection = document.querySelector('#connection');
    if (connection) {
      connection.classList.add('online');
      connection.innerHTML = '<i></i> 歷史棋譜';
    }
    history.replaceState(null, '', location.pathname);
    renderPlayers();
    renderUndo();
    renderSandbox();
    render();
    if ((state.history?.length || 0) > 1) startReplay();
  }

  function renderGames(games) {
    list.replaceChildren();
    if (!games.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = '目前還沒有已完成的線上對局。';
      list.appendChild(empty);
      return;
    }

    games.forEach((game) => {
      const item = document.createElement('article');
      item.className = 'history-item';
      item.setAttribute('role', 'listitem');

      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      const title = document.createElement('b');
      title.textContent = `${game.redName || '紅方'}  vs  ${game.blackName || '黑方'}`;
      const detail = document.createElement('small');
      detail.textContent = `${game.variant === 'jieqi' ? '揭棋' : '標準象棋'} · ${resultText(game)} · ${dateText(game.completedAt)}`;
      meta.append(title, detail);

      const replay = document.createElement('button');
      replay.type = 'button';
      replay.className = 'secondary';
      replay.textContent = '回放';
      replay.addEventListener('click', () => openReplay(game));

      item.append(meta, replay);
      list.appendChild(item);
    });
  }

  async function loadHistory() {
    list.innerHTML = '<div class="history-empty">正在讀取最近對局…</div>';
    modal.classList.remove('hidden');
    closeButton.focus();
    try {
      const response = await fetch('/api/history', {
        headers: { 'X-Player-Token': playerToken },
        cache: 'no-store',
      });
      const requestId = response.headers.get('X-Request-ID') || '';
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error || '無法讀取對局歷史');
        error.requestId = requestId;
        throw error;
      }
      renderGames(data.games || []);
    } catch (error) {
      list.replaceChildren();
      const failed = document.createElement('div');
      failed.className = 'history-empty history-error';
      failed.textContent = error.message || '無法讀取對局歷史';
      list.appendChild(failed);
      window.reportAppError?.(error);
    }
  }

  button.addEventListener('click', loadHistory);
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
})();
