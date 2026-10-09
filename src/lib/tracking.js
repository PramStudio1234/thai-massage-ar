// SENSA Mathematical Motion Analysis & MediaPipe Landmark Tracking Engine

import { feedbackFor } from './domain';
import { anatomicalTarget } from './anatomicalTargets';

/**
 * Calculates screen-space normalized coordinates of target node from MediaPipe Pose landmarks
 * Uses the selected anatomical profile, visible anchors and body-relative offsets.
 */
export function targetPoint(node, pose = [], mirror = true, options = {}) {
  return anatomicalTarget(node, pose, mirror, options);
}

/**
 * Evaluates hand movement trajectory over a sliding window
 * Evaluates movement direction only; target coordinates never gate the timer.
 */
export function evaluateMotion(history = [], _target, node, axis = { x: 0, y: 1 }) {
  const last = history[history.length - 1];
  if (!last) return { state: 'no-hand', speed: 0 };

  const latestFrames = history.slice(-8);
  const intervals = latestFrames.slice(1).map((p, i) => p.time - latestFrames[i].time).filter(dt => dt > 0);
  intervals.sort((a, b) => a - b);
  const frameInterval = intervals[Math.floor(intervals.length / 2)] || 60;
  // Enough real camera frames are required even when inference runs below 8 FPS.
  const windowMs = Math.min(2200, Math.max(650, frameInterval * 5));
  const recent = history.filter(p => last.time - p.time <= windowMs);
  if (recent.length < 3) return { state: 'still', speed: 0 };

  // Average over several frames rather than amplifying a single landmark hiccup.
  const end = recent.find(p => p.time < last.time && last.time - p.time <= 120) ?? recent[recent.length - 2];
  const dt = (last.time - end.time) / 1000;
  if (dt <= 0 || dt > .75) return { state: 'still', speed: 0 };

  const vx = (last.x - end.x) / dt;
  const vy = (last.y - end.y) / dt;
  const vz = ((last.z ?? 0) - (end.z ?? 0)) / dt;
  const speed = Math.hypot(vx, vy, node.motion === 'pulse' ? vz : 0);

  if (speed < .002) return { state: 'still', speed };

  // 1. Vertical Up-Down linear stroke analysis
  if (node.motion === 'vertical') {
    const length = Math.hypot(axis.x, axis.y) || 1;
    const dot = Math.abs((vx * axis.x + vy * axis.y) / length);
    return {
      state: dot / Math.max(speed, 0.001) > 0.75 ? 'valid' : 'direction',
      speed
    };
  }

  // 2. Acupressure Pulsing / Pressing analysis
  if (node.motion === 'pulse') {
    const length = Math.hypot(axis.x, axis.y) || 1;
    const along = Math.abs((vx * axis.x + vy * axis.y) / length);
    return {
      state: Math.abs(vz) > 0.012 || along > .55 * speed ? 'valid' : 'direction',
      speed
    };
  }

  // Prefer recent consistent turns so a reversal is not masked by old clockwise history.
  const quick = [];
  for (let i = recent.length - 1; i >= 0 && quick.length < 4; i--) {
    const p = recent[i];
    if (!quick.length || quick[0].time - p.time >= 55) quick.unshift(p);
  }
  if (quick.length >= 3) {
    const directions = quick.slice(1).map((p, i) => ({ x: p.x - quick[i].x, y: p.y - quick[i].y }));
    const turns = directions.slice(1).map((q, i) => {
      const p = directions[i];
      return Math.atan2(p.x * q.y - p.y * q.x, p.x * q.x + p.y * q.y);
    });
    if (directions.every(p => Math.hypot(p.x, p.y) > .0002)) {
      const coherent = turns.length === 1 ? frameInterval >= 100 : Math.abs(turns[0] - turns[1]) < .2;
      const totalTurn = turns.reduce((sum, angle) => sum + angle, 0);
      if (coherent && turns.every(angle => angle > .05 && angle < 1.4) && totalTurn > .12)
        return { state: 'valid', speed };
      if (coherent && turns.every(angle => angle < -.05 && angle > -1.4) && totalTurn < -.16)
        return { state: 'counter-clockwise', speed };
    }
  }

  // Smooth short time buckets, then inspect turns between movement vectors.
  // No fitted circle, center, radius, or roundness requirement is used.
  const buckets = new Map();
  for (const p of recent) {
    const key = Math.floor(p.time / 50);
    const bucket = buckets.get(key) || { x: 0, y: 0, count: 0 };
    bucket.x += p.x; bucket.y += p.y; bucket.count++;
    buckets.set(key, bucket);
  }
  const path = [...buckets.values()].map(p => ({ x: p.x / p.count, y: p.y / p.count }));
  const vectors = [];
  for (let i = 3; i < path.length; i++) {
    const vector = { x: path[i].x - path[i - 3].x, y: path[i].y - path[i - 3].y };
    if (Math.hypot(vector.x, vector.y) >= .0002) vectors.push(vector);
  }
  let turn = 0;
  let travel = 0;
  for (let i = 1; i < vectors.length; i++) {
    const p = vectors[i - 1], q = vectors[i];
    const angle = Math.atan2(p.x * q.y - p.y * q.x, p.x * q.x + p.y * q.y);
    if (Math.abs(angle) > Math.PI / 2) continue; // Ignore abrupt reversals, not a circular turn.
    turn += angle;
    travel += Math.abs(angle);
  }

  // Clockwise angular change is positive in screen space
  const isClockwiseValid = turn > 0.08 && (turn / Math.max(travel, 0.001)) > 0.45;
  const isCounterClockwise = turn < -0.08 && -turn / Math.max(travel, .001) > .45;

  if (isCounterClockwise) {
    return {
      state: 'counter-clockwise',
      speed
    };
  }

  return {
    state: isClockwiseValid ? 'valid' : 'direction',
    speed
  };
}

