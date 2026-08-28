(() => {
  const pieceNames = {
    red: { R: '俥', H: '傌', E: '相', A: '仕', K: '帥', C: '炮', P: '兵' },
    black: { R: '車', H: '馬', E: '象', A: '士', K: '將', C: '砲', P: '卒' },
  };
  let focusPoint = { x: 4, y: 9 };

  function coordinateLabel(x, y) {
    return `第 ${10 - y} 排，第 ${x + 1} 路`;
  }

  function pieceLabel(piece) {
    if (!piece) return '空位';
    const color = piece.c === 'red' ? '紅方' : '黑方';
    if (piece.h) return `${color}暗子`;
    return `${color}${pieceNames[piece.c]?.[piece.t] || '棋子'}`;
  }

  function logicalStep(key) {
    const blackView = myColor === 'black';
    if (key === 'ArrowRight') return blackView ? [-1, 0] : [1, 0];
    if (key === 'ArrowLeft') return blackView ? [1, 0] : [-1, 0];
    if (key === 'ArrowDown') return blackView ? [0, -1] : [0, 1];
    if (key === 'ArrowUp') return blackView ? [0, 1] : [0, -1];
    return null;
  }

  function enhanceBoard() {
    if (!boardEl) return;
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-rowcount', '10');
    boardEl.setAttribute('aria-colcount', '9');
    boardEl.setAttribute('aria-describedby', 'board-keyboard-help');

    let help = document.querySelector('#board-keyboard-help');
    if (!help) {
      help = document.createElement('p');
      help.id = 'board-keyboard-help';
      help.className = 'sr-only';
      help.textContent = '使用方向鍵在棋盤格之間移動，按 Enter 或空白鍵選擇棋子或落子。';
      boardEl.insertAdjacentElement('beforebegin', help);
    }

    const cells = Array.from(boardEl.querySelectorAll('.cell'));
    const activeExists = cells.some((cell) => Number(cell.dataset.x) === focusPoint.x && Number(cell.dataset.y) === focusPoint.y);
    if (!activeExists) focusPoint = { x: 4, y: myColor === 'black' ? 0 : 9 };

    cells.forEach((cell) => {
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      const piece = state.board?.[y]?.[x] || null;
      const isTarget = cell.classList.contains('target') || cell.classList.contains('capture');
      const selectedHere = selected?.x === x && selected?.y === y;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-rowindex', String(y + 1));
      cell.setAttribute('aria-colindex', String(x + 1));
      cell.setAttribute('aria-selected', selectedHere ? 'true' : 'false');
      cell.tabIndex = x === focusPoint.x && y === focusPoint.y ? 0 : -1;
      cell.setAttribute('aria-label', `${coordinateLabel(x, y)}，${pieceLabel(piece)}${selectedHere ? '，已選取' : ''}${isTarget ? (piece ? '，可吃子' : '，可落子') : ''}`);
      const pieceButton = cell.querySelector('.piece');
      if (pieceButton) {
        pieceButton.tabIndex = -1;
        pieceButton.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function enhanceLiveRegions() {
    const status = document.querySelector('#status');
    if (status) {
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
    }
    const toastEl = document.querySelector('#toast');
    if (toastEl) {
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
    }
    const playersEl = document.querySelector('#players');
    if (playersEl) {
      playersEl.setAttribute('role', 'region');
      playersEl.setAttribute('aria-label', '對局玩家');
    }
  }

  boardEl?.addEventListener('focusin', (event) => {
    const cell = event.target.closest?.('.cell');
    if (!cell) return;
    focusPoint = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
  });

  boardEl?.addEventListener('keydown', (event) => {
    const cell = event.target.closest?.('.cell');
    if (!cell) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      cell.click();
      requestAnimationFrame(() => {
        boardEl.querySelector(`.cell[data-x="${focusPoint.x}"][data-y="${focusPoint.y}"]`)?.focus();
      });
      return;
    }
    const step = logicalStep(event.key);
    if (!step) return;
    event.preventDefault();
    const x = Math.max(0, Math.min(8, Number(cell.dataset.x) + step[0]));
    const y = Math.max(0, Math.min(9, Number(cell.dataset.y) + step[1]));
    focusPoint = { x, y };
    const next = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (next) {
      boardEl.querySelectorAll('.cell').forEach((node) => { node.tabIndex = -1; });
      next.tabIndex = 0;
      next.focus();
    }
  });

  const baseRender = render;
  render = function accessibleRender() {
    baseRender();
    enhanceBoard();
    enhanceLiveRegions();
  };

  const baseRenderPlayers = renderPlayers;
  renderPlayers = function accessibleRenderPlayers() {
    baseRenderPlayers();
    const nodes = Array.from(document.querySelectorAll('#players .player'));
    nodes.forEach((node, index) => {
      const player = players[index];
      if (!player) return;
      const side = player.color === 'red' ? '紅方' : player.color === 'black' ? '黑方' : '觀戰';
      const presence = player.online === false ? '暫離' : '在線';
      node.setAttribute('aria-label', `${side}，${player.name || '棋友'}，${presence}`);
      let text = node.querySelector('.presence-text');
      if (!text) {
        text = document.createElement('small');
        text.className = 'presence-text';
        node.appendChild(text);
      }
      text.textContent = presence;
      text.dataset.state = player.online === false ? 'offline' : 'online';
    });
  };

  enhanceLiveRegions();
  render();
  renderPlayers();
})();
