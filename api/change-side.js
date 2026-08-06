import { POST } from "../app/api/change-side/route.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "不支援的請求方式" });
  }

  const url = new URL(request.url, `https://${request.headers.host}`);
  const webRequest = new Request(url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body || {}),
  });
  const webResponse = await POST(webRequest);
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  response.status(webResponse.status).send(await webResponse.text());
}
