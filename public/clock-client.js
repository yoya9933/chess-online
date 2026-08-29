(() => {
  const platform = window.ChuhePlatform = window.ChuhePlatform || {};
  const clockRuntime = platform.clock = platform.clock || { serverOffset: 0, syncing: false, settleRequested: false };

  function fmt(ms) {
    const safe = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  async function clockApi(method = 'GET', payload = {}) {
    if (!roomId || localMode || clockRuntime.syncing) return null;
    clockRuntime.syncing = true;
    try {
      const url = method === 'GET' ? `/api/clock?room=${encodeURIComponent(roomId)}` : '/api/clock';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Player-Token': playerToken },
        body: method === 'POST' ? JSON.stringify({ roomId, ...payload }) : undefined,
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '棋鐘操作失敗');
      if (data.serverNow) clockRuntime.serverOffset = Number(data.serverNow) - Date.now();
      if (data.result?.finished) window.xiangqiPerformance?.forceSync?.();
      return data;
    } finally { clockRuntime.syncing = false; }
  }

  function ensurePanel() {
    let panel = document.querySelector('#clock-panel');
    if (panel) return panel;
    const anchor = document.querySelector('#adjudication-panel') || document.querySelector('.actions');
    if (!anchor?.parentNode) return null;
    panel = document.createElement('section');
    panel.id = 'clock-panel';
    panel.className = 'platform-panel clock-panel';
    panel.innerHTML = `
      <p class="side-section-title">棋鐘</p>
      <div class="clock-faces"><div><span>紅方</span><strong id="clock-red">--:--</strong></div><div><span>黑方</span><strong id="clock-black">--:--</strong></div></div>
      <div id="clock-config" class="clock-config">
        <select id="clock-preset" aria-label="棋鐘時間">
          <option value="600000:0">10 分鐘</option>
          <option value="1200000:0">20 分鐘</option>
          <option value="1800000:0">30 分鐘</option>
          <option value="600000:5000">10 分 + 5 秒</option>
          <option value="custom">自訂</option>
        </select>
        <div id="clock-custom" class="hidden clock-custom"><label>分鐘<input id="clock-minutes" type="number" min="1" max="180" value="15"></label><label>每步加秒<input id="clock-increment" type="number" min="0" max="60" value="0"></label></div>
        <button id="clock-apply" class="secondary" type="button">套用棋鐘</button>
      </div>
      <small id="clock-note">未設定棋鐘</small>`;
    anchor.parentNode.insertBefore(panel, anchor);
    panel.querySelector('#clock-preset').addEventListener('change', (event) => panel.querySelector('#clock-custom').classList.toggle('hidden', event.target.value !== 'custom'));
    panel.querySelector('#clock-apply').addEventListener('click', async () => {
      let initialMs, incrementMs;
      const preset = panel.querySelector('#clock-preset').value;
      if (preset === 'custom') {
        initialMs = Math.max(1, Number(panel.querySelector('#clock-minutes').value || 15)) * 60_000;
        incrementMs = Math.max(0, Number(panel.querySelector('#clock-increment').value || 0)) * 1000;
      } else [initialMs, incrementMs] = preset.split(':').map(Number);
      try { await clockApi('POST', { action: 'configure', initialMs, incrementMs }); toast('棋鐘已設定'); await pollRoom(); }
      catch (error) { toast(error.message); }
    });
    return panel;
  }

  function visibleRemaining(clock, color) {
    let value = Number(clock?.[`${color}Ms`] || 0);
    if (clock?.started && clock.active === color && clock.runningSince && !state?.result?.finished) {
      const serverNow = Date.now() + clockRuntime.serverOffset;
      value -= Math.max(0, serverNow - Number(clock.runningSince));
    }
    return Math.max(0, value);
  }

  function paintClock() {
    const panel = ensurePanel();
    if (!panel) return;
    const isOnlinePlayer = !localMode && (myColor === 'red' || myColor === 'black');
    panel.classList.toggle('hidden', !isOnlinePlayer);
    if (!isOnlinePlayer) return;
    const clock = state?.clock;
    const configured = Boolean(clock?.configured);
    const red = configured ? visibleRemaining(clock, 'red') : 0;
    const black = configured ? visibleRemaining(clock, 'black') : 0;
    panel.querySelector('#clock-red').textContent = configured ? fmt(red) : '--:--';
    panel.querySelector('#clock-black').textContent = configured ? fmt(black) : '--:--';
    panel.querySelector('#clock-red').classList.toggle('active', configured && clock.active === 'red' && clock.started);
    panel.querySelector('#clock-black').classList.toggle('active', configured && clock.active === 'black' && clock.started);
    const locked = Boolean(state?.lastAction || (state?.history?.length || 0) > 1);
    panel.querySelector('#clock-config').classList.toggle('hidden', locked);
    panel.querySelector('#clock-note').textContent = configured ? `${Math.round(clock.initialMs / 60000)} 分鐘${clock.incrementMs ? ` + ${clock.incrementMs / 1000} 秒` : ''} · ${clock.started ? '進行中' : '第一手後啟動'}` : '未設定棋鐘';
    if (configured && clock.started && !state?.result?.finished && Math.min(red, black) <= 0 && !clockRuntime.settleRequested) {
      clockRuntime.settleRequested = true;
      clockApi('GET').catch(() => {}).finally(() => { clockRuntime.settleRequested = false; });
    }
  }

  const baseRender = render;
  render = function clockRender() { baseRender(); paintClock(); };
  setInterval(paintClock, 250);
  setInterval(() => { if (roomId && !localMode && state?.clock?.started && !state?.result?.finished) clockApi('GET').catch(() => {}); }, 10000);
  clockRuntime.sync = clockApi;
  clockRuntime.format = fmt;
  paintClock();
})();
