(() => {
  const platform = window.ChuhePlatform = window.ChuhePlatform || {};

  function colorName(color) {
    return color === 'red' ? '紅方' : color === 'black' ? '黑方' : '觀戰者';
  }
  function resultLabel(result) {
    const labels = {
      resign: '認輸',
      'draw-agreed': '協議和棋',
      repetition: '三次重複局面',
      'long-check': '長將循環判負',
      checkmate: '將死',
      'king-capture': '將帥被吃',
      'no-legal-move': '無合法著法',
      timeout: '時間到',
    };
    return labels[result?.type] || '棋局結束';
  }
  function finishedText(result) {
    if (!result?.finished) return '';
    if (result.type === 'timeout') {
      if (result.resultText) return result.resultText;
      const loser = result.loser === 'black' ? 'black' : 'red';
      const winner = result.winner === 'red' || result.winner === 'black'
        ? result.winner
        : (loser === 'red' ? 'black' : 'red');
      return `${colorName(loser)}超時，${colorName(winner)}勝`;
    }
    const reason = resultLabel(result);
    return result.winner ? `${colorName(result.winner)}勝出 · ${reason}` : `和棋 · ${reason}`;
  }
  async function api(action, extra = {}) {
    const response = await fetch('/api/adjudication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Player-Token': playerToken,
      },
      body: JSON.stringify({ action, roomId, ...extra }),
      cache: 'no-store',
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(data.error || '操作失敗');
      error.requestId = response.headers.get('X-Request-ID') || '';
      window.reportAppError?.(error);
      throw error;
    }
    await pollRoom();
    return data;
  }

  function ensurePanel() {
    let panel = document.querySelector('#adjudication-panel');
    if (panel) return panel;
    const actions = document.querySelector('.actions');
    if (!actions) return null;
    panel = document.createElement('section');
    panel.id = 'adjudication-panel';
    panel.className = 'platform-panel adjudication-panel';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <p class="side-section-title">棋局裁決</p>
      <div class="platform-button-row">
        <button id="draw-request" class="text-button" type="button">提議和棋</button>
        <button id="resign-game" class="text-button danger" type="button">認輸</button>
      </div>
      <div id="draw-response" class="platform-request hidden">
        <span id="draw-message">對方提議和棋</span>
        <div class="platform-button-row">
          <button id="draw-accept" class="secondary" type="button">同意和棋</button>
          <button id="draw-reject" class="secondary" type="button">繼續對局</button>
        </div>
      </div>`;
    actions.parentNode.insertBefore(panel, actions);
    panel.querySelector('#draw-request').addEventListener('click', async () => {
      try { await api('request-draw'); toast('和棋請求已送出'); } catch (error) { toast(error.message); }
    });
    panel.querySelector('#resign-game').addEventListener('click', async () => {
      if (!confirm('確定要認輸並結束這盤棋嗎？')) return;
      try { await api('resign'); } catch (error) { toast(error.message); }
    });
    panel.querySelector('#draw-accept').addEventListener('click', async () => {
      try { await api('respond-draw', { accept: true }); } catch (error) { toast(error.message); }
    });
    panel.querySelector('#draw-reject').addEventListener('click', async () => {
      try { await api('respond-draw', { accept: false }); toast('已拒絕和棋，繼續對局'); } catch (error) { toast(error.message); }
    });
    return panel;
  }

  function renderAdjudication() {
    const panel = ensurePanel();
    if (!panel) return;
    const isPlayer = !localMode && (myColor === 'red' || myColor === 'black');
    panel.classList.toggle('hidden', !isPlayer);
    if (!isPlayer) return;
    const finished = Boolean(state?.result?.finished || state?.winner);
    const requestBy = state?.drawRequestBy || null;
    const mine = requestBy === myColor;
    const response = panel.querySelector('#draw-response');
    response.classList.toggle('hidden', !requestBy || mine || finished);
    if (requestBy && !mine && !finished) panel.querySelector('#draw-message').textContent = `${colorName(requestBy)}提議和棋`;
    const drawButton = panel.querySelector('#draw-request');
    drawButton.disabled = finished || Boolean(requestBy) || players.filter((p) => p.color !== 'spectator').length < 2;
    drawButton.textContent = mine ? '等待對方回覆…' : '提議和棋';
    panel.querySelector('#resign-game').disabled = finished;
    if (state?.result?.finished) {
      const text = finishedText(state.result);
      const status = document.querySelector('#status');
      if (status) status.textContent = text;
      document.title = `${text} · 楚河棋局`;
    }
  }

  const baseRender = render;
  render = function platformRender() {
    baseRender();
    renderAdjudication();
  };
  const baseClickCell = clickCell;
  clickCell = function platformClickCell(...args) {
    if (state?.result?.finished || state?.winner === 'draw') return;
    return baseClickCell(...args);
  };

  platform.adjudication = { api, render: renderAdjudication, resultLabel, finishedText };
  renderAdjudication();
})();
