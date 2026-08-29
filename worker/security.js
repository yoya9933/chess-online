const API_WINDOW_MS = 60_000;
const MAX_API_BODY_BYTES = 128 * 1024;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,80}$/;
const ROOM_PATTERN = /^[A-Z0-9]{1,6}$/;
const ACTIONS = new Set(['join', 'move', 'request-undo', 'respond-undo', 'change-color', 'restart', 'custom-setup']);
const buckets = new Map();
let lastSweep = 0;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function secureResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function jsonError(message, status, extraHeaders = {}) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', ...extraHeaders } });
}

function requestLimit(request) {
  const url = new URL(request.url);
  if (url.pathname === '/api/realtime') return 60;
  if (request.method === 'GET') return url.pathname === '/api/rooms' ? 180 : 120;
  if (url.pathname === '/api/change-side') return 30;
  return 90;
}

function checkRateLimit(request, token, now) {
  if (now - lastSweep > API_WINDOW_MS * 2) {
    for (const [key, bucket] of buckets) if (now - bucket.startedAt > API_WINDOW_MS * 2) buckets.delete(key);
    lastSweep = now;
  }
  const url = new URL(request.url);
  const identity = token || request.headers.get('CF-Connecting-IP') || 'anonymous';
  const key = `${identity}:${request.method}:${url.pathname}`;
  const limit = requestLimit(request);
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= API_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((API_WINDOW_MS - (now - bucket.startedAt)) / 1000));
  return jsonError('請求過於頻繁，請稍後再試', 429, { 'Retry-After': String(retryAfter) });
}

export async function securityGate(request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;
  if (url.pathname === '/api/health') return checkRateLimit(request, '', Date.now());

  if (url.pathname === '/api/realtime' && request.method === 'GET') {
    const room = String(url.searchParams.get('room') || '').toUpperCase();
    if (!ROOM_PATTERN.test(room)) return jsonError('房間代碼無效', 400);
    return checkRateLimit(request, '', Date.now());
  }

  const token = String(request.headers.get('X-Player-Token') || '');
  if (!TOKEN_PATTERN.test(token)) return jsonError('玩家憑證無效，請重新整理頁面', 401);

  const limited = checkRateLimit(request, token, Date.now());
  if (limited) return limited;

  if (request.method === 'GET') {
    const room = String(url.searchParams.get('room') || '').toUpperCase();
    if (url.pathname === '/api/rooms' && !ROOM_PATTERN.test(room)) return jsonError('房間代碼無效', 400);
    return null;
  }

  if (request.method !== 'POST') return null;
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) return jsonError('請求格式必須為 JSON', 415);
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_API_BODY_BYTES) return jsonError('請求內容過大', 413);

  let body;
  try { body = await request.clone().json(); } catch { return jsonError('JSON 格式無效', 400); }
  const roomId = String(body?.roomId || '').toUpperCase();
  if (!ROOM_PATTERN.test(roomId)) return jsonError('房間代碼無效', 400);
  if (url.pathname === '/api/rooms' && !ACTIONS.has(String(body?.action || ''))) return jsonError('未知操作', 400);
  if (body?.name != null && String(body.name).length > 32) return jsonError('玩家名稱過長', 400);
  return null;
}

export { TOKEN_PATTERN };
