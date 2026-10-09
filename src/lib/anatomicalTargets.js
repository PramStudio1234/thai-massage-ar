// Pose landmarks locate body regions, not individual pressure points or body surfaces.
// Use named anchor profiles and body-relative vectors instead of screen offsets.
export function targetProfile(node) {
  const side = / R$/.test(node.english || '') ? 1 : 0;
  const shoulder = 11 + side, elbow = 13 + side, wrist = 15 + side;
  const hip = 23 + side, knee = 25 + side, ankle = 27 + side;
  const limb = (a, b, t, outward = 0, reference = null) => ({
    weights: [[a, 1 - t], [b, t]], axis: [a, b], outward, reference,
  });
  switch (node.name) {
    case 'คอด้านหลัง':
    case 'ฐานกะโหลก': {
      const t = node.name === 'คอด้านหลัง' ? .6 : .82;
      return { weights: [[11, (1 - t) / 2], [12, (1 - t) / 2], [7, t / 2], [8, t / 2]],
        axis: [11, 12], lateral: side ? .08 : -.08 };
    }
    case 'บ่า 2 ข้าง': return limb(shoulder, 12 - side, .22);
    case 'ขมับ 2 ข้าง': return limb(3 + side * 3, 7 + side, .65);
    case 'ต้นแขนด้านหน้า': return limb(shoulder, elbow, .45);
    case 'ต้นแขนด้านหลัง': return limb(shoulder, elbow, .55);
    case 'แขนท่อนล่างด้านฝ่ามือ': return limb(elbow, wrist, .45);
    case 'แขนท่อนล่างด้านหลังมือ': return limb(elbow, wrist, .55);
    case 'ต้นขาด้านหน้า': return limb(hip, knee, .45);
    case 'ต้นขาด้านหลัง': return limb(hip, knee, .55);
    case 'ต้นขาด้านข้าง': return limb(hip, knee, .5, .08, [hip, 24 - side]);
    case 'เข่า': return limb(hip, knee, 1);
    case 'น่อง': return limb(knee, ankle, .45);
    case 'หน้าแข้ง': return limb(knee, ankle, .5, -.045, [hip, 24 - side]);
    case 'ฝ่าเท้า': return limb(29 + side, 31 + side, .5);
    default: return { ...limb(node.a, node.b, node.t ?? 0),
      axis: node.a === node.b ? [11, 12] : [node.a, node.b] };
  }
}

export function targetSide(node) {
  return / R$/.test(node.english || '') ? 'ขวาของผู้ฝึก' : 'ซ้ายของผู้ฝึก';
}

export function targetGuidance(node) {
  let framing;
  if (node.region === 'upper') framing = 'ให้กล้องเห็นศีรษะ คอ และไหล่ชัดเจน';
  else if (node.region === 'middle') framing = node.name.includes('ท่อนล่าง')
    ? 'ให้กล้องเห็นข้อศอกถึงข้อมือของข้างที่กำลังฝึก' : 'ให้กล้องเห็นไหล่ถึงข้อศอกของข้างที่กำลังฝึก';
  else if (node.name === 'ฝ่าเท้า') framing = 'ให้กล้องเห็นส้นเท้าและปลายเท้า ยกหรือหันฝ่าเท้าเข้าหากล้อง';
  else if (['น่อง', 'หน้าแข้ง'].includes(node.name)) framing = 'ให้กล้องเห็นเข่าถึงข้อเท้าและขาท่อนล่าง';
  else framing = 'ให้กล้องเห็นสะโพกถึงเข่าและต้นขาของข้างที่กำลังฝึก';
  const surface = node.name.includes('ด้านหลัง') || node.name === 'น่อง' || node.name === 'ฐานกะโหลก'
    ? 'หันบริเวณด้านหลังที่เลือกให้กล้องเห็น'
    : node.name.includes('ด้านข้าง') ? 'หันด้านข้างของต้นขาที่เลือกให้กล้องเห็น'
    : node.name.includes('ด้านฝ่ามือ') ? 'หงายแขนให้ด้านฝ่ามือหันเข้ากล้อง'
    : node.name.includes('ด้านหลังมือ') ? 'คว่ำแขนให้ด้านหลังมือหันเข้ากล้อง' : '';
  return `${framing}${surface ? ` · ${surface}` : ''}`;
}

