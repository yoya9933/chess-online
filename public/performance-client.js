(() => {
  if (typeof pollRoom !== 'function') return;

  const basePollRoom = pollRoom;
  const visibleIntervalMs = 2400;
  const hiddenIntervalMs = 15000;
  const realtimeVisibleIntervalMs = 30000;
  const realtimeHiddenIntervalMs = 60000;
  let lastNetworkPoll = 0;
  let polling = false;
  let forceNextPoll = true;
  let skippedPolls = 0;
  let completedPolls = 0;

  document.documentElement.dataset.performanceLayer = 'adaptive';

  function currentInterval() {
    const realtime = Boolean(window.ChuhePlatform?.realtime?.connected);
    if (realtime) return document.hidden ? realtimeHiddenIntervalMs : realtimeVisibleIntervalMs;
    return document.hidden ? hiddenIntervalMs : visibleIntervalMs;
  }

  pollRoom = async function adaptivePollRoom() {
    if (!roomId || localMode || polling) return;
    const now = Date.now();
    const minimumInterval = currentInterval();
    if (!forceNextPoll && now - lastNetworkPoll < minimumInterval) {
      skippedPolls += 1;
      return;
    }
    polling = true;
    forceNextPoll = false;
    lastNetworkPoll = now;
    try { await basePollRoom(); completedPolls += 1; }
    finally { polling = false; }
  };

  const baseRoomRequest = roomRequest;
  roomRequest = async function performanceRoomRequest(method, payload = {}) {
    const data = await baseRoomRequest(method, payload);
    if (method === 'POST') forceNextPoll = true;
    return data;
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && roomId && !localMode) {
      forceNextPoll = true;
      pollRoom();
    }
  });
  window.addEventListener('online', () => { forceNextPoll = true; });

  const collectMetrics = () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const transferred = resources.reduce((sum, item) => sum + (item.transferSize || 0), 0);
    return {
      polling: { visibleIntervalMs, hiddenIntervalMs, realtimeVisibleIntervalMs, realtimeHiddenIntervalMs, completedPolls, skippedPolls, currentIntervalMs: currentInterval() },
      realtime: { connected: Boolean(window.ChuhePlatform?.realtime?.connected) },
      page: navigation ? { domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd), loadMs: Math.round(navigation.loadEventEnd) } : null,
      resources: { count: resources.length, transferredBytes: transferred },
    };
  };

  window.xiangqiPerformance = {
    snapshot: collectMetrics,
    forceSync() { forceNextPoll = true; return pollRoom(); },
  };
})();
