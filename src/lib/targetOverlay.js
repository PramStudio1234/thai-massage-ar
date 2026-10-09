// Project normalized landmarks onto an object-contain video, including letterboxing.
export function videoProjection(width, height, videoWidth, videoHeight) {
  if (!videoWidth || !videoHeight || !width || !height) return { sx: 1, sy: 1, ox: 0, oy: 0 };
  const scale = Math.min(width / videoWidth, height / videoHeight);
  const sx = videoWidth * scale / width;
  const sy = videoHeight * scale / height;
  return { sx, sy, ox: (1 - sx) / 2, oy: (1 - sy) / 2 };
}
export function projectPoint(point, box) {
  return point && { ...point, x: box.ox + point.x * box.sx, y: box.oy + point.y * box.sy,
    ...(point.basis ? { basis: { x: point.basis.x * box.sx, y: point.basis.y * box.sy } } : {}) };
}
export function targetColor(progress, completed = false) {
  if (completed || progress >= 1) return { stroke: '#22c55e', fill: 'rgba(34,197,94,.3)', label: 'สำเร็จแล้ว' };
  return { stroke: '#ef4444', fill: 'rgba(239,68,68,.2)', label: progress > 0 ? `กำลังฝึก ${Math.round(progress * 100)}%` : 'จุดที่ต้องนวด' };
}
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
function pill(ctx, text, x, y, width, height, border) {
  ctx.font = '600 12px "Noto Sans Thai", sans-serif';
  const size = Math.min(width - 12, ctx.measureText(text).width + 20);
  x = clamp(x, size / 2 + 6, width - size / 2 - 6);
  y = clamp(y, 15, height - 15);
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - 13, size, 26, 8);
  ctx.fillStyle = 'rgba(15,23,42,.94)';
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y, size - 10);
}
function arrow(ctx, x, y, angle, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
export function drawTargetOverlay(ctx, { targets, activeIndex, progress, width, height, time, tracked = true, reducedMotion = false }) {
  const ordered = targets.map((target, index) => ({ ...target, index })).sort((a,b) => (a.index === activeIndex) - (b.index === activeIndex));
  for (const { node, point, index } of ordered) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const active = index === activeIndex;
    const completed = index < activeIndex || active && progress >= 1;
    const color = targetColor(active ? progress : completed ? 1 : 0, completed);
    const radius = active ? Math.max(18, Math.min(26, width * .032)) : 10;
    const rawX = point.x * width, rawY = point.y * height;
    // Only labels may move to fit. The target center must remain on the body.
    const x = rawX, y = rawY;
    const outside = rawX < 0 || rawX > width || rawY < 0 || rawY > height;
    ctx.save();
    // A white outline keeps the red marker visible even on red clothes or dark video.
    if (active) {
      const pulse = reducedMotion ? .5 : (Math.sin(time / 250) + 1) / 2;
      ctx.beginPath(); ctx.arc(x, y, radius + 2 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = color.fill; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color.fill; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = active ? 4 : 3; ctx.stroke();
    ctx.strokeStyle = color.stroke; ctx.lineWidth = active ? 2 : 1.5; ctx.stroke();
    if (active && progress > 0) {
      ctx.beginPath(); ctx.arc(x, y, radius - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    }
    if (active && !completed) {
      const orbit = radius + 12;
      if (node.motion === 'circular') {
        ctx.beginPath(); ctx.setLineDash([6, 4]); ctx.arc(x, y, orbit, 0, Math.PI * 2);
        ctx.strokeStyle = color.stroke; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
        for (let a = 0; a < 3; a++) {
          const angle = (reducedMotion ? 0 : time / 600) + a * Math.PI * 2 / 3;
          arrow(ctx, x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit, angle + Math.PI / 2, color.stroke);
        }
      } else if (node.motion === 'vertical') {
        // Follow the muscle axis rather than assuming the arm/leg is upright.
        const angle = Math.atan2(node.axis?.y ?? 1, node.axis?.x ?? 0);
        ctx.beginPath(); ctx.moveTo(x - Math.cos(angle) * orbit, y - Math.sin(angle) * orbit); ctx.lineTo(x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit);
        ctx.strokeStyle = color.stroke; ctx.lineWidth = 3; ctx.stroke();
        arrow(ctx, x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit, angle, color.stroke);
        arrow(ctx, x - Math.cos(angle) * orbit, y - Math.sin(angle) * orbit, angle + Math.PI, color.stroke);
      } else {
        ctx.beginPath(); ctx.arc(x, y, radius - 10, 0, Math.PI * 2);
        ctx.strokeStyle = color.stroke; ctx.lineWidth = 4; ctx.stroke();
      }
      const instruction = node.motion === 'circular' ? '↻ คลึงวนตามเข็มนาฬิกา' : node.motion === 'vertical' ? '↕ ลูบรีดตามแนวลูกศร' : 'กดแล้วผ่อนเป็นจังหวะ';
      pill(ctx, instruction, x, y - radius - 32, width, height, color.stroke);
    }
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color.stroke; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(completed ? '✓' : String(index + 1), x + radius + 8, y - radius);
    if (active) {
      const message = outside ? 'จุดอยู่นอกภาพ · จัดร่างกายให้เห็นบริเวณนี้' : `${index + 1}. ${node.name} · ${node.sideLabel || ''} · ${color.label}`;
      pill(ctx, message, x, y + radius + 32, width, height, color.stroke);
    }
    ctx.restore();
  }
}
