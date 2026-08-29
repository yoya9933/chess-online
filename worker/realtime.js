import { DurableObject } from 'cloudflare:workers';

function roomIdFromRequest(request) {
  const url = new URL(request.url);
  return String(url.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export class RoomRealtime extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.ctx = ctx; this.env = env; }

  presence() {
    const sockets = this.ctx.getWebSockets();
    let spectators = 0;
    for (const socket of sockets) {
      try { if (socket.deserializeAttachment()?.role === 'spectator') spectators += 1; } catch {}
    }
    return { connections: sockets.length, spectators };
  }

  broadcastPresence() {
    const payload = JSON.stringify({ type: 'presence', ...this.presence(), at: Date.now() });
    for (const socket of this.ctx.getWebSockets()) { try { socket.send(payload); } catch {} }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      let message;
      try { message = await request.json(); } catch { return new Response('invalid', { status: 400 }); }
      const payload = JSON.stringify({ type:'room-update', revision:Number(message?.revision||0), reason:String(message?.reason||'sync').slice(0,32), at:Date.now() });
      let delivered = 0;
      for (const socket of this.ctx.getWebSockets()) { try { socket.send(payload); delivered += 1; } catch {} }
      return Response.json({ ok:true, delivered, ...this.presence() });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return Response.json(this.presence());

    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    const role = url.searchParams.get('role') === 'spectator' ? 'spectator' : 'player';
    server.serializeAttachment({ roomId: roomIdFromRequest(request), role, connectedAt: Date.now() });
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type:'presence', ...this.presence(), at:Date.now() }));
    this.broadcastPresence();
    return new Response(null, { status:101, webSocket:client });
  }

  async webSocketMessage(socket, message) { if (String(message)==='ping') try { socket.send(JSON.stringify({type:'pong',at:Date.now()})); } catch {} }
  async webSocketClose(socket, code, reason) { try { socket.close(code||1000, reason||'closed'); } catch {} this.broadcastPresence(); }
}

export async function realtimeStats(env, roomId) {
  if (!env?.ROOM_REALTIME || !roomId) return { connections:0, spectators:0 };
  try {
    const id = env.ROOM_REALTIME.idFromName(String(roomId));
    const response = await env.ROOM_REALTIME.get(id).fetch('https://room-realtime.internal/stats');
    return await response.json();
  } catch { return { connections:0, spectators:0 }; }
}

export async function handleRealtime(request, env) {
  if (!env?.ROOM_REALTIME) return Response.json({ error:'即時同步服務未啟用' }, { status:503 });
  const roomId = roomIdFromRequest(request);
  if (!roomId) return Response.json({ error:'房間代碼無效' }, { status:400 });
  const id = env.ROOM_REALTIME.idFromName(roomId);
  return env.ROOM_REALTIME.get(id).fetch(request);
}

export async function notifyRoom(env, roomId, revision=0, reason='sync') {
  if (!env?.ROOM_REALTIME || !roomId) return 0;
  try {
    const id = env.ROOM_REALTIME.idFromName(String(roomId));
    const response = await env.ROOM_REALTIME.get(id).fetch('https://room-realtime.internal/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,reason})});
    const data = await response.json(); return Number(data?.delivered||0);
  } catch { return 0; }
}
