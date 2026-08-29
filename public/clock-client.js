(() => {
  const platform = window.ChuhePlatform = window.ChuhePlatform || {};
  const clockRuntime = platform.clock = platform.clock || {
    serverOffset: 0,
    offsetReady: false,
    lastRttMs: null,
    syncing: false,
    settleRequested: false,
  };

  function fmt(ms) {
    const safeMs = Math.max(0, Number(ms || 0));
    if (safeMs < 60_000) {
      const seconds = (safeMs / 1000).toFixed(1).padStart(4, '0');
      return `0:${seconds}`;
    }
    const safe = Math.ceil(safeMs / 1000);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  async function clockApi(method = 'GET', payload = {}) {
    if (!roomId || localMode || clockRuntime.syncing) return null;
    clockRuntime.syncing = true;
    const sentAt = Date.now();
    try {
      const url = method === 'GET' ? `/api/clock?room=${encodeURIComponent(roomId)}` : '/api/clock';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Player-Token': playerToken },
        body: method === 'POST' ? JSON.stringify({ roomId, ...payload }) : undefined,
        cache: 'no-store',
      });
      const data = await response.json();
      const receivedAt = Date.now();
      if (!response.ok) throw new Error(data.error || '棋鐘操作失敗');
      if (data.serverNow) {
        const sampleOffset = Number(data.serverNow) - ((sentAt + receivedAt) / 2);
        clockRuntime.serverOffset = clockRuntime.offsetReady
          ? (clockRuntime.serverOffset * 0.75) + (sampleOffset * 0.25)
          : sampleOffset;
        clockRuntime.offsetReady = true;
        clockRuntime.lastRttMs = Math.max(0, receivedAt - sentAt);
      }
      if (data.clock && state) state.clock = data.clock;
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
      <div class="clock-faces">
        <div><span>紅方</span><strong id="clock-red">--:--</strong></div>
        <div><span>黑方</span><strong id="clock-black">--:--</strong></div>
      </div>
      <div id="clock-config" class="clock-config">
        <select id="clock-preset" aria-label="棋鐘時間">
          <option value="600000:0">10 分鐘</option>
          <option value="1200000:0">20 分鐘</option>
          <option value="1800000:0">30 分鐘</option>
          <option value="600000:5000">10 分 + 5 秒</option>
          <option value="180000:2000">3 分 + 2 秒</option>
          <option value="custom">自訂</option>
        </select>
        <div id="clock-custom" class="hidden clock-custom">
          <label>分鐘<input id="clock-minutes" type="number" min="1" max="180" value="15" inputmode="numeric"></label>
          <label>每步加秒<input id="clock-increment" type="number" min="0" max="60" value="0" inputmode="numeric"></label>
        </div>
        <button id="clock-apply" class="secondary" type="button">套用棋鐘</button>
      </div>
      <small id="clock-note">未設定棋鐘</small>`;
    anchor.parentNode.insertBefore(panel, anchor);
    panel.querySelector('#clock-preset').addEventListener('change', (event) => {
      panel.querySelector('#clock-custom').classList.toggle('hidden', event.target.value !== 'custom');
    });
    panel.querySelector('#clock-apply').addEventListener('click', async () => {
      let initialMs, incrementMs;
      const preset = panel.querySelector('#clock-preset').value;
      if (preset === 'custom') {
        const minutes = Math.min(180, Math.max(1, Number(panel.querySelector('#clock-minutes').value || 15)));
        const increment = Math.min(60, Math.max(0, Number(panel.querySelector('#clock-increment').value || 0)));
        panel.querySelector('#clock-minutes').value = String(minutes);
        panel.querySelector('#clock-increment').value = String(increment);
        initialMs = minutes * 60_000;
        incrementMs = increment * 1000;
      } else [initialMs, incrementMs] = preset.split(':').map(Number);
      try {
        const button = panel.querySelector('#clock-apply');
        button.disabled = true;
        await clockApi('POST', { action: 'configure', initialMs, incrementMs });
        toast('棋鐘已設定');
        await pollRoom();
      } catch (error) {
        toast(error.message);
      } finally {
        panel.querySelector('#clock-apply').disabled = false;
      }
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
    const finished = Boolean(state?.result?.finished);
    const red = configured ? visibleRemaining(clock, 'red') : 0;
    const black = configured ? visibleRemaining(clock, 'black') : 0;
    const redNode = panel.querySelector('#clock-red');
    const blackNode = panel.querySelector('#clock-black');

    redNode.textContent = configured ? fmt(red) : '--:--';
    blackNode.textContent = configured ? fmt(black) : '--:--';
    redNode.classList.toggle('active', configured && !finished && clock.active === 'red' && clock.started);
    blackNode.classList.toggle('active', configured && !finished && clock.active === 'black' && clock.started);
    redNode.classList.toggle('low-time', configured && !finished && clock.active === 'red' && clock.started && red <= 30_000);
    blackNode.classList.toggle('low-time', configured && !finished && clock.active === 'black' && clock.started && black <= 30_000);

    const locked = Boolean(state?.lastAction || (state?.history?.length || 0) > 1);
    panel.querySelector('#clock-config').classList.toggle('hidden', locked);
    const syncText = Number.isFinite(clockRuntime.lastRttMs) ? ` · 同步 ${Math.round(clockRuntime.lastRttMs)}ms` : '';
    panel.querySelector('#clock-note').textContent = configured
      ? `${Math.round(clock.initialMs / 60000)} 分鐘${clock.incrementMs ? ` + ${clock.incrementMs / 1000} 秒` : ''} · ${clock.started ? (finished ? '已結束' : '進行中') : '第一手後啟動'}${syncText}`
      : '未設定棋鐘';

    if (configured && clock.started && !finished && Math.min(red, black) <= 0 && !clockRuntime.settleRequested) {
      clockRuntime.settleRequested = true;
      clockApi('GET').catch(() => {}).finally(() => { clockRuntime.settleRequested = false; });
    }
  }

  const baseRender = render;
  render = function clockRender() { baseRender(); paintClock(); };
  setInterval(paintClock, 100);
  setInterval(() => {
    if (roomId && !localMode && state?.clock?.started && !state?.result?.finished) {
      clockApi('GET').then(() => paintClock()).catch(() => {});
    }
  }, 5000);
  window.addEventListener('focus', () => {
    if (roomId && !localMode && state?.clock?.configured) clockApi('GET').then(() => paintClock()).catch(() => {});
  });
  clockRuntime.sync = clockApi;
  clockRuntime.format = fmt;
  paintClock();
})();
