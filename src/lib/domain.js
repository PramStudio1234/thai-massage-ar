// SENSA Thai Wellness Lab - Domain models and Anatomical Nodes

export const regionInfo = {
  upper: {
    id: 'upper',
    name: 'ร่างกายท่อนบน',
    english: 'UPPER BODY',
    parts: ['คอด้านหลัง', 'บ่า 2 ข้าง', 'ขมับ 2 ข้าง', 'ฐานกะโหลก'],
    description: '4 จุดโฟกัส: คอด้านหลัง, บ่า 2 ข้าง, ขมับ 2 ข้าง และฐานกะโหลก เพื่อคลายความตึงและบรรเทาอาการออฟฟิศซินโดรม'
  },
  middle: {
    id: 'middle',
    name: 'ร่างกายท่อนกลาง',
    english: 'MIDDLE BODY',
    parts: ['ต้นแขนด้านหน้า', 'ต้นแขนด้านหลัง', 'แขนท่อนล่างด้านฝ่ามือ', 'แขนท่อนล่างด้านหลังมือ'],
    description: '4 จุดโฟกัส: ต้นแขนด้านหน้า, ต้นแขนด้านหลัง, แขนท่อนล่างด้านฝ่ามือ และแขนท่อนล่างด้านหลังมือ รีดตามแนวยาวกล้ามเนื้อ'
  },
  lower: {
    id: 'lower',
    name: 'ร่างกายท่อนล่าง',
    english: 'LOWER BODY',
    parts: ['ต้นขาด้านหน้า', 'ต้นขาด้านหลัง', 'ต้นขาด้านข้าง', 'เข่า', 'น่อง', 'หน้าแข้ง', 'ฝ่าเท้า'],
    description: '7 จุดโฟกัส: ต้นขาด้านหน้า, ต้นขาด้านหลัง, ต้นขาด้านข้าง, เข่า, น่อง, หน้าแข้ง และฝ่าเท้า เพิ่มระบบหมุนเวียนและคลายเส้น'
  }
};

export const motionInfo = {
  circular: {
    name: 'นวดคลึงวน (ตามเข็มนาฬิกา)',
    english: 'Circular (Clockwise)',
    instruction: 'คลึงเบา ๆ ตามเข็มนาฬิกาตามลูกศรอย่างสม่ำเสมอ ไม่ต้องหมุนตามขนาดวงแนะนำ'
  },
  vertical: {
    name: 'ลูบตามแนวยาว',
    english: 'Longitudinal Stroke',
    instruction: 'ลูบตามแนวยาวของกล้ามเนื้ออย่างนุ่มนวลและสม่ำเสมอ'
  },
  pulse: {
    name: 'นวดกดจุด',
    english: 'Pulsing',
    instruction: 'เคลื่อนมือเข้าจุด ค้างสั้น ๆ แล้วผ่อนออกเป็นจังหวะ'
  }
};

// Node Config Factory with MediaPipe Pose Landmarks interpolation
// a, b: Landmark indices (0-32), t: interpolation ratio (0-1), ox, oy: pixel/unit offsets
const makeNode = ({
  region,
  name,
  english,
  muscle,
  techniqueGuide,
  motion,
  a,
  b,
  t,
  i,
  ox = 0,
  oy = 0,
  seconds = 15,
  radius = 0.048
}) => ({
  id: `${region}-${name}-${i}`,
  region,
  name,
  english,
  muscle,
  techniqueGuide,
  motion,
  seconds,
  radius,
  a,
  b,
  t,
  ox,
  oy
});

