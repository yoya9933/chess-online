(() => {
  async function loadEnhancements() {
    let cacheKey = String(Date.now());
    try {
      const response = await fetch('/version.json', { cache: 'no-store' });
      if (response.ok) { const info = await response.json(); cacheKey = info.commit || info.version || cacheKey; }
    } catch {}
    for (const file of ['enhancements-runtime.css','diagnostics.css','responsive.css','game-ux.css','pwa.css','record-system.css','history.css','accessibility.css','platform-runtime.css']) {
      const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = `/${file}?v=${encodeURIComponent(cacheKey)}`; document.head.appendChild(stylesheet);
    }
    for (const file of ['enhancements-runtime.js','security-client.js','diagnostics-client.js','pwa-client.js','record-system.js','history-client.js','accessibility.js','performance-client.js','platform-runtime.js','realtime-client.js','clock-client.js']) {
      const script = document.createElement('script'); script.async = false; script.src = `/${file}?v=${encodeURIComponent(cacheKey)}`; document.body.appendChild(script);
    }
  }
  loadEnhancements();
})();
