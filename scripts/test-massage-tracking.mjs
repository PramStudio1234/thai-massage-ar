import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({ entryPoints: ['src/lib/tracking.js'], bundle: true,
  platform: 'node', format: 'esm', write: false });
const { evaluateMotion, evaluateHandMotion, massageState, advanceTimer, createResult, emptyMetrics } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const target = { x: .5, y: .5 };
const node = { motion: 'circular', radius: .048 };
const circle = (offset = 0, direction = 1, noise = 0) => Array.from({ length: 45 }, (_, i) => ({
  x: .5 + offset + .024 * Math.cos(i * .04 * direction) + Math.sin(i * 17) * noise,
  y: .5 + .024 * Math.sin(i * .04 * direction) + Math.cos(i * 13) * noise,
  time: i * 16,
}));
const state = path => evaluateMotion(path, target, node).state;
assert.equal(state(circle()), 'valid');
assert.equal(state(circle(.07)), 'valid', 'Offset movement counts');
assert.equal(state(circle(.07, 1, .001)), 'valid', 'Small landmark jitter is tolerated');
assert.equal(state(circle(.07, -1)), 'counter-clockwise');
assert.equal(state(circle(.3)), 'valid', 'No radius boundary is enforced');
assert.equal(state(circle(.3, -1)), 'counter-clockwise', 'Wrong direction stays wrong at any distance');
assert.equal(state(circle().map(p => ({ ...p, x: .5 + (p.x - .5) * 4, y: .5 + (p.y - .5) * 2 }))), 'valid', 'An oval path does not have to match a circle');
assert.equal(state(Array.from({ length: 45 }, (_, i) => ({ ...target, time: i * 16 }))), 'still');
assert.equal(state(Array.from({ length: 45 }, (_, i) => ({ x: .5 + i * .001, y: .5, time: i * 16 }))), 'direction');
const edge = [{ x: .65, y: .5, time: 0 }];
assert.equal(state(edge), 'still', 'Distance alone never produces an error');
assert.equal(state([]), 'no-hand');
const stroke = Array.from({ length: 45 }, (_, i) => ({ x: .8, y: .2 + i * .001, time: i * 16 }));
assert.equal(evaluateMotion(stroke, target, { motion: 'vertical' }).state, 'valid');
assert.equal(evaluateMotion(stroke, target, { motion: 'vertical' }, { x: 1, y: 0 }).state, 'direction');
const result = createResult({ metrics: emptyMetrics(), region: 'upper', part: 'บ่า 2 ข้าง', duration: 1, nodes: 2, mode: 'demo' });
assert.equal(result.trackingMode, 'direction-only');
let elapsed = 0, validFrames = 0;
const continuous = Array.from({ length: 501 }, (_, i) => ({
  x: .57 + .024 * Math.cos(i * .04) + Math.sin(i * 17) * .001,
  y: .5 + .024 * Math.sin(i * .04) + Math.cos(i * 13) * .001, time: i * 16,
}));
for (let i = 0; i < continuous.length; i++) {
  const result = evaluateMotion(continuous.slice(Math.max(0, i - 44), i + 1), target, node);
  if (result.state === 'valid') validFrames++;
  elapsed = advanceTimer(elapsed, 16, 10000, result.state).elapsed;
}
assert(validFrames / continuous.length > .85, 'Offset noisy circles should count consistently');
assert.equal(advanceTimer(elapsed, 100, 10000, 'direction').elapsed, elapsed);
assert.equal(advanceTimer(elapsed, 100, 10000, 'valid', true).elapsed, elapsed);
assert.deepEqual(massageState({ state: 'valid' }, true), { state: 'valid', accepted: true });
assert.deepEqual(massageState({ state: 'still' }, true), { state: 'still', accepted: false });
assert.equal(massageState({ state: 'still' }, true, true).state, 'valid', 'Once started, detected stationary hands retain the last accepted direction');
assert.equal(massageState({ state: 'valid' }, false, true).state, 'no-hand', 'Tracking loss overrides old valid movement');
assert.equal(massageState({ state: 'counter-clockwise' }, true, true).state, 'counter-clockwise');
assert.equal(massageState({ state: 'direction' }, true, true).accepted, false);
assert.equal(massageState({ state: 'valid' }, true, true, true).state, 'paused');
assert.equal(massageState({ state: 'no-hand' }, false, true, true).state, 'paused', 'Manual pause stays visible when a demo hand stops');
assert.equal(massageState({ state: 'valid' }, true, true, false, true).state, 'calibrating');
const cameraCircle = Array.from({ length: 5 }, (_, i) => ({
  x: .8 + .024 * Math.cos(i * .16), y: .5 + .024 * Math.sin(i * .16), time: i * 64,
}));
assert.equal(state(cameraCircle.slice(0, 4)), 'valid', 'Starts as soon as four camera samples establish direction, without a 650ms wait');
const reversed = [...circle(), ...Array.from({ length: 5 }, (_, i) => ({
  x: .5 + .024 * Math.cos(1.76 - i * .16), y: .5 + .024 * Math.sin(1.76 - i * .16), time: 720 + i * 64,
}))];
assert.equal(state(reversed), 'counter-clockwise', 'Recent reversal overrides older clockwise movement');
for (const interval of [140, 250, 400]) {
  for (const direction of [1, -1]) {
    const slowFrames = Array.from({ length: 6 }, (_, i) => ({
      x: .5 + .008 * Math.cos(i * interval / 1000 * 2.5 * direction),
      y: .5 + .008 * Math.sin(i * interval / 1000 * 2.5 * direction), time: i * interval,
    }));
    assert.equal(state(slowFrames), direction === 1 ? 'valid' : 'counter-clockwise', `Direction survives ${interval}ms camera frames`);
  }
}
assert.equal(advanceTimer(0, 250, 10000, 'valid').elapsed, 250, 'Slow inference counts elapsed time, not a 160ms cap');
const { sampleHandMotion } = await import('../src/lib/handOverlay.js');
for (const direction of [1, -1]) {
  const histories = {};
  for (let i = 0; i < 12; i++) {
    // Contact fingertips stay still; palm and knuckles perform the kneading.
    const hand = Array.from({ length: 21 }, (_, key) => ({
      x: .5 - ([4, 8, 12, 16, 20].includes(key) ? 0 : .008 * Math.cos(i * .35 * direction)),
      y: .5 + ([4, 8, 12, 16, 20].includes(key) ? 0 : .008 * Math.sin(i * .35 * direction)), z: 0,
    }));
    sampleHandMotion(histories, hand, { ox: 0, oy: 0, sx: 1, sy: 1 }, 1, i * 140);
  }
  const result = evaluateHandMotion(histories, node, { x: 0, y: 1 });
  assert.equal(result.state, direction === 1 ? 'valid' : 'counter-clockwise', 'Anchored fingertips do not conceal kneading direction');
  assert(![4, 8, 12, 16, 20].includes(result.key), 'The tracked point belongs to a moving part of the same hand');
}
console.log(`Massage tracking checks passed; continuous valid frames: ${validFrames}/${continuous.length}.`);