export const defaultNodes = [
  // ===================== ร่างกายท่อนบน (4 จุดโฟกัส) =====================
  // 1. คอด้านหลัง: กล้ามเนื้อสองข้างของแนวกระดูกคอ (คลึงเบา ๆ เป็นวงเล็ก ไม่กดกระดูกคอ)
  makeNode({
    region: 'upper',
    name: 'คอด้านหลัง',
    english: 'Posterior Neck L',
    muscle: 'กล้ามเนื้อสองข้างของแนวกระดูกคอ',
    techniqueGuide: 'คลึงเบา ๆ เป็นวงเล็ก ไม่กดกระดูกคอ',
    motion: 'circular',
    a: 11,
    b: 0,
    t: 0.42,
    i: 1,
    ox: -0.018,
    oy: 0.02,
    seconds: 15
  }),
  makeNode({
    region: 'upper',
    name: 'คอด้านหลัง',
    english: 'Posterior Neck R',
    muscle: 'กล้ามเนื้อสองข้างของแนวกระดูกคอ',
    techniqueGuide: 'คลึงเบา ๆ เป็นวงเล็ก ไม่กดกระดูกคอ',
    motion: 'circular',
    a: 12,
    b: 0,
    t: 0.42,
    i: 2,
    ox: 0.018,
    oy: 0.02,
    seconds: 15
  }),

  // 2. บ่า 2 ข้าง: กล้ามเนื้อบ่าช่วงกลางระหว่างคอกับไหล่ (กดเบา ๆ แล้วปล่อยเป็นจังหวะ หรือคลึงวงเล็ก)
  makeNode({
    region: 'upper',
    name: 'บ่า 2 ข้าง',
    english: 'Trapezius L',
    muscle: 'กล้ามเนื้อบ่าช่วงกลางระหว่างคอกับไหล่',
    techniqueGuide: 'กดเบา ๆ แล้วปล่อยเป็นจังหวะ หรือคลึงวงเล็ก',
    motion: 'circular',
    a: 11,
    b: 12,
    t: 0.22,
    i: 1,
    ox: 0,
    oy: -0.01,
    seconds: 15
  }),
  makeNode({
    region: 'upper',
    name: 'บ่า 2 ข้าง',
    english: 'Trapezius R',
    muscle: 'กล้ามเนื้อบ่าช่วงกลางระหว่างคอกับไหล่',
    techniqueGuide: 'กดเบา ๆ แล้วปล่อยเป็นจังหวะ หรือคลึงวงเล็ก',
    motion: 'circular',
    a: 12,
    b: 11,
    t: 0.22,
    i: 2,
    ox: 0,
    oy: -0.01,
    seconds: 15
  }),

  // 3. ขมับ 2 ข้าง: กล้ามเนื้อขมับด้านข้างศีรษะ (ใช้ปลายนิ้วคลึงวงเล็กอย่างเบามือ)
  makeNode({
    region: 'upper',
    name: 'ขมับ 2 ข้าง',
    english: 'Temples L',
    muscle: 'กล้ามเนื้อขมับด้านข้างศีรษะ',
    techniqueGuide: 'ใช้ปลายนิ้วคลึงวงเล็กอย่างเบามือ',
    motion: 'circular',
    a: 7,
    b: 7,
    t: 0,
    i: 1,
    ox: -0.022,
    oy: -0.025,
    seconds: 12
  }),
  makeNode({
    region: 'upper',
    name: 'ขมับ 2 ข้าง',
    english: 'Temples R',
    muscle: 'กล้ามเนื้อขมับด้านข้างศีรษะ',
    techniqueGuide: 'ใช้ปลายนิ้วคลึงวงเล็กอย่างเบามือ',
    motion: 'circular',
    a: 8,
    b: 8,
    t: 0,
    i: 2,
    ox: 0.022,
    oy: -0.025,
    seconds: 12
  }),

  // 4. ฐานกะโหลก: กล้ามเนื้อใต้ท้ายทอย (สัมผัสหรือคลึงเบา ๆ หลีกเลี่ยงแรงกดลึก)
  makeNode({
    region: 'upper',
    name: 'ฐานกะโหลก',
    english: 'Suboccipital Base L',
    muscle: 'กล้ามเนื้อใต้ท้ายทอย',
    techniqueGuide: 'สัมผัสหรือคลึงเบา ๆ หลีกเลี่ยงแรงกดลึก',
    motion: 'circular',
    a: 11,
    b: 0,
    t: 0.32,
    i: 1,
    ox: -0.02,
    oy: 0.035,
    seconds: 12
  }),
  makeNode({
    region: 'upper',
    name: 'ฐานกะโหลก',
    english: 'Suboccipital Base R',
    muscle: 'กล้ามเนื้อใต้ท้ายทอย',
    techniqueGuide: 'สัมผัสหรือคลึงเบา ๆ หลีกเลี่ยงแรงกดลึก',
    motion: 'circular',
    a: 12,
    b: 0,
    t: 0.32,
    i: 2,
    ox: 0.02,
    oy: 0.035,
    seconds: 12
  }),

  // ===================== ร่างกายท่อนกลาง (4 จุดโฟกัส) =====================
  // 1. ต้นแขนด้านหน้า: กล้ามเนื้อ Biceps (ลูบตามแนวยาวจากข้อศอกไปทางหัวไหล่)
  makeNode({
    region: 'middle',
    name: 'ต้นแขนด้านหน้า',
    english: 'Anterior Biceps L',
    muscle: 'กล้ามเนื้อ Biceps',
    techniqueGuide: 'ลูบตามแนวยาวจากข้อศอกไปทางหัวไหล่',
    motion: 'vertical',
    a: 11,
    b: 13,
    t: 0.45,
    i: 1,
    ox: 0,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'middle',
    name: 'ต้นแขนด้านหน้า',
    english: 'Anterior Biceps R',
    muscle: 'กล้ามเนื้อ Biceps',
    techniqueGuide: 'ลูบตามแนวยาวจากข้อศอกไปทางหัวไหล่',
    motion: 'vertical',
    a: 12,
    b: 14,
    t: 0.45,
    i: 2,
    ox: 0,
    oy: 0,
    seconds: 15
  }),

  // 2. ต้นแขนด้านหลัง: กล้ามเนื้อ Triceps (ลูบตามแนวยาวจากข้อศอกไปทางหัวไหล่)
  makeNode({
    region: 'middle',
    name: 'ต้นแขนด้านหลัง',
    english: 'Posterior Triceps L',
    muscle: 'กล้ามเนื้อ Triceps',
    techniqueGuide: 'ลูบตามแนวยาวจากข้อศอกไปทางหัวไหล่',
    motion: 'vertical',
    a: 11,
    b: 13,
    t: 0.55,
    i: 1,
    ox: -0.025,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'middle',
    name: 'ต้นแขนด้านหลัง',
    english: 'Posterior Triceps R',
    muscle: 'กล้ามเนื้อ Triceps',
    techniqueGuide: 'ลูบตามแนวยาวจากข้อศอกไปทางหัวไหล่',
    motion: 'vertical',
    a: 12,
    b: 14,
    t: 0.55,
    i: 2,
    ox: 0.025,
    oy: 0,
    seconds: 15
  }),

  // 3. แขนท่อนล่างด้านฝ่ามือ: กลุ่มกล้ามเนื้องอข้อมือ (ลูบจากใกล้ข้อมือไปทางข้อศอก)
  makeNode({
    region: 'middle',
    name: 'แขนท่อนล่างด้านฝ่ามือ',
    english: 'Palmar Forearm Flexors L',
    muscle: 'กลุ่มกล้ามเนื้องอข้อมือ',
    techniqueGuide: 'ลูบจากใกล้ข้อมือไปทางข้อศอก',
    motion: 'vertical',
    a: 13,
    b: 15,
    t: 0.45,
    i: 1,
    ox: 0,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'middle',
    name: 'แขนท่อนล่างด้านฝ่ามือ',
    english: 'Palmar Forearm Flexors R',
    muscle: 'กลุ่มกล้ามเนื้องอข้อมือ',
    techniqueGuide: 'ลูบจากใกล้ข้อมือไปทางข้อศอก',
    motion: 'vertical',
    a: 14,
    b: 16,
    t: 0.45,
    i: 2,
    ox: 0,
    oy: 0,
    seconds: 15
  }),

  // 4. แขนท่อนล่างด้านหลังมือ: กลุ่มกล้ามเนื้อเหยียดข้อมือ (ลูบจากใกล้ข้อมือไปทางข้อศอก)
  makeNode({
    region: 'middle',
    name: 'แขนท่อนล่างด้านหลังมือ',
    english: 'Dorsal Forearm Extensors L',
    muscle: 'กลุ่มกล้ามเนื้อเหยียดข้อมือ',
    techniqueGuide: 'ลูบจากใกล้ข้อมือไปทางข้อศอก',
    motion: 'vertical',
    a: 13,
    b: 15,
    t: 0.55,
    i: 1,
    ox: -0.02,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'middle',
    name: 'แขนท่อนล่างด้านหลังมือ',
    english: 'Dorsal Forearm Extensors R',
    muscle: 'กลุ่มกล้ามเนื้อเหยียดข้อมือ',
    techniqueGuide: 'ลูบจากใกล้ข้อมือไปทางข้อศอก',
    motion: 'vertical',
    a: 14,
    b: 16,
    t: 0.55,
    i: 2,
    ox: 0.02,
    oy: 0,
    seconds: 15
  }),

  // ===================== ร่างกายท่อนล่าง (7 จุดโฟกัส) =====================
  // 1. ต้นขาด้านหน้า: กล้ามเนื้อ Quadriceps (ลูบจากเหนือเข่าไปทางสะโพก)
  makeNode({
    region: 'lower',
    name: 'ต้นขาด้านหน้า',
    english: 'Quadriceps Thigh L',
    muscle: 'กล้ามเนื้อ Quadriceps',
    techniqueGuide: 'ลูบจากเหนือเข่าไปทางสะโพก',
    motion: 'vertical',
    a: 23,
    b: 25,
    t: 0.45,
    i: 1,
    ox: 0,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'ต้นขาด้านหน้า',
    english: 'Quadriceps Thigh R',
    muscle: 'กล้ามเนื้อ Quadriceps',
    techniqueGuide: 'ลูบจากเหนือเข่าไปทางสะโพก',
    motion: 'vertical',
    a: 24,
    b: 26,
    t: 0.45,
    i: 2,
    ox: 0,
    oy: 0,
    seconds: 15
  }),

  // 2. ต้นขาด้านหลัง: กล้ามเนื้อ Hamstrings (ลูบจากเหนือข้อพับเข่าไปทางสะโพก)
  makeNode({
    region: 'lower',
    name: 'ต้นขาด้านหลัง',
    english: 'Hamstrings Thigh L',
    muscle: 'กล้ามเนื้อ Hamstrings',
    techniqueGuide: 'ลูบจากเหนือข้อพับเข่าไปทางสะโพก',
    motion: 'vertical',
    a: 23,
    b: 25,
    t: 0.55,
    i: 1,
    ox: -0.02,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'ต้นขาด้านหลัง',
    english: 'Hamstrings Thigh R',
    muscle: 'กล้ามเนื้อ Hamstrings',
    techniqueGuide: 'ลูบจากเหนือข้อพับเข่าไปทางสะโพก',
    motion: 'vertical',
    a: 24,
    b: 26,
    t: 0.55,
    i: 2,
    ox: 0.02,
    oy: 0,
    seconds: 15
  }),

  // 3. ต้นขาด้านข้าง: กล้ามเนื้อด้านข้างสะโพกและต้นขา (ลูบเบา ๆ ตามแนวกล้ามเนื้อ ไม่กดลึก)
  makeNode({
    region: 'lower',
    name: 'ต้นขาด้านข้าง',
    english: 'Lateral Thigh L',
    muscle: 'กล้ามเนื้อด้านข้างสะโพกและต้นขา',
    techniqueGuide: 'ลูบเบา ๆ ตามแนวกล้ามเนื้อ ไม่กดลึก',
    motion: 'vertical',
    a: 23,
    b: 25,
    t: 0.5,
    i: 1,
    ox: -0.035,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'ต้นขาด้านข้าง',
    english: 'Lateral Thigh R',
    muscle: 'กล้ามเนื้อด้านข้างสะโพกและต้นขา',
    techniqueGuide: 'ลูบเบา ๆ ตามแนวกล้ามเนื้อ ไม่กดลึก',
    motion: 'vertical',
    a: 24,
    b: 26,
    t: 0.5,
    i: 2,
    ox: 0.035,
    oy: 0,
    seconds: 15
  }),

  // 4. เข่า: กล้ามเนื้อรอบข้อเข่า (ลูบเบารอบข้อ หลีกเลี่ยงการกดบนลูกสะบ้า)
  makeNode({
    region: 'lower',
    name: 'เข่า',
    english: 'Peripatellar Knee L',
    muscle: 'กล้ามเนื้อรอบข้อเข่า',
    techniqueGuide: 'ลูบเบารอบข้อ หลีกเลี่ยงการกดบนลูกสะบ้า',
    motion: 'circular',
    a: 25,
    b: 25,
    t: 0,
    i: 1,
    ox: 0,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'เข่า',
    english: 'Peripatellar Knee R',
    muscle: 'กล้ามเนื้อรอบข้อเข่า',
    techniqueGuide: 'ลูบเบารอบข้อ หลีกเลี่ยงการกดบนลูกสะบ้า',
    motion: 'circular',
    a: 26,
    b: 26,
    t: 0,
    i: 2,
    ox: 0,
    oy: 0,
    seconds: 15
  }),

  // 5. น่อง: กล้ามเนื้อ Gastrocnemius และ Soleus (ลูบเบาตามแนวกล้ามเนื้อจากเหนือข้อเท้าไปทางเข่า เฉพาะเมื่อไม่มีอาการผิดปกติ)
  makeNode({
    region: 'lower',
    name: 'น่อง',
    english: 'Calf Muscle L',
    muscle: 'กล้ามเนื้อ Gastrocnemius และ Soleus',
    techniqueGuide: 'ลูบเบาตามแนวกล้ามเนื้อจากเหนือข้อเท้าไปทางเข่า เฉพาะเมื่อไม่มีอาการผิดปกติ',
    motion: 'vertical',
    a: 25,
    b: 27,
    t: 0.45,
    i: 1,
    ox: 0,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'น่อง',
    english: 'Calf Muscle R',
    muscle: 'กล้ามเนื้อ Gastrocnemius และ Soleus',
    techniqueGuide: 'ลูบเบาตามแนวกล้ามเนื้อจากเหนือข้อเท้าไปทางเข่า เฉพาะเมื่อไม่มีอาการผิดปกติ',
    motion: 'vertical',
    a: 26,
    b: 28,
    t: 0.45,
    i: 2,
    ox: 0,
    oy: 0,
    seconds: 15
  }),

  // 6. หน้าแข้ง: กล้ามเนื้อด้านข้างกระดูกหน้าแข้ง (ลูบเบาตามแนวยาว ไม่กดสันกระดูก)
  makeNode({
    region: 'lower',
    name: 'หน้าแข้ง',
    english: 'Shin Muscle L',
    muscle: 'กล้ามเนื้อด้านข้างกระดูกหน้าแข้ง',
    techniqueGuide: 'ลูบเบาตามแนวยาว ไม่กดสันกระดูก',
    motion: 'vertical',
    a: 25,
    b: 27,
    t: 0.5,
    i: 1,
    ox: 0.02,
    oy: 0,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'หน้าแข้ง',
    english: 'Shin Muscle R',
    muscle: 'กล้ามเนื้อด้านข้างกระดูกหน้าแข้ง',
    techniqueGuide: 'ลูบเบาตามแนวยาว ไม่กดสันกระดูก',
    motion: 'vertical',
    a: 26,
    b: 28,
    t: 0.5,
    i: 2,
    ox: -0.02,
    oy: 0,
    seconds: 15
  }),

  // 7. ฝ่าเท้า: กล้ามเนื้อบริเวณอุ้งเท้า (คลึงเบา ๆ ตามบริเวณเนื้อฝ่าเท้า)
  makeNode({
    region: 'lower',
    name: 'ฝ่าเท้า',
    english: 'Plantar Foot Arch L',
    muscle: 'กล้ามเนื้อบริเวณอุ้งเท้า',
    techniqueGuide: 'คลึงเบา ๆ ตามบริเวณเนื้อฝ่าเท้า',
    motion: 'circular',
    a: 27,
    b: 31,
    t: 0.7,
    i: 1,
    ox: 0,
    oy: 0.025,
    seconds: 15
  }),
  makeNode({
    region: 'lower',
    name: 'ฝ่าเท้า',
    english: 'Plantar Foot Arch R',
    muscle: 'กล้ามเนื้อบริเวณอุ้งเท้า',
    techniqueGuide: 'คลึงเบา ๆ ตามบริเวณเนื้อฝ่าเท้า',
    motion: 'circular',
    a: 28,
    b: 32,
    t: 0.7,
    i: 2,
    ox: 0,
    oy: 0.025,
    seconds: 15
  })
];



