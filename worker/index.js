import { handleGet, handlePost } from "./rooms.js";
import { handleChangeSide } from "./change-side.js";
import { cleanupOldRooms, decorateRoomResponse } from "./lifecycle.js";
import { secureResponse, securityGate } from "./security.js";

async function roomResponse(request, env, handler) {
  const requestCopy = request.clone();
  const response = await handler(request, env);
  return decorateRoomResponse(requestCopy, env, response);
}

export default {
  async fetch(request, env) {
    const blocked = await securityGate(request);
    if (blocked) return secureResponse(blocked);

    const url = new URL(request.url);
    let response;

    if (url.pathname === "/api/rooms") {
      if (request.method === "GET") response = await roomResponse(request, env, handleGet);
      else if (request.method === "POST") response = await roomResponse(request, env, handlePost);
      else response = Response.json(
        { error: "不支援的請求方式" },
        { status: 405, headers: { Allow: "GET, POST" } },
      );
      return secureResponse(response);
    }

    if (url.pathname === "/api/change-side") {
      if (request.method === "POST") response = await roomResponse(request, env, handleChangeSide);
      else response = Response.json(
        { error: "不支援的請求方式" },
        { status: 405, headers: { Allow: "POST" } },
      );
      return secureResponse(response);
    }

    response = await env.ASSETS.fetch(request);
    return secureResponse(response);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanupOldRooms(env.DB));
  },
};
