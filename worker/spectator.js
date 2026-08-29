import { handleGet } from './rooms.js';
import { realtimeStats } from './realtime.js';

function cleanRoomId(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,6); }

export async function handleWatch(request, env) {
  if (!env?.DB) return Response.json({ error:'DB binding is unavailable' }, { status:500 });
  const url = new URL(request.url);
  const roomId = cleanRoomId(url.searchParams.get('room'));
  if (!roomId) return Response.json({ error:'房間代碼無效' }, { status:400 });
  const internalUrl = new URL('/api/rooms', request.url);
  internalUrl.searchParams.set('room', roomId);
  const response = await handleGet(new Request(internalUrl, { method:'GET' }), env);
  if (!response.ok) return response;
  const data = await response.json();
  const presence = await realtimeStats(env, roomId);
  return Response.json({ ...data, color:'spectator', spectators:Number(presence.spectators||0), connections:Number(presence.connections||0) }, {
    headers:{'Cache-Control':'no-store'}
  });
}
