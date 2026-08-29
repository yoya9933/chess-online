import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const record=readFileSync(new URL('../public/record-system.js',import.meta.url),'utf8');const analysis=readFileSync(new URL('../public/analysis-client.js',import.meta.url),'utf8');
test('XQPGN/2 embeds replay positions and annotations',()=>{assert.match(record,/XQPGN\/2/);assert.match(record,/%%XQDATA/);assert.match(record,/annotations/);assert.match(record,/finalState/);assert.match(record,/parseRecordText/)});
test('analysis UI supports import, move jumping, notes and branches',()=>{assert.match(analysis,/匯入 \.xqg/);assert.match(analysis,/data-ply/);assert.match(analysis,/analysis\.annotations/);assert.match(analysis,/enterSandbox/);assert.match(analysis,/棋譜已匯入/)});
test('legacy XQPGN/1 is recognized instead of pretending it can restore positions',()=>{assert.match(record,/legacy: true/);assert.match(analysis,/XQPGN\/1 僅含著法文字/)});
