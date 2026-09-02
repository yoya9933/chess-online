(() => {
  if (typeof officialState !== 'function' || typeof recordText !== 'function') return;

  function headerValue(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
  }
  function sideName(color) {
    return players.find((player) => player.color === color)?.name || (color === 'red' ? '紅方' : '黑方');
  }
  function resultCode(game) {
    if (game?.result?.finished && !game.result.winner) return '1/2-1/2';
    if (game?.winner === 'red') return '1-0';
    if (game?.winner === 'black') return '0-1';
    if (game?.winner === 'draw') return '1/2-1/2';
    return '*';
  }
  function resultDescription(game) {
    if (game?.result?.resultText) return game.result.resultText;
    if (game?.result?.type === 'timeout') {
      const loser = game.result.loser === 'black' ? 'black' : 'red';
      const winner = game.result.winner === 'red' || game.result.winner === 'black'
        ? game.result.winner
        : (loser === 'red' ? 'black' : 'red');
      return `${sideName(loser)}超時，${sideName(winner)}勝`;
    }
    if (game?.result?.finished && !game.result.winner) return '和棋';
    if (game?.winner === 'red') return `${sideName('red')}勝`;
    if (game?.winner === 'black') return `${sideName('black')}勝`;
    return '未完局';
  }
  function parseHeaders(text) {
    const headers = {};
    for (const match of text.matchAll(/^\[([^\s]+)\s+"((?:\\.|[^"])*)"\]$/gm)) {
      headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return headers;
  }
  function recordPayload() {
    const game = officialState();
    return {
      format: 'XQPGN/2',
      exportedAt: new Date().toISOString(),
      metadata: {
        room: roomId || 'local',
        variant: game?.variant || 'standard',
        red: sideName('red'),
        black: sideName('black'),
        result: resultCode(game),
        termination: game?.result?.type || '',
        resultText: resultDescription(game),
      },
      history: cloneState(game?.history || []),
      finalState: cloneState(game || {}),
      annotations: cloneState(window.ChuheAnalysis?.annotations || {}),
    };
  }
  function buildRecordText() {
    const payload = recordPayload();
    const version = document.querySelector('#app-version')?.textContent?.trim().split(' · ')[0] || 'unknown';
    const headers = [
      ['Format', 'XQPGN/2'], ['App', '楚河棋局'], ['Version', version],
      ['Variant', payload.metadata.variant], ['Room', payload.metadata.room],
      ['Red', payload.metadata.red], ['Black', payload.metadata.black], ['Result', payload.metadata.result],
      ['Termination', payload.metadata.termination], ['ResultText', payload.metadata.resultText],
    ].map(([key, value]) => `[${key} "${headerValue(value)}"]`).join('\n');
    const moves = payload.history.slice(1).map((item, index) => `${index + 1}. ${item.label || '—'}${payload.annotations[index + 1] ? ` {${String(payload.annotations[index + 1]).replace(/[{}\r\n]/g, ' ')}}` : ''}`);
    return `${headers}\n\n${moves.join('\n')}\n\n${payload.metadata.result}\n\n%%XQDATA\n${JSON.stringify(payload)}`;
  }
  function parseRecordText(text) {
    const source = String(text || '');
    const headers = parseHeaders(source);
    const marker = '\n%%XQDATA\n';
    const index = source.indexOf(marker);
    if (index < 0) {
      return { format: headers.Format || 'XQPGN/1', headers, legacy: true, payload: null };
    }
    let payload;
    try { payload = JSON.parse(source.slice(index + marker.length)); }
    catch { throw new Error('棋譜資料區格式損壞'); }
    if (payload?.format !== 'XQPGN/2' || !Array.isArray(payload.history) || !payload.finalState) throw new Error('不支援的棋譜格式');
    return { format: payload.format, headers, legacy: false, payload };
  }
  function recordFilename() {
    return `chuhe-${roomId || 'local'}-${new Date().toISOString().slice(0, 10)}.xqg`;
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = Boolean(document.execCommand?.('copy'));
    textarea.remove();
    if (!copied) throw new Error('clipboard unavailable');
    return true;
  }
  function makeRecordFile(text) {
    if (typeof File !== 'function') return null;
    return new File([text], recordFilename(), { type: 'text/plain;charset=utf-8' });
  }
  async function shareRecord() {
    const text = buildRecordText();
    const file = makeRecordFile(text);
    try {
      if (file && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: '楚河棋局棋譜', text: '楚河棋局 XQPGN/2 棋譜檔', files: [file] });
        toast?.('棋譜已分享');
        return;
      }

      let copied = false;
      try {
        await copyText(text);
        copied = true;
      } catch {}

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: '楚河棋局棋譜',
          text: copied ? '完整棋譜已複製到剪貼簿，可直接貼到訊息中。' : '楚河棋局棋譜',
          url: location.href,
        });
        toast?.(copied ? '已開啟分享；完整棋譜也已複製' : '已開啟分享；完整棋譜請改用下載');
        return;
      }

      if (copied) {
        toast?.('完整棋譜已複製，可直接貼上分享');
        return;
      }
      throw new Error('share unavailable');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('record share failed', error);
      try {
        await copyText(text);
        toast?.('分享失敗，完整棋譜已複製');
      } catch {
        toast?.('分享失敗，請改用下載棋譜');
      }
    }
  }

  recordText = buildRecordText;
  window.xiangqiRecordText = buildRecordText;
  window.ChuheRecordCodec = { build: buildRecordText, parse: parseRecordText, payload: recordPayload };
  window.ChuheRecordShare = { share: shareRecord, copy: () => copyText(buildRecordText()), filename: recordFilename };

  const copyButton = document.querySelector('#record-copy');
  if (copyButton) {
    copyButton.onclick = async () => {
      try {
        await copyText(buildRecordText());
        toast?.('棋譜已複製');
      } catch {
        toast?.('無法複製棋譜，請改用下載');
      }
    };
  }

  const shareButton = document.querySelector('#record-share');
  if (shareButton) shareButton.onclick = shareRecord;

  const shareRow = document.querySelector('.replay-share');
  if (shareRow && !document.querySelector('#record-download')) {
    const download = document.createElement('button');
    download.id = 'record-download'; download.className = 'text-button'; download.type = 'button'; download.textContent = '下載棋譜';
    download.addEventListener('click', () => {
      const blob = new Blob([buildRecordText()], { type: 'text/plain;charset=utf-8' });
      const href = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = href; link.download = recordFilename();
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(href); toast?.('棋譜已下載');
    });
    shareRow.appendChild(download);
  }

  const replayPanel = document.querySelector('#replay-panel');
  let slider = document.querySelector('#replay-slider');
  if (replayPanel && !slider) {
    const wrap = document.createElement('label'); wrap.className = 'replay-progress hidden';
    wrap.innerHTML = '<span>回放進度</span><input id="replay-slider" type="range" min="0" max="0" value="0" step="1"><output>0 / 0</output>';
    replayPanel.querySelector('.replay-buttons')?.insertAdjacentElement('afterend', wrap); slider = wrap.querySelector('input');
    slider.addEventListener('input', () => {
      if (!replayActive || !liveState?.history?.length) return;
      const next = Math.max(0, Math.min(Number(slider.value), liveState.history.length - 1));
      replayIndex = next; state = { ...cloneState(liveState.history[next].position), history: cloneState(liveState.history) }; selected = null; lastMove = null; render();
    });
  }

  const baseRenderReplay = renderReplay;
  renderReplay = function enhancedRecordReplay() {
    baseRenderReplay();
    const wrap = document.querySelector('.replay-progress'), input = document.querySelector('#replay-slider'), output = wrap?.querySelector('output');
    const game = officialState(), total = Math.max(0, (game?.history?.length || 1) - 1);
    if (!wrap || !input) return;
    wrap.classList.toggle('hidden', !replayActive); input.max = String(total); input.value = String(Math.min(replayIndex, total));
    if (output) output.textContent = `${Math.min(replayIndex, total)} / ${total}`;
  };
})();
