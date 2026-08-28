(() => {
  let hideTimer = null;

  function ensurePanel() {
    let panel = document.querySelector('#app-error-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'app-error-panel';
    panel.className = 'app-error-panel';
    panel.setAttribute('role', 'alert');
    panel.hidden = true;
    document.body.appendChild(panel);
    return panel;
  }

  window.reportAppError = function reportAppError(error, fallback = '操作暫時失敗') {
    const panel = ensurePanel();
    const message = error?.message || fallback;
    const requestId = String(error?.requestId || '');
    const shortId = requestId ? requestId.slice(0, 8) : '';
    panel.innerHTML = `<b>${message}</b>${shortId ? `<small>錯誤代碼 ${shortId}</small>` : ''}`;
    panel.hidden = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { panel.hidden = true; }, 6000);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message) window.reportAppError(event.reason);
  });

  window.checkXiangqiHealth = async function checkXiangqiHealth() {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const data = await response.json();
    return {
      ...data,
      requestId: response.headers.get('X-Request-ID'),
    };
  };
})();
