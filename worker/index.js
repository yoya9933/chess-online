import { handleGet, handlePost } from "./rooms.js";
import { handleChangeSide } from "./change-side.js";
import { cleanupOldRooms, decorateRoomResponse } from "./lifecycle.js";

async function roomResponse(request, env, handler) {
  const requestCopy = request.clone();
  const response = await handler(request, env);
  return decorateRoomResponse(requestCopy, env, response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/rooms") {
      if (request.method === "GET") return roomResponse(request, env, handleGet);
      if (request.method === "POST") return roomResponse(request, env, handlePost);
      return Response.json(
        { error: "不支援的請求方式" },
        { status: 405, headers: { Allow: "GET, POST" } },
      );
    }

    if (url.pathname === "/api/change-side") {
      if (request.method === "POST") return roomResponse(request, env, handleChangeSide);
      return Response.json(
        { error: "不支援的請求方式" },
        { status: 405, headers: { Allow: "POST" } },
      );
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanupOldRooms(env.DB));
  },
};