export function evaluateHandMotion(histories, node, axis) {
  const candidates = Object.entries(histories).map(([key, history]) => {
    const recent = history.filter(p => history[history.length - 1].time - p.time <= 2200);
    const extent = Math.hypot(Math.max(...recent.map(p => p.x)) - Math.min(...recent.map(p => p.x)),
      Math.max(...recent.map(p => p.y)) - Math.min(...recent.map(p => p.y)));
    return { ...evaluateMotion(history, null, node, axis), key: Number(key), extent };
  }).filter(candidate => Number.isFinite(candidate.extent)).sort((a, b) => b.extent - a.extent);
  // Use the part of this same hand that actually moves, not a fingertip pressed in place.
  return candidates.find(candidate => candidate.state !== 'still' && candidate.extent >= .0006)
    || candidates[0] || { state: 'no-hand', speed: 0 };
}

export const emptyMetrics = () => ({
  validMs: 0,
  observedMs: 0,
  contactMs: 0,
  directionMs: 0,
  exits: 0,
  speeds: []
});

/**
 * Strict timer advancement
 * Time ONLY increments when state === 'valid' and not paused
 */
export function massageState(evaluated, hasHand, accepted = false, paused = false, calibrating = false) {
  if (paused || calibrating) return { state: calibrating ? 'calibrating' : 'paused', accepted: hasHand ? accepted : false };
  if (!hasHand) return { state: 'no-hand', accepted: false };
  if (evaluated.state === 'valid') return { state: 'valid', accepted: true };
  if (evaluated.state === 'counter-clockwise' || evaluated.state === 'direction')
    return { state: evaluated.state, accepted: false };
  // Once direction is established, a brief stationary hand does not reset the timer.
  // Only loss of tracking or an observed wrong direction ends the accepted motion.
  return { state: accepted ? 'valid' : evaluated.state, accepted };
}

export function advanceTimer(elapsed, delta, total, state, paused = false) {
  const next = state === 'valid' && !paused
    ? Math.min(total, elapsed + Math.max(0, Math.min(delta, 500)))
    : elapsed;
  return {
    elapsed: next,
    complete: next >= total
  };
}

/**
 * Computes official 40% Continuity, 40% Directional Accuracy, 20% Speed Efficiency
 */
export function scoreMetrics(metrics, nodes = 4) {
  const continuity = Math.round(100 / (1 + (metrics.exits / Math.max(1, nodes)) * 0.3));
  const accuracy = Math.round(100 * Math.min(1, metrics.directionMs / Math.max(metrics.contactMs, 1)));
  
  const s = metrics.speeds.filter(v => Number.isFinite(v) && v > 0);
  const mean = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  const variance = s.length ? s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length : 0;
  const cv = mean ? Math.sqrt(variance) / mean : 1;
  const efficiency = Math.max(0, Math.round(100 - Math.min(70, cv * 50) - Math.max(0, mean - 0.35) * 60));

  const totalScore = Math.round(continuity * 0.4 + accuracy * 0.4 + efficiency * 0.2);

  return {
    continuity,
    accuracy,
    efficiency,
    score: totalScore
  };
}

export function createResult({ metrics, region, part, duration, nodes, mode, userId, userName }) {
  const scores = scoreMetrics(metrics, nodes);
  const r = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: userId || 'demo-learner',
    userName: userName || 'ผู้เรียน',
    region,
    part,
    duration,
    nodes,
    mode,
    trackingMode: 'direction-only',
    ...scores,
    exits: metrics.exits,
    created: new Date().toISOString(),
    feedback: ''
  };
  r.feedback = feedbackFor(r);
  return r;
}
