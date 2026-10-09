import { visibleHands } from './handOverlay';

export function handDetections(result = {}) {
  return (result.landmarks || []).flatMap((landmarks, i) => {
    if (!visibleHands([landmarks]).length) return [];
    const classification = result.handedness?.[i]?.[0];
    return [{ landmarks, label: classification?.categoryName || null, confidence: classification?.score || 0 }];
  });
}

const palmCenter = hand => {
  const points = [0, 5, 9, 13, 17].map(i => hand.landmarks[i]);
  return { x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
};

// Lock each focus slot to its own hand, regardless of MediaPipe array ordering.
export function updateFocusedHands(previous = [], detections = [], { count = 1, target, projection, ratio = 1, time }) {
  const tracks = Array.from({ length: count }, (_, i) => previous[i] ? { ...previous[i], visible: false } : null);
  const used = new Set();
  const matches = [];
  tracks.forEach((track, slot) => {
    if (!track) return;
    detections.forEach((hand, index) => {
      const center = palmCenter(hand);
      const distance = Math.hypot(center.x - track.center.x, (center.y - track.center.y) / ratio);
      const known = track.label && track.confidence >= .7 && hand.label && hand.confidence >= .7;
      if (known && track.label !== hand.label) return;
      // A confidently identified hand can return after an occlusion. Without
      // identity evidence, require spatial continuity instead of switching hands.
      if (distance > (known ? .65 : .25) || !known && time - track.time > 1500) return;
      matches.push({ slot, index, cost: distance - (known ? .05 : 0) });
    });
  });
  const matchedSlots = new Set();
  const assign = (slot, index) => {
    const hand = detections[index];
    const identity = tracks[slot]?.confidence >= .7 && hand.confidence < .7
      ? { label: tracks[slot].label, confidence: tracks[slot].confidence } : {};
    tracks[slot] = { ...tracks[slot], ...hand, ...identity, center: palmCenter(hand), time, visible: true, slot };
    used.add(index); matchedSlots.add(slot);
  };
  for (const match of matches.sort((a, b) => a.cost - b.cost)) {
    if (!used.has(match.index) && !matchedSlots.has(match.slot)) assign(match.slot, match.index);
  }
  // Fill only slots that have never acquired a hand. Lost locked hands stay lost
  // until they return, or the user explicitly chooses to acquire new hands.
  for (let slot = 0; slot < count; slot++) {
    if (tracks[slot]) continue;
    const candidates = detections.map((hand, index) => {
      const p = palmCenter(hand);
      const screen = { x: projection.ox + (1 - p.x) * projection.sx, y: projection.oy + p.y * projection.sy };
      return { index, distance: Math.hypot(screen.x - (target?.x ?? .5), (screen.y - (target?.y ?? .5)) / ratio) };
    }).filter(hand => !used.has(hand.index)).sort((a, b) => a.distance - b.distance);
    if (candidates.length) assign(slot, candidates[0].index);
  }
  return tracks;
}

export function focusedMotionState(states, count, paused = false, calibrating = false) {
  if (calibrating) return 'calibrating';
  if (paused) return 'paused';
  if (!states.length) return 'no-hand';
  if (states.length < count) return 'need-two-hands';
  for (const state of ['counter-clockwise', 'direction', 'still', 'no-hand']) {
    if (states.includes(state)) return state;
  }
  return states.every(state => state === 'valid') ? 'valid' : 'still';
}
