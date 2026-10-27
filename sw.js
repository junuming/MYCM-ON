/* MYCM-ON 웹앱 서비스 워커: 앱 파일을 기기에 보관해 인터넷 없이도 열리게 한다.
 * 새 판이 올라오면 받아 두었다가, 앱에서 [지금 바꾸기]를 누르면 바뀐다. */
const VERSION = '2.6.2-279eeae1b3';
const PRECACHE = ["./", "NotoSansKR-Field.ttf", "cmaps-ko.json", "fonts.css", "index.html", "intro_land.jpg", "intro_port.jpg", "libredwg-web.mjs", "libredwg.wasm", "logo.png", "manifest.webmanifest", "pdf.worker.min.js", "rhwp.js", "rhwp_bg.wasm", "symbol.png", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "samples/checklist.pdf", "samples/plan84.dxf.txt", "vendor/earcut.min.js", "vendor/fontkit.umd.min.js", "vendor/jsQR.js", "vendor/pdf-lib.min.js", "vendor/pdf.min.js"];
const CACHE = 'mycm-app-' + VERSION;
const FONTS = 'mycm-fonts-1';   // 글꼴 조각: 쓸 때 받아 보관 (판이 바뀌어도 그대로 쓴다)

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 한꺼번에 받다가 하나라도 실패하면 전부 실패하므로 조금씩
    for (let i = 0; i < PRECACHE.length; i += 8) {
      await Promise.all(PRECACHE.slice(i, i + 8).map(async (u) => {
        const r = await fetch(new Request(u, { cache: 'reload' }));
        if (!r.ok) throw new Error(u + ' ' + r.status);
        await c.put(u, r);
      }));
    }
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('mycm-app-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'version' && e.source) e.source.postMessage({ type: 'version', version: VERSION });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // 현장 PC·알림 채널·AI는 그대로
  if (req.headers.has('range')) return;
  const isFont = url.pathname.includes('/fonts/');
  e.respondWith((async () => {
    const cache = await caches.open(isFont ? FONTS : CACHE);
    if (req.mode === 'navigate') {
      const hit = await cache.match('./', { ignoreSearch: true }) || await cache.match('index.html', { ignoreSearch: true });
      if (hit) return hit;
    }
    const hit = await cache.match(req, { ignoreSearch: !isFont });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const idx = await caches.match('index.html', { ignoreSearch: true }); if (idx) return idx; }
      throw err;
    }
  })());
});
