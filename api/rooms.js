import { GET, POST } from "../app/api/rooms/route.js";

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "不支援的請求方式" });
  }

  const url = new URL(request.url, `https://${request.headers.host}`);
  const webRequest = new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.method === "POST" ? JSON.stringify(request.body || {}) : undefined,
  });
  const webResponse = await (request.method === "GET" ? GET(webRequest) : POST(webRequest));
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  response.status(webResponse.status).send(await webResponse.text());
}
