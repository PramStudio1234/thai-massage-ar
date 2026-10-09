import assert from 'node:assert/strict';
import { visibleHands, selectHandPoint, drawHandOverlay, drawHandMarker, demoHand, HAND_CONNECTIONS } from '../src/lib/handOverlay.js';
import { videoProjection } from '../src/lib/targetOverlay.js';
const hand = Array.from({ length: 21 }, (_, i) => ({ x: .4 + i * .004, y: .3 + i * .006, z: 0 }));
assert.equal(visibleHands([hand]).length, 1);
assert.equal(visibleHands([]).length, 0);
assert.equal(visibleHands([hand.slice(0, 20)]).length, 0);
assert.equal(visibleHands([hand.map(p => ({ ...p, x: 1.1 }))]).length, 0);
const partial = hand.map(p => ({ ...p })); partial[8].x = -.01;
assert.equal(visibleHands([partial]).length, 1, 'A fingertip near the frame edge does not hide the whole hand');
const projection = videoProjection(800, 600, 1280, 720);
const selected = selectHandPoint([hand], { x: .55, y: .4 }, null, projection, 4 / 3, 100);
assert(selected);
const other = hand.map(p => ({ ...p, x: p.x + .25 }));
const next = selectHandPoint([other, hand], { x: .9, y: .9 }, selected, projection, 4 / 3, 165);
assert.equal(next.key, selected.key, 'Changing the target distance does not switch fingertips');
assert.equal(next.handIndex, 1, 'MediaPipe hand ordering does not change the tracked hand');
assert.equal(selectHandPoint([], null, null, projection, 4 / 3, 100), null);
assert(selectHandPoint([hand], null, null, projection, 4 / 3, 100), 'A hand can be tracked without a body target');
let joints = 0, connections = 0; const weights = [];
const ctx = new Proxy({
  arc: () => joints++, lineTo: () => connections++, stroke: function () { weights.push(this.lineWidth); },
}, { get: (target, key) => target[key] ?? (() => {}) });
drawHandOverlay(ctx, [hand], 800, 600, true);
assert.equal(joints, 21); assert.equal(connections, HAND_CONNECTIONS.length * 2);
assert(weights.includes(6) && weights.includes(3), 'Contrast underlay and bright lines are both drawn');
const simulated = demoHand({ x: .5, y: .4 }, 4 / 3);
assert.equal(simulated.length, 21);
assert(Math.abs(simulated[8].x - .5) < 1e-10 && Math.abs(simulated[8].y - .4) < 1e-10);
const markerCalls = [];
const markerCtx = new Proxy({ measureText: text => ({ width: text.length * 6 }),
  arc: (...args) => markerCalls.push(['arc', ...args]),
  stroke: function () { markerCalls.push(['stroke', this.strokeStyle]); },
  fillText: text => markerCalls.push(['label', text]),
}, { get: (target, key) => target[key] ?? (() => {}) });
drawHandMarker(markerCtx, { x: .4, y: .3 }, 800, 600);
assert(markerCalls.some(c => c[0] === 'arc' && c[1] === 320 && c[2] === 180 && c[3] === 14), 'The hand circle uses actual detected coordinates without a body target');
assert(markerCalls.some(c => c[0] === 'stroke' && c[1] === '#fb923c'), 'The hand circle stays orange');
assert(markerCalls.some(c => c[0] === 'label' && c[1].includes('รอการวน')), 'Hand detection is distinct from accepted movement');
drawHandMarker(markerCtx, { x: .4, y: .3 }, 800, 600, { counting: true });
assert(markerCalls.some(c => c[0] === 'label' && c[1].includes('กำลังนับ')));
console.log('Hand overlay checks passed: 21 joints, all connections, visibility, mirrored projection, stable fingertips and independent hand tracking.');
