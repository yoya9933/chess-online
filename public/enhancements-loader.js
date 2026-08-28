(() => {
  async function loadEnhancements() {
    let cacheKey = String(Date.now());
    try {
      const response = await fetch('/version.json', { cache: 'no-store' });
      if (response.ok) {
        const info = await response.json();
        cacheKey = info.commit || info.version || cacheKey;
      }
    } catch {}

    for (const file of ['enhancements-runtime.css', 'diagnostics.css', 'responsive.css', 'game-ux.css', 'pwa.css']) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = `/${file}?v=${encodeURIComponent(cacheKey)}`;
      document.head.appendChild(stylesheet);
    }

    for (const file of ['enhancements-runtime.js', 'security-client.js', 'diagnostics-client.js', 'pwa-client.js']) {
      const script = document.createElement('script');
      script.src = `/${file}?v=${encodeURIComponent(cacheKey)}`;
      script.defer = true;
      document.body.appendChild(script);
    }
  }

  loadEnhancements();
})();
