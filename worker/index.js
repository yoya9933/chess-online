import { handleGet, handlePost } from "./rooms.js";
import { handleChangeSide } from "./change-side.js";
import { cleanupOldRooms, decorateRoomResponse } from "./lifecycle.js";
import { secureResponse, securityGate } from "./security.js";
import { attachRequestId, healthResponse, logError, logRequest, requestContext } from "./observability.js";
import { handleHistory, recordCompletedGame } from "./history.js";
import { afterRoomMutation, handleAdjudication } from "./adjudication.js";

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
  const response = await handler(request, env);
  let decorated = await decorateRoomResponse(requestCopy.clone(), env, response);

  if (method === 'POST' && decorated.ok) {
    try {
      let data = await decorated.clone().json();
      const adjudicationChanged = await afterRoomMutation(requestCopy.clone(), env, data);
      if (adjudicationChanged && data?.roomId) {
        decorated = await freshRoomResponse(requestCopy, env, data.roomId);
        data = await decorated.clone().json();
      }
      if (data?.roomId && (data?.state?.winner || data?.state?.result?.finished)) {
        await recordCompletedGame(env.DB, data.roomId);
      }
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
    } catch {}
  }
  return response;
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

  if (url.pathname === '/api/adjudication') {
    if (request.method === 'POST') return adjudicationResponse(request, env);
    return Response.json({ error: '不支援的請求方式' }, { status: 405, headers: { Allow: 'POST' } });
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

    response = secureResponse(response);
    response = attachRequestId(response, context.id);
    logRequest(context, response);
    return response;
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanupOldRooms(env.DB));
  },
};
