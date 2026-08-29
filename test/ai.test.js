import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
await import('../public/ai-core.js');const AI=globalThis.ChuheAI;
function board(){const b=Array.from({length:10},()=>Array(9).fill(null));b[9][4]={t:'K',c:'red'};b[0][4]={t:'K',c:'black'};b[9][0]={t:'R',c:'red'};b[1][0]={t:'P',c:'black'};return b}
test('AI exposes evaluation and alpha-beta move search',()=>{assert.equal(typeof AI.evaluate,'function');const move=AI.chooseMove(board(),'red','standard','normal');assert.ok(move);assert.deepEqual(move.from,{y:9,x:0})});
test('difficulty modes are wired in the UI',()=>{const client=readFileSync(new URL('../public/ai-client.js',import.meta.url),'utf8');assert.match(client,/簡單/);assert.match(client,/普通/);assert.match(client,/困難/);assert.match(client,/chooseMove/)});
test('Jieqi simulation never evaluates the hidden true type before reveal',()=>{const b=board();b[6][0]={t:'R',o:'P',c:'red',h:true};const next=AI.applyMove(b,{from:{y:6,x:0},to:{y:5,x:0}});assert.equal(next[5][0].t,'P');assert.equal(next[5][0].h,false)});
