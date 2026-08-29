import { handleGet, handlePost } from "./rooms.js";
import { handleChangeSide } from "./change-side.js";
import { cleanupOldRooms, decorateRoomResponse } from "./lifecycle.js";
import { secureResponse, securityGate } from "./security.js";
import { attachRequestId, healthResponse, logError, logRequest, requestContext } from "./observability.js";
import { handleHistory, recordCompletedGame } from "./history.js";
import { afterRoomMutation, handleAdjudication } from "./adjudication.js";
import { RoomRealtime, handleRealtime, notifyRoom } from './realtime.js';
import { beforeRoomMutationClock, afterRoomMutationClock, handleClock } from './clock.js';

export { RoomRealtime };

async function freshRoomResponse(request, env, roomId) {
  const url = new URL('/api/rooms', request.url);
  url.searchParams.set('room', roomId);
  const headers = new Headers();
  const token = request.headers.get('X-Player-Token');
  if (token) headers.set('X-Player-Token', token);
  const getRequest = new Request(url, { method: 'GET', headers });
  return decorateRoomResponse(getRequest.clone(), env, await handleGet(getRequest, env));
}

async function roomResponse(request, env, handler) {
  const requestCopy = request.clone();
  const method = request.method;

  if (method === 'POST') {
    const timeout = await beforeRoomMutationClock(requestCopy.clone(), env);
    if (timeout?.roomId) {
      const timedOutResponse = await freshRoomResponse(requestCopy, env, timeout.roomId);
      await recordCompletedGame(env.DB, timeout.roomId);
      await notifyRoom(env, timeout.roomId, 0, 'timeout');
      return timedOutResponse;
    }
  }

  const response = await handler(request, env);
  let decorated = await decorateRoomResponse(requestCopy.clone(), env, response);

  if (method === 'POST' && decorated.ok) {
    try {
      let data = await decorated.clone().json();
      const adjudicationChanged = await afterRoomMutation(requestCopy.clone(), env, data);
      const clockChanged = await afterRoomMutationClock(requestCopy.clone(), env, data);
      if ((adjudicationChanged || clockChanged) && data?.roomId) {
        decorated = await freshRoomResponse(requestCopy, env, data.roomId);
        data = await decorated.clone().json();
      }
      if (data?.roomId && (data?.state?.winner || data?.state?.result?.finished)) await recordCompletedGame(env.DB, data.roomId);
      if (data?.roomId) await notifyRoom(env, data.roomId, data.revision, 'room-mutation');
    } catch (error) {
      console.error(JSON.stringify({ type: 'post-room-rule-error', message: error instanceof Error ? error.message : String(error) }));
    }
  }
  return decorated;
}

async function adjudicationResponse(request, env) {
  const response = await handleAdjudication(request, env);
  if (response.ok) {
    try {
      const data = await response.clone().json();
      if (data?.finished && data?.roomId) await recordCompletedGame(env.DB, data.roomId);
      if (data?.roomId) await notifyRoom(env, data.roomId, 0, 'adjudication');
    } catch {}
  }
  return response;
}

async function clockResponse(request, env) {
  const response = await handleClock(request, env);
  if (response.ok) {
    try {
      const data = await response.clone().json();
      if (data?.result?.finished && data?.roomId) await recordCompletedGame(env.DB, data.roomId);
      if (request.method === 'POST' || data?.result?.finished) await notifyRoom(env, data.roomId, data.revision, data?.result?.finished ? 'timeout' : 'clock-config');
    } catch {}
  }
  return response;
}

function withStaticCachePolicy(request, response) {
  if (!response?.ok || request.method !== 'GET') return response;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return response;
  const headers = new Headers(response.headers);
  const path = url.pathname;
  if (path === '/version.json') headers.set('Cache-Control', 'no-store');
  else if (path === '/' || path === '/index.html' || path === '/sw.js' || path === '/manifest.webmanifest') headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  else if (/\.(?:js|css|svg|png|ico|webp|woff2?)$/i.test(path)) headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request, env) {
  const blocked = await securityGate(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  if (url.pathname === '/api/health') return healthResponse(request, env);
  if (url.pathname === '/api/realtime') return request.method === 'GET' ? handleRealtime(request, env) : Response.json({ error: '不支援的請求方式' }, { status: 405 });
  if (url.pathname === '/api/history') return request.method === 'GET' ? handleHistory(request, env) : Response.json({ error: '不支援的請求方式' }, { status: 405 });
  if (url.pathname === '/api/adjudication') return request.method === 'POST' ? adjudicationResponse(request, env) : Response.json({ error: '不支援的請求方式' }, { status: 405 });
  if (url.pathname === '/api/clock') return ['GET','POST'].includes(request.method) ? clockResponse(request, env) : Response.json({ error: '不支援的請求方式' }, { status: 405 });
  if (url.pathname === "/api/rooms") {
    if (request.method === "GET") return roomResponse(request, env, handleGet);
    if (request.method === "POST") return roomResponse(request, env, handlePost);
    return Response.json({ error: "不支援的請求方式" }, { status: 405 });
  }
  if (url.pathname === "/api/change-side") return request.method === "POST" ? roomResponse(request, env, handleChangeSide) : Response.json({ error: "不支援的請求方式" }, { status: 405 });
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const context = requestContext(request);
    let response;
    try { response = await route(request, env); }
    catch (error) {
      logError(context, error);
      response = Response.json({ error: '服務暫時無法處理此請求', requestId: context.id }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
    response = withStaticCachePolicy(request, response);
    response = secureResponse(response);
    response = attachRequestId(response, context.id);
    logRequest(context, response);
    return response;
  },
  async scheduled(_controller, env, ctx) { ctx.waitUntil(cleanupOldRooms(env.DB)); },
};
