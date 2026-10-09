import assert from 'node:assert/strict';
import { defaultNodes } from '../src/lib/domain.js';
import { anatomicalTarget, targetProfile, updateTargetTrack, adjustTarget, targetAdjustment } from '../src/lib/anatomicalTargets.js';
import { videoProjection, projectPoint, drawTargetOverlay, targetColor } from '../src/lib/targetOverlay.js';

const pose = Array.from({ length: 33 }, () => ({ x: .5, y: .25, z: 0, visibility: 1, presence: 1 }));
const points = { 3: [.475, .145], 6: [.525, .145], 7: [.45, .16], 8: [.55, .16],
  11: [.36, .32], 12: [.64, .32], 13: [.27, .49], 14: [.73, .49],
  15: [.22, .64], 16: [.78, .64], 23: [.42, .59], 24: [.58, .59],
  25: [.4, .77], 26: [.6, .77], 27: [.38, .94], 28: [.62, .94],
  29: [.38, .955], 30: [.62, .955], 31: [.345, .975], 32: [.655, .975] };
for (const [i, [x, y]] of Object.entries(points)) Object.assign(pose[i], { x, y });
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const options = { strict: true };
const transform = (p, scale = 1) => ({ ...p, x: .5 + (p.x - .5) * scale, y: .5 + (p.y - .5) * scale });

for (const node of defaultNodes) {
  const point = anatomicalTarget(node, pose, false, options);
  assert(point, `Visible ${node.name} ${node.english} has a target`);
  const mirrored = anatomicalTarget(node, pose, true, options);
  near(mirrored.x, 1 - point.x); near(mirrored.y, point.y);
  const scaled = anatomicalTarget(node, pose.map(p => transform(p, .65)), false, options);
  near(scaled.x, .5 + (point.x - .5) * .65);
  near(scaled.y, .5 + (point.y - .5) * .65);
  const rotatedPose = pose.map(p => ({ ...p, x: 1 - p.y, y: p.x }));
  const rotated = anatomicalTarget(node, rotatedPose, false, options);
  near(rotated.x, 1 - point.y); near(rotated.y, point.x);
  const profile = targetProfile(node);
  for (const i of new Set([...profile.weights.map(([i]) => i), ...profile.axis])) {
    const obscured = pose.map(p => ({ ...p }));
    obscured[i].visibility = .2;
    assert.equal(anatomicalTarget(node, obscured, true, options), null, `${node.name} requires anchor ${i}`);
    obscured[i].visibility = 1; obscured[i].y = 1.1;
    assert.equal(anatomicalTarget(node, obscured, true, options), null, 'Off-camera anchors are rejected');
  }
}
const leftLeg = defaultNodes.find(n => n.name === 'ต้นขาด้านหน้า' && / L$/.test(n.english));
const rightLeg = defaultNodes.find(n => n.name === 'ต้นขาด้านหน้า' && / R$/.test(n.english));
assert(anatomicalTarget(leftLeg, pose, false).x < anatomicalTarget(rightLeg, pose, false).x);
const hiddenLegs = pose.map((p, i) => ({ ...p, visibility: i >= 23 ? .1 : 1 }));
assert.equal(anatomicalTarget(leftLeg, hiddenLegs, true, options), null, 'An upper-body view cannot establish a thigh target');
const sideLeg = defaultNodes.find(n => n.name === 'ต้นขาด้านข้าง' && / L$/.test(n.english));
const sideView = pose.map(p => ({ ...p }));
sideView[24].visibility = .2;
assert(anatomicalTarget(sideLeg, sideView, true, options), 'A visible near-side leg remains usable when the far hip is obscured');
const foot = defaultNodes.find(n => n.name === 'ฝ่าเท้า');
const footPoint = anatomicalTarget(foot, pose, false);
near(footPoint.x, (pose[29].x + pose[31].x) / 2);
near(footPoint.y, (pose[29].y + pose[31].y) / 2);
let track = updateTargetTrack(null, { x: .4, y: .7 }, 100);
assert.equal(track.ready, false);
track = updateTargetTrack(track, { x: .401, y: .701 }, 165);
assert.equal(track.ready, false);
track = updateTargetTrack(track, { x: .402, y: .702 }, 230);
assert.equal(track.ready, true);
assert.equal(updateTargetTrack(track, null, 295), null);
assert.equal(updateTargetTrack(track, { x: .4, y: .7 }, 630).ready, true, 'Slower body inference retains a stable target');
assert.equal(updateTargetTrack(track, { x: .4, y: .7 }, 831).ready, false, 'Targets expire after a 600ms tracking gap');
assert.equal(updateTargetTrack(track, { x: .8, y: .2 }, 295).ready, false);

for (const [width, height, videoWidth, videoHeight] of [[800, 600, 1280, 720], [600, 800, 640, 480]]) {
  const projection = videoProjection(width, height, videoWidth, videoHeight);
  const base = projectPoint(anatomicalTarget(leftLeg, pose, true), projection);
  const selected = { x: base.x + .015, y: base.y - .018 };
  const correction = targetAdjustment(base, selected, width / height);
  const corrected = adjustTarget(base, correction, width / height);
  near(corrected.x, selected.x); near(corrected.y, selected.y);
  const moved = adjustTarget({ ...base, x: base.x + .04 }, correction, width / height);
  near(moved.x, selected.x + .04);
}
const arcs = [];
const ctx = new Proxy({ measureText: () => ({ width: 100 }), arc: (x, y, r) => arcs.push({ x, y, r }) },
  { get: (target, key) => target[key] ?? (() => {}) });
drawTargetOverlay(ctx, { targets: [{ node: { name: 'ฝ่าเท้า', motion: 'circular', overlayRadius: 60 }, point: { x: .4, y: .97 } }],
  activeIndex: 0, progress: 0, width: 800, height: 600, time: 100, tracked: true });
near(arcs[0].x, 320); near(arcs[0].y, 582); // A near-edge foot marker never moves up the shin.
assert(arcs.every(p => p.r <= 40), 'Guide circles stay compact, even with a legacy large radius');
assert.equal(targetColor(.7).stroke, '#ef4444', 'An active target remains red');
assert.equal(targetColor(.7).fill, 'rgba(239,68,68,.2)');
console.log(`Anatomical checks passed for all ${defaultNodes.length} targets: visibility, selected side, scale, rotation, feet, tracking, calibration and edge rendering.`);
