(() => {
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,80}$/;
  if (!TOKEN_PATTERN.test(playerToken)) {
    playerToken = crypto.randomUUID();
    localStorage.setItem('xiangqi-player-token', playerToken);
  }

  roomRequest = async function securedRoomRequest(method, payload = {}) {
    const safePayload = { ...payload };
    delete safePayload.token;
    const response = await fetch('/api/rooms', {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Player-Token': playerToken,
      },
      body: method === 'POST' ? JSON.stringify(safePayload) : undefined,
      cache: 'no-store',
    });
    const requestId = response.headers.get('X-Request-ID') || '';
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = { error: '伺服器回應格式異常' };
    }
    if (!response.ok) {
      const error = new Error(data.error || '連線失敗');
      error.requestId = data.requestId || requestId;
      if (typeof window.reportAppError === 'function') window.reportAppError(error);
      throw error;
    }
    return data;
  };
})();
