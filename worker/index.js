import { handleGet, handlePost } from "./rooms.js";
import { handleChangeSide } from "./change-side.js";
import { cleanupOldRooms, decorateRoomResponse } from "./lifecycle.js";
import { secureResponse, securityGate } from "./security.js";
import { attachRequestId, healthResponse, logError, logRequest, requestContext } from "./observability.js";
import { handleHistory, recordCompletedGame } from "./history.js";

async function roomResponse(request, env, handler) {
  const requestCopy = request.clone();
  const method = request.method;
  const response = await handler(request, env);
  const decorated = await decorateRoomResponse(requestCopy, env, response);

  if (method === 'POST' && decorated.ok) {
    try {
      const data = await decorated.clone().json();
      if (data?.roomId && data?.state?.winner) await recordCompletedGame(env.DB, data.roomId);
    } catch (error) {
      console.error(JSON.stringify({ type: 'history-record-error', message: error instanceof Error ? error.message : String(error) }));
    }
  }
  return decorated;
}

function withStaticCachePolicy(request, response) {
  if (!response?.ok || request.method !== 'GET') return response;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return response;

  const headers = new Headers(response.headers);
  const path = url.pathname;
  if (path === '/version.json') {
    headers.set('Cache-Control', 'no-store');
  } else if (path === '/' || path === '/index.html' || path === '/sw.js' || path === '/manifest.webmanifest') {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else if (/\.(?:js|css|svg|png|ico|webp|woff2?)$/i.test(path)) {
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function route(request, env) {
  const blocked = await securityGate(request);
  if (blocked) return blocked;

  const url = new URL(request.url);
  if (url.pathname === '/api/health') return healthResponse(request, env);
  if (url.pathname === '/api/history') {
    if (request.method === 'GET') return handleHistory(request, env);
    return Response.json({ error: '不支援的請求方式' }, { status: 405, headers: { Allow: 'GET' } });
  }

  if (url.pathname === "/api/rooms") {
    if (request.method === "GET") return roomResponse(request, env, handleGet);
    if (request.method === "POST") return roomResponse(request, env, handlePost);
    return Response.json({ error: "不支援的請求方式" }, { status: 405, headers: { Allow: "GET, POST" } });
  }

  if (url.pathname === "/api/change-side") {
    if (request.method === "POST") return roomResponse(request, env, handleChangeSide);
    return Response.json({ error: "不支援的請求方式" }, { status: 405, headers: { Allow: "POST" } });
  }

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const context = requestContext(request);
    let response;
    try {
      response = await route(request, env);
    } catch (error) {
      logError(context, error);
      response = Response.json({ error: '服務暫時無法處理此請求', requestId: context.id }, {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    response = withStaticCachePolicy(request, response);
    response = secureResponse(response);
    response = attachRequestId(response, context.id);
    logRequest(context, response);
    return response;
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanupOldRooms(env.DB));
  },
};
