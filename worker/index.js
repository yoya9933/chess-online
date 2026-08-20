import { handleGet, handlePost } from "./rooms.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/rooms") {
      if (request.method === "GET") return handleGet(request, env);
      if (request.method === "POST") return handlePost(request, env);
      return Response.json(
        { error: "不支援的請求方式" },
        { status: 405, headers: { Allow: "GET, POST" } },
      );
    }
    return env.ASSETS.fetch(request);
  },
};