export const formatDate = (date) => {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Bangkok'
    }).format(new Date(date));
  } catch (e) {
    return date;
  }
};

export const avg = (values) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

export function feedbackFor(r) {
  const weakest = Math.min(r.continuity, r.accuracy, r.efficiency);
  if (weakest >= 85) {
    return `คุณฝึกบริเวณ${r.part}ได้ดีมาก ทั้งทิศทางและความต่อเนื่อง ลองรักษาจังหวะนี้ในการฝึกครั้งต่อไป`;
  }
  if (weakest === r.accuracy) {
    return `บริเวณ${r.part}ยังมีการเคลื่อนไหวผิดทิศทาง ให้ทำตามลูกศรชี้นำและลดความเร็วเพื่อควบคุมทิศทางได้ชัดเจนขึ้น`;
  }
  if (weakest === r.continuity) {
    if (r.trackingMode === 'direction-only') return `การตรวจจับมือขาดช่วง ${r.exits} ครั้ง ลองจัดกล้องให้เห็นมือและบริเวณ${r.part}ชัดเจน แล้วเคลื่อนไหวตามลูกศรอย่างต่อเนื่อง`;
    return `มือออกจากจุดเป้าหมาย ${r.exits} ครั้ง ลองจัดตำแหน่งกล้องให้เห็นร่างกายชัดและรักษามือให้อยู่ในวงระหว่างฝึกบริเวณ${r.part}`;
  }
  return `ทิศทางการฝึกบริเวณ${r.part}ทำได้ดี ลองรักษาความเร็วให้สม่ำเสมอและหลีกเลี่ยงการเคลื่อนมือเร็วเกินไป`;
}
