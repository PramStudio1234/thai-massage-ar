import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { sampleHandMotion } from '../src/lib/handOverlay.js';

const load = async path => {
  const result = await build({ entryPoints: [path], bundle: true, platform: 'node', format: 'esm', write: false });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};
const [{ handDetections, updateFocusedHands, focusedMotionState }, { evaluateHandMotion, massageState, advanceTimer }] =
  await Promise.all([load('src/lib/handFocus.js'), load('src/lib/tracking.js')]);
const projection = { ox: 0, oy: 0, sx: 1, sy: 1 };
const options = { count: 1, target: { x: .35, y: .5 }, projection, ratio: 1, time: 100 };
const hand = (label, x, y = .5) => ({ label, confidence: .99,
  landmarks: Array.from({ length: 21 }, (_, i) => ({ x: x + i * .001, y: y + i * .001, z: 0 })) });
const left = hand('Left', .65), right = hand('Right', .25);
let tracks = updateFocusedHands([], [right, left], options);
assert.equal(tracks.length, 1);
assert.equal(tracks[0].label, 'Left', 'The closest hand is selected initially, not the first detection');
tracks[0].histories = { retained: true };
tracks = updateFocusedHands(tracks, [left, right], { ...options, time: 240, target: { x: .75, y: .5 } });
assert.equal(tracks[0].label, 'Left', 'Target changes and detection ordering do not change focus');
assert(tracks[0].histories.retained, 'The selected hand keeps its own history');
tracks = updateFocusedHands(tracks, [right], { ...options, time: 380 });
assert.equal(tracks[0].visible, false, 'The other hand cannot replace a lost selected hand');
assert.equal(focusedMotionState(tracks.filter(t => t?.visible).map(() => 'valid'), 1), 'no-hand');
tracks = updateFocusedHands(tracks, [right, hand('Left', .5)], { ...options, time: 2600 });
assert.equal(tracks[0].visible, true, 'The same confidently identified hand can return after an occlusion');
assert.equal(tracks[0].label, 'Left');
tracks = updateFocusedHands(tracks, [{ ...hand('Left', .5), confidence: .5 }], { ...options, time: 2740 });
assert.equal(tracks[0].confidence, .99, 'A low confidence frame does not discard acquired identity');

let pair = updateFocusedHands([], [left, right], { ...options, count: 2 });
pair[0].histories = { owner: 'Left' }; pair[1].histories = { owner: 'Right' };
pair = updateFocusedHands(pair, [right, left], { ...options, count: 2, time: 240 });
assert.deepEqual(pair.map(t => t.histories.owner), ['Left', 'Right'], 'Two histories stay separate when detection ordering swaps');
const crossed = updateFocusedHands(pair, [hand('Right', .65), hand('Left', .25)], { ...options, count: 2, time: 300 });
assert.deepEqual(crossed.map(t => t.histories.owner), ['Left', 'Right'], 'Confident identities stay separate when hands cross');
pair = updateFocusedHands(pair, [right], { ...options, count: 2, time: 380 });
assert.deepEqual(pair.map(t => t.visible), [false, true], 'A surviving hand never occupies both slots');
assert.equal(focusedMotionState(['valid'], 2), 'need-two-hands');
assert.equal(focusedMotionState(['valid', 'still'], 2), 'still');
assert.equal(focusedMotionState(['valid', 'counter-clockwise'], 2), 'counter-clockwise');
assert.equal(focusedMotionState(['valid', 'valid'], 2), 'valid');
assert.equal(focusedMotionState([], 2, true), 'paused');
assert.equal(focusedMotionState(['valid', 'valid'], 2, false, true), 'calibrating');
const unknown = { ...left, label: null, confidence: 0 };
let unknownTracks = updateFocusedHands([], [unknown], options);
unknownTracks = updateFocusedHands(unknownTracks, [{ ...right, label: null, confidence: 0 }], { ...options, time: 240 });
assert.equal(unknownTracks[0].visible, false, 'Unknown identity requires spatial continuity');
const filtered = handDetections({ landmarks: [left.landmarks.slice(0, 20), right.landmarks],
  handedness: [[{ categoryName: 'Left', score: .99 }], [{ categoryName: 'Right', score: .99 }]] });
assert.equal(filtered[0].label, 'Right', 'Visibility filtering preserves the original classification index');

// Exercise separate real hand histories, direction checks and the countdown together.
for (const { count, wrongSecondHand } of [{ count: 1, wrongSecondHand: true }, { count: 2, wrongSecondHand: true }, { count: 2, wrongSecondHand: false }]) {
  let focused = [], elapsed = 0, finalState;
  for (let i = 0; i < 18; i++) {
    const theta = i * .35;
    const clockwise = hand('Left', .65 - .01 * Math.cos(theta), .5 + .01 * Math.sin(theta));
    const counter = hand('Right', .25 - .01 * Math.cos(theta), .5 + (wrongSecondHand ? -1 : 1) * .01 * Math.sin(theta));
    focused = updateFocusedHands(focused, i % 2 ? [counter, clockwise] : [clockwise, counter], { ...options, count, time: i * 140 });
    const states = focused.filter(t => t?.visible).map(track => {
      track.histories ||= {};
      sampleHandMotion(track.histories, track.landmarks, projection, 1, i * 140);
      const result = massageState(evaluateHandMotion(track.histories, { motion: 'circular' }, { x: 0, y: 1 }), true, track.accepted);
      track.accepted = result.accepted;
      return result.state;
    });
    finalState = focusedMotionState(states, count);
    elapsed = advanceTimer(elapsed, 140, 10000, finalState).elapsed;
  }
  const valid = count === 1 || !wrongSecondHand;
  assert.equal(finalState, valid ? 'valid' : 'counter-clockwise');
  assert.equal(elapsed > 0, valid, 'An ignored wrong direction hand cannot stop the one hand timer; both hands must pass in two hand mode');
}
console.log('Hand focus checks passed: single hand isolation, identity continuity, reordered detections, separate two hand histories, tracking loss and countdown.');