export function anatomicalTarget(node, pose = [], mirror = true, { strict = false, aspectRatio = 1 } = {}) {
  const profile = targetProfile(node);
  const required = [...new Set([...profile.weights.map(([i]) => i), ...profile.axis])];
  const visible = p => p && Number.isFinite(p.x) && Number.isFinite(p.y)
    && (!strict || (p.visibility ?? 0) >= .55 && (p.presence ?? 1) >= .5
      && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  if (required.some(i => !visible(pose[i]))) return null;
  const point = profile.weights.reduce((p, [i, weight]) => ({
    x: p.x + pose[i].x * weight, y: p.y + pose[i].y * weight,
    z: p.z + (pose[i].z ?? 0) * weight,
  }), { x: 0, y: 0, z: 0 });
  const a = pose[profile.axis[0]], b = pose[profile.axis[1]];
  const axis = { x: b.x - a.x, y: (b.y - a.y) / aspectRatio };
  const length = Math.hypot(axis.x, axis.y);
  if (length < .008) return null;
  if (profile.lateral) {
    point.x += axis.x * profile.lateral;
    point.y += axis.y * aspectRatio * profile.lateral;
  }
  if (profile.outward && profile.reference.every(i => visible(pose[i]))) {
    const [same, opposite] = profile.reference.map(i => pose[i]);
    const normal = { x: -axis.y / length, y: axis.x / length };
    const dot = normal.x * (same.x - opposite.x) + normal.y * (same.y - opposite.y) / aspectRatio;
    // In a side view the hips can overlap: keep the visible limb centerline rather
    // than inventing an outward direction. The user can adjust to its visible surface.
    const shift = Math.abs(dot) < .005 ? 0 : Math.sign(dot) * profile.outward * length;
    point.x += normal.x * shift;
    point.y += normal.y * shift * aspectRatio;
  }
  if (strict && (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) return null;
  return { ...point, x: mirror ? 1 - point.x : point.x,
    basis: { x: mirror ? -axis.x : axis.x, y: axis.y * aspectRatio } };
}

// Three successive detections establish a target. Invalid frames clear it immediately.
export function updateTargetTrack(previous, point, time) {
  if (!point) return null;
  if (!previous || time - previous.time > 600
    || Math.hypot(point.x - previous.point.x, point.y - previous.point.y) > .12)
    return { point, frames: 1, time, ready: false };
  const blend = 1 - Math.exp(-(time - previous.time) / 45);
  return { point: { ...point, x: previous.point.x + (point.x - previous.point.x) * blend,
    y: previous.point.y + (point.y - previous.point.y) * blend },
    frames: previous.frames + 1, time, ready: previous.frames >= 2 };
}

// Adjust in the local body axis so a correction moves/rotates with that body part.
export function adjustTarget(point, adjustment, ratio) {
  if (!point || !adjustment) return point;
  const x = point.basis.x, y = point.basis.y / ratio;
  return { ...point, x: point.x + x * adjustment.along - y * adjustment.cross,
    y: point.y + (y * adjustment.along + x * adjustment.cross) * ratio };
}
export function targetAdjustment(point, selected, ratio) {
  const x = point.basis.x, y = point.basis.y / ratio;
  const dx = selected.x - point.x, dy = (selected.y - point.y) / ratio;
  const lengthSquared = x * x + y * y;
  return { along: (dx * x + dy * y) / lengthSquared, cross: (-dx * y + dy * x) / lengthSquared };
}
