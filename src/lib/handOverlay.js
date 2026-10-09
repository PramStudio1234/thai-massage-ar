export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15],
  [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [17, 0],
];

export function demoHand(point, ratio) {
  const shape = [[0, 0], [-.04, -.02], [-.06, -.04], [-.07, -.065], [-.075, -.085],
    [-.025, -.06], [-.035, -.1], [-.036, -.125], [-.036, -.15], [0, -.065],
    [0, -.112], [0, -.145], [0, -.175], [.025, -.06], [.029, -.1], [.03, -.13],
    [.031, -.155], [.045, -.045], [.052, -.075], [.056, -.105], [.06, -.125]];
  return shape.map(([x, y]) => ({ x: point.x + x - shape[8][0], y: point.y + (y - shape[8][1]) * ratio }));
}

export function visibleHands(hands = []) {
  const inFrame = p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  return hands.filter(hand => hand?.length === 21
    && hand.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    && hand.filter(inFrame).length >= 12
    && [0, 5, 9, 13, 17].filter(i => inFrame(hand[i])).length >= 3);
}

export function drawHandOverlay(ctx, hands, width, height, valid = false) {
  const color = valid ? '#22d3ee' : '#38bdf8';
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const hand of hands) {
    // Dark underlay and bright strokes remain visible on both skin and clothing.
    for (const [stroke, weight] of [['rgba(15,23,42,.8)', 6], [color, 3]]) {
      ctx.strokeStyle = stroke; ctx.lineWidth = weight;
      ctx.beginPath();
      for (const [i, j] of HAND_CONNECTIONS) {
        ctx.moveTo(hand[i].x * width, hand[i].y * height);
        ctx.lineTo(hand[j].x * width, hand[j].y * height);
      }
      ctx.stroke();
    }
    for (let i = 0; i < hand.length; i++) {
      ctx.beginPath(); ctx.arc(hand[i].x * width, hand[i].y * height, [4, 8, 12, 16, 20].includes(i) ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  ctx.restore();
}

export function selectHandPoint(hands, target, previous, projection, ratio, time) {
  let best = null, bestDistance = Infinity;
  const continuing = previous && time - previous.time < 750;
  for (let handIndex = 0; handIndex < hands.length; handIndex++) {
    // Keep the same joint while tracking; changing fingertips can create false turns.
    for (const key of continuing ? [previous.key] : target ? [8, 4, 12, 9] : [9]) {
      const h = hands[handIndex][key];
      const point = { x: projection.ox + (1 - h.x) * projection.sx,
        y: projection.oy + h.y * projection.sy, z: h.z ?? 0, time };
      const reference = continuing ? previous.point : target || { x: .5, y: .5 };
      const distance = Math.hypot(point.x - reference.x, (point.y - reference.y) / ratio);
      if (distance < bestDistance) { best = { key, handIndex, point, time }; bestDistance = distance; }
    }
  }
  return best;
}

export function sampleHandMotion(histories, hand, projection, ratio, time) {
  for (const key of [0, 4, 5, 8, 9, 12, 13, 16, 17, 20]) {
    const h = hand[key];
    const history = histories[key] || [];
    const previous = history[history.length - 1];
    const point = { x: projection.ox + (1 - h.x) * projection.sx,
      y: (projection.oy + h.y * projection.sy) / ratio, z: h.z ?? 0, time };
    if (previous && time - previous.time < 750) {
      const blend = 1 - Math.exp(-(time - previous.time) / 30);
      point.x = previous.x + (point.x - previous.x) * blend;
      point.y = previous.y + (point.y - previous.y) * blend;
      point.z = previous.z + (point.z - previous.z) * blend;
    }
    histories[key] = [...history, point].filter(p => time - p.time <= 2200).slice(-100);
  }
  return histories;
}

export function drawHandMarker(ctx, point, width, height, { trail = [], counting = false, selected = true, demo = false, label: customLabel } = {}) {
  const x = point.x * width, y = point.y * height;
  ctx.save();
  ctx.lineCap = 'round';
  if (trail.length > 1) {
    ctx.beginPath();
    trail.forEach((p, i) => i ? ctx.lineTo(p.x * width, p.y * height) : ctx.moveTo(p.x * width, p.y * height));
    ctx.strokeStyle = 'rgba(249,115,22,.8)'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(249,115,22,.3)'; ctx.fill();
  ctx.strokeStyle = 'rgba(15,23,42,.8)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffedd5'; ctx.fill();
  const label = customLabel || (demo ? 'มือจำลอง' : selected ? counting ? 'ติดตามมือ · กำลังนับ' : 'ติดตามมือ · รอการวน' : 'ตรวจพบมือ');
  ctx.font = '600 11px "Noto Sans Thai", sans-serif';
  const labelWidth = ctx.measureText(label).width + 16;
  const labelX = Math.max(4, Math.min(width - labelWidth - 4, x - labelWidth / 2));
  const labelY = y > 48 ? y - 42 : y + 22;
  ctx.fillStyle = 'rgba(15,23,42,.9)'; ctx.fillRect(labelX, labelY, labelWidth, 22);
  ctx.fillStyle = '#fdba74'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, labelX + 8, labelY + 11);
  ctx.restore();
}
