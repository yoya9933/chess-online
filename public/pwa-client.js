(() => {
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = '/manifest.webmanifest';
  document.head.appendChild(manifest);

  let deferredInstall = null;
  let refreshing = false;

  function makeInstallButton() {
    let button = document.querySelector('#pwa-install');
    if (button) return button;
    button = document.createElement('button');
    button.id = 'pwa-install';
    button.type = 'button';
    button.className = 'secondary hidden';
    button.textContent = '安裝應用程式';
    const tools = document.querySelector('.side-tool-grid');
    if (tools) tools.appendChild(button);
    else document.body.appendChild(button);
    button.addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      button.classList.add('hidden');
    });
    return button;
  }

  function showUpdate(registration) {
    if (!registration.waiting) return;
    let panel = document.querySelector('#pwa-update');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'pwa-update';
      panel.className = 'pwa-update';
      panel.setAttribute('role', 'status');
      panel.innerHTML = '<span>楚河棋局有新版本</span><button type="button">重新整理</button>';
      document.body.appendChild(panel);
      panel.querySelector('button').addEventListener('click', () => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    panel.hidden = false;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event;
    makeInstallButton().classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    document.querySelector('#pwa-install')?.classList.add('hidden');
    if (typeof toast === 'function') toast('楚河棋局已安裝');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (registration.waiting) showUpdate(registration);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
          });
        });
      } catch (error) {
        console.warn('PWA registration failed', error);
      }
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  }
})();
