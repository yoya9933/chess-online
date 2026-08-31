const CACHE='chuhe-shell-v1.14.8';
const CORE=['/','/index.html','/style.css','/favicon.svg','/app.js','/jieqi-covered.css','/sandbox-pink-frame.css','/sandbox-gomoku-architecture.js','/chess-ui-updates.css','/chess-ui-updates.js','/connection-status.js','/enhancements-loader.js','/enhancements-runtime.css','/enhancements-runtime.js','/diagnostics.css','/diagnostics-client.js','/security-client.js','/responsive.css','/game-ux.css','/manifest.webmanifest','/pwa.css','/pwa-client.js','/record-system.css','/record-system.js','/history.css','/history-client.js','/accessibility.css','/accessibility.js','/performance-client.js','/platform-runtime.css','/platform-runtime.js','/realtime-client.js','/clock-client.js','/spectator-client.js','/ai-core.js','/ai-client.js','/analysis.css','/analysis-client.js','/timeout-finish.css','/timeout-finish.js','/match-panel.css','/match-panel-align.css','/solo-setup.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
  if(u.pathname==='/version.json'||u.pathname==='/enhancements-loader.js'||u.pathname==='/sw.js'){
    e.respondWith(fetch(r,{cache:'no-store'}).then(x=>{
      if(x.ok&&u.pathname==='/enhancements-loader.js')caches.open(CACHE).then(c=>c.put('/enhancements-loader.js',x.clone()));
      return x;
    }).catch(()=>caches.match(r)));
    return;
  }
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(CACHE).then(c=>c.put('/',y));return x}).catch(()=>caches.match('/')||caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(x=>{if(x.ok)caches.open(CACHE).then(k=>k.put(r,x.clone()));return x})));
});