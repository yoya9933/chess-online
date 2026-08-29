(() => {
  const codec = window.ChuheRecordCodec;
  if (!codec) return;
  const platform = window.ChuhePlatform = window.ChuhePlatform || {};
  const analysis = platform.analysis = window.ChuheAnalysis = window.ChuheAnalysis || { annotations: {}, branchFrom: null };

  function currentHistory() {
    return (replayActive ? liveState?.history : officialState()?.history) || [];
  }
  function jumpTo(index) {
    const history = currentHistory();
    if (!history.length) return;
    if (!replayActive) startReplay();
    const list = liveState?.history || history;
    const next = Math.max(0, Math.min(Number(index), list.length - 1));
    replayIndex = next;
    state = { ...cloneState(list[next].position), history: cloneState(list) };
    selected = null; lastMove = null; render();
  }
  function renderMoveList() {
    const list = document.querySelector('#analysis-moves');
    if (!list) return;
    const history = currentHistory();
    list.innerHTML = history.map((item, index) => {
      const note = analysis.annotations[index] ? '<i aria-label="有註記">•</i>' : '';
      return `<button type="button" data-ply="${index}" class="analysis-move${replayActive && replayIndex === index ? ' active' : ''}"><span>${index === 0 ? '開局' : `${index}. ${escapeHtml(item.label || '—')}`}</span>${note}</button>`;
    }).join('');
    list.querySelectorAll('[data-ply]').forEach((button) => button.addEventListener('click', () => jumpTo(Number(button.dataset.ply))));
  }
  function renderNote() {
    const textarea = document.querySelector('#analysis-note');
    const label = document.querySelector('#analysis-note-label');
    if (!textarea || !label) return;
    const ply = replayActive ? replayIndex : Math.max(0, currentHistory().length - 1);
    label.textContent = `${ply === 0 ? '開局' : `第 ${ply} 手`}註記`;
    if (document.activeElement !== textarea) textarea.value = analysis.annotations[ply] || '';
  }
  function renderAnalysis() { renderMoveList(); renderNote(); }

  function ensurePanel() {
    const replayPanel = document.querySelector('#replay-panel');
    if (!replayPanel || document.querySelector('#analysis-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'analysis-panel'; panel.className = 'analysis-panel';
    panel.innerHTML = `
      <div class="analysis-toolbar">
        <label class="text-button analysis-import">匯入 .xqg<input id="record-import" type="file" accept=".xqg,text/plain" hidden></label>
        <button id="analysis-branch" class="text-button" type="button">從此手分析</button>
      </div>
      <div id="analysis-moves" class="analysis-moves" aria-label="棋譜著法列表"></div>
      <label class="analysis-note"><span id="analysis-note-label">逐手註記</span><textarea id="analysis-note" rows="2" maxlength="500" placeholder="記錄這一手的想法、變化或錯誤"></textarea></label>
      <button id="analysis-note-save" class="secondary" type="button">儲存註記</button>`;
    replayPanel.appendChild(panel);

    panel.querySelector('#record-import').addEventListener('change', async (event) => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        const parsed = codec.parse(await file.text());
        if (parsed.legacy) { toast('XQPGN/1 僅含著法文字，無法還原局面；請使用新版棋譜'); return; }
        const payload = parsed.payload;
        analysis.annotations = cloneState(payload.annotations || {}); analysis.branchFrom = null;
        localMode = true; myColor = 'spectator'; roomId = payload.metadata?.room || '棋譜';
        players = [{ name: payload.metadata?.red || '紅方', color: 'red' }, { name: payload.metadata?.black || '黑方', color: 'black' }];
        state = cloneState(payload.finalState); state.history = cloneState(payload.history);
        document.querySelector('#lobby')?.classList.add('hidden'); document.querySelector('#game')?.classList.remove('hidden');
        document.querySelector('#game-title').textContent = '匯入棋譜分析'; document.querySelector('#room-label').textContent = `棋譜 · ${file.name}`;
        renderPlayers(); render(); startReplay(); renderAnalysis(); toast('棋譜已匯入');
      } catch (error) { toast(error.message || '棋譜匯入失敗'); }
      event.target.value = '';
    });
    panel.querySelector('#analysis-note-save').addEventListener('click', () => {
      const ply = replayActive ? replayIndex : Math.max(0, currentHistory().length - 1);
      const value = panel.querySelector('#analysis-note').value.trim();
      if (value) analysis.annotations[ply] = value; else delete analysis.annotations[ply];
      renderAnalysis(); toast('註記已儲存');
    });
    panel.querySelector('#analysis-branch').addEventListener('click', () => {
      if (!replayActive) { toast('請先進入棋譜回放並選擇起始手'); return; }
      analysis.branchFrom = replayIndex; const base = replayIndex; enterSandbox(); toast(`已從第 ${base} 手建立分析分支`);
    });
  }

  ensurePanel();
  const baseRenderReplay = renderReplay;
  renderReplay = function analysisReplayRender() { baseRenderReplay(); ensurePanel(); renderAnalysis(); };
  analysis.jumpTo = jumpTo;
  analysis.parse = codec.parse;
  renderAnalysis();
})();
