(() => {
  if (typeof officialState !== 'function' || typeof recordText !== 'function') return;

  function headerValue(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
  }

  function sideName(color) {
    return players.find((player) => player.color === color)?.name || (color === 'red' ? '紅方' : '黑方');
  }

  function resultCode(winner) {
    if (winner === 'red') return '1-0';
    if (winner === 'black') return '0-1';
    return '*';
  }

  function buildRecordText() {
    const game = officialState();
    const version = document.querySelector('#app-version')?.textContent?.trim().split(' · ')[0] || 'unknown';
    const headers = [
      ['Format', 'XQPGN/1'],
      ['App', '楚河棋局'],
      ['Version', version],
      ['Variant', game?.variant || 'standard'],
      ['Room', roomId || 'local'],
      ['Red', sideName('red')],
      ['Black', sideName('black')],
      ['Result', resultCode(game?.winner)],
    ].map(([key, value]) => `[${key} "${headerValue(value)}"]`).join('\n');

    const moves = (game?.history || []).slice(1).map((item, index) => `${index + 1}. ${item.label || '—'}`);
    return `${headers}\n\n${moves.join('\n')}\n\n${resultCode(game?.winner)}`;
  }

  recordText = buildRecordText;
  window.xiangqiRecordText = buildRecordText;

  const shareRow = document.querySelector('.replay-share');
  if (shareRow && !document.querySelector('#record-download')) {
    const download = document.createElement('button');
    download.id = 'record-download';
    download.className = 'text-button';
    download.type = 'button';
    download.textContent = '下載棋譜';
    download.addEventListener('click', () => {
      const blob = new Blob([buildRecordText()], { type: 'text/plain;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `chuhe-${roomId || 'local'}-${new Date().toISOString().slice(0, 10)}.xqg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      if (typeof toast === 'function') toast('棋譜已下載');
    });
    shareRow.appendChild(download);
  }

  const replayPanel = document.querySelector('#replay-panel');
  let slider = document.querySelector('#replay-slider');
  if (replayPanel && !slider) {
    const wrap = document.createElement('label');
    wrap.className = 'replay-progress hidden';
    wrap.innerHTML = '<span>回放進度</span><input id="replay-slider" type="range" min="0" max="0" value="0" step="1"><output>0 / 0</output>';
    replayPanel.querySelector('.replay-buttons')?.insertAdjacentElement('afterend', wrap);
    slider = wrap.querySelector('input');
    slider.addEventListener('input', () => {
      if (!replayActive || !liveState?.history?.length) return;
      const next = Math.max(0, Math.min(Number(slider.value), liveState.history.length - 1));
      replayIndex = next;
      state = { ...cloneState(liveState.history[next].position), history: cloneState(liveState.history) };
      selected = null;
      lastMove = null;
      render();
    });
  }

  const baseRenderReplay = renderReplay;
  renderReplay = function enhancedRecordReplay() {
    baseRenderReplay();
    const wrap = document.querySelector('.replay-progress');
    const input = document.querySelector('#replay-slider');
    const output = wrap?.querySelector('output');
    const game = officialState();
    const total = Math.max(0, (game?.history?.length || 1) - 1);
    if (!wrap || !input) return;
    wrap.classList.toggle('hidden', !replayActive);
    input.max = String(total);
    input.value = String(Math.min(replayIndex, total));
    if (output) output.textContent = `${Math.min(replayIndex, total)} / ${total}`;
  };
})();
