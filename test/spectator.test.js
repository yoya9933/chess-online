import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const spectator=readFileSync(new URL('../worker/spectator.js',import.meta.url),'utf8');const client=readFileSync(new URL('../public/spectator-client.js',import.meta.url),'utf8');const realtime=readFileSync(new URL('../worker/realtime.js',import.meta.url),'utf8');
test('spectator endpoint never claims a player seat',()=>{assert.match(spectator,/handleGet/);assert.match(spectator,/color:'spectator'/);assert.doesNotMatch(spectator,/UPDATE rooms SET (?:red|black)_token/)});
test('spectator UI has dedicated watch link and readonly mode',()=>{assert.match(client,/觀戰房間/);assert.match(client,/watch=1/);assert.match(client,/platform\.spectating=true/);assert.match(client,/\/api\/watch\?room=/)});
test('realtime presence counts spectators separately',()=>{assert.match(realtime,/deserializeAttachment\(\)\?\.role === 'spectator'/);assert.match(realtime,/type: 'presence'/)});
