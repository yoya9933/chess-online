(() => {
  const platform = window.ChuhePlatform = window.ChuhePlatform || {};
  const realtime = platform.realtime = platform.realtime || { connected: false, socket: null, attempts: 0 };
  let reconnectTimer = null;
  let activeRoom = '';

  document.documentElement.dataset.realtimeLayer = 'websocket-fallback';

  function setConnected(value) {
    realtime.connected = Boolean(value);
    document.documentElement.dataset.realtimeTransport = value ? 'websocket' : 'polling';
  }

  function closeSocket() {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    const socket = realtime.socket;
    realtime.socket = null;
    activeRoom = '';
    setConnected(false);
    if (socket && socket.readyState < 2) {
      try { socket.close(1000, 'room changed'); } catch {}
    }
  }

  function scheduleReconnect() {
    if (!roomId || localMode || document.hidden) return;
    clearTimeout(reconnectTimer);
    const delay = Math.min(10000, 800 * Math.pow(2, Math.min(realtime.attempts, 4)));
    reconnectTimer = setTimeout(connectRealtime, delay);
  }

  function connectRealtime() {
    if (!roomId || localMode) { closeSocket(); return; }
    if (realtime.socket && activeRoom === roomId && realtime.socket.readyState < 2) return;
    if (realtime.socket) closeSocket();

    activeRoom = roomId;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/api/realtime?room=${encodeURIComponent(roomId)}`;
    const socket = new WebSocket(url);
    realtime.socket = socket;

    socket.addEventListener('open', () => {
      realtime.attempts = 0;
      setConnected(true);
      window.xiangqiPerformance?.forceSync?.();
    });
    socket.addEventListener('message', (event) => {
      let data = null;
      try { data = JSON.parse(event.data); } catch {}
      if (data?.type === 'room-update') window.xiangqiPerformance?.forceSync?.() || pollRoom();
    });
    socket.addEventListener('close', () => {
      if (realtime.socket === socket) realtime.socket = null;
      setConnected(false);
      realtime.attempts += 1;
      scheduleReconnect();
    });
    socket.addEventListener('error', () => setConnected(false));
  }

  const baseShowGame = showGame;
  showGame = function realtimeShowGame(result) {
    baseShowGame(result);
    setTimeout(connectRealtime, 0);
  };

  const baseStartLocal = startLocal;
  startLocal = function realtimeStartLocal(...args) {
    closeSocket();
    return baseStartLocal(...args);
  };

  window.addEventListener('online', connectRealtime);
  window.addEventListener('offline', () => setConnected(false));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) connectRealtime();
  });
  window.addEventListener('beforeunload', closeSocket);

  realtime.connect = connectRealtime;
  realtime.close = closeSocket;
  if (roomId && !localMode) connectRealtime();
})();
