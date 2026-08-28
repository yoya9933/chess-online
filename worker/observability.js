function safeRequestId(value) {
  const text = String(value || '');
  return /^[A-Za-z0-9_-]{8,80}$/.test(text) ? text : crypto.randomUUID();
}

export function requestContext(request) {
  return {
    id: safeRequestId(request.headers.get('X-Request-ID')),
    startedAt: Date.now(),
    method: request.method,
    path: new URL(request.url).pathname,
    colo: request.cf?.colo || null,
  };
}

export function attachRequestId(response, id) {
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID', id);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function logRequest(context, response, extra = {}) {
  console.log(JSON.stringify({
    type: 'request',
    requestId: context.id,
    method: context.method,
    path: context.path,
    status: response.status,
    durationMs: Math.max(0, Date.now() - context.startedAt),
    colo: context.colo,
    ...extra,
  }));
}

export function logError(context, error) {
  console.error(JSON.stringify({
    type: 'error',
    requestId: context.id,
    method: context.method,
    path: context.path,
    message: error instanceof Error ? error.message : String(error),
  }));
}

export async function healthResponse(request, env) {
  let database = 'unknown';
  try {
    await env.DB.prepare('SELECT 1 AS ok').first();
    database = 'ok';
  } catch {
    database = 'error';
  }

  let deployment = null;
  try {
    const versionUrl = new URL('/version.json', request.url);
    const versionResponse = await env.ASSETS.fetch(new Request(versionUrl, { headers: { Accept: 'application/json' } }));
    if (versionResponse.ok) deployment = await versionResponse.json();
  } catch {}

  return Response.json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: 'chuhe-xiangqi-online',
    database,
    deployment,
    checkedAt: new Date().toISOString(),
  }, {
    status: database === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
