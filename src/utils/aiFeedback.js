// AI Analysis & Feedback Engine for Thai Massage AR Training

/**
 * Compute session scores based on real tracking telemetry
 * - Continuity (40%): evaluated from slip-outs
 * - Directional Accuracy (40%): evaluated from vector matching
 * - Time Efficiency (20%): evaluated from steady pace and cadence
 */
export function calculateSessionScores({ slipCount, directionErrors, totalTargetCount, elapsedSeconds, requiredSeconds }) {
  // 1. Continuity Score (Max 40)
  // 0 slips = 40 pts, each slip loses ~4 pts (min 10 pts)
  const continuityScore = Math.max(12, Math.round(40 - Math.min(28, slipCount * 4.5)));

  // 2. Directional Accuracy (Max 40)
  // 0 direction errors = 40 pts, each direction mismatch loses ~5 pts (min 10 pts)
  const directionScore = Math.max(12, Math.round(40 - Math.min(28, directionErrors * 5.5)));

  // 3. Time Efficiency (Max 20)
  // Compares total elapsed time vs required time
  const timeRatio = elapsedSeconds / Math.max(1, requiredSeconds);
  let timeScore = 18;
  if (timeRatio >= 0.9 && timeRatio <= 1.4) {
    timeScore = 20;
  } else if (timeRatio <= 1.8) {
    timeScore = 16;
  } else {
    timeScore = 13;
  }

  const totalScore = Math.min(100, continuityScore + directionScore + timeScore);

  return {
    continuityScore,
    directionScore,
    timeEfficiencyScore: timeScore,
    totalScore
  };
}

/**
 * Generate intelligent clinical AI feedback text in Thai
 */
export async function generateAIFeedback({
  scores,
  categoryName,
  slipCount,
  directionErrors,
  nodeResults = [],
  apiKey = ''
}) {
  const { totalScore, continuityScore, directionScore, timeEfficiencyScore } = scores;

  // If user provided a Gemini API Key, try calling Gemini API directly
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `คุณคือผู้เชี่ยวชาญการประเมินทักษะการนวดแผนไทย (Thai Massage Expert Evaluator) และระบบ AI อัจฉริยะ
กรุณาวิเคราะห์ผลการฝึกปฏิบัติจริงของนักศึกษาในหมวด "${categoryName}" ต่อไปนี้:
- คะแนนรวม: ${totalScore}/100
- ความต่อเนื่อง (Continuity): ${continuityScore}/40 (มือหลุดจากเป้าหมาย ${slipCount} ครั้ง)
- ความถูกต้องของทิศทาง (Directional Accuracy): ${directionScore}/40 (ผิดทิศทาง ${directionErrors} ครั้ง)
- ความคงที่ของเวลา (Time Efficiency): ${timeEfficiencyScore}/20
- รายละเอียดจุดที่ฝึก: ${nodeResults.map(n => `${n.nameTh} (${n.technique}: หลุด ${n.slips || 0} ครั้ง)`).join(', ')}

กรุณาเขียนสรุปผลและคำแนะนำในภาษาไทยที่สุภาพ เป็นทางการ และให้กำลังใจ โดยเน้น:
1. สิ่งที่ทำได้ดีมาก (ระบุจุดนวดชัดเจน)
2. จุดที่ต้องระวังหรือปรับปรุง (เช่น ทิศทางการหมุน, การรักษามือให้นิ่ง)
3. คำแนะนำเชิงปฏิบัติสำหรับศาสตร์นวดไทย (ความยาว 2-4 ประโยค)`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn('Gemini API call failed, falling back to local clinical engine:', e);
    }
  }

  // High-fidelity Local Clinical Feedback Engine (Thai Natural Language Generation)
  let praise = '';
  let improvement = '';
  let clinicalTip = '';

  // Praise logic
  if (totalScore >= 85) {
    praise = `คุณทำได้ยอดเยี่ยมมากในหมวด${categoryName}! การควบคุมสโตรกและการวางตำแหน่งฝ่ามือมีความแม่นยำสูงสอดคล้องกับแนวเส้นประธานสิบ`;
  } else if (totalScore >= 70) {
    praise = `คุณทำได้ดีในจุดหลักของ${categoryName} มีความเข้าใจในตำแหน่งกายวิภาคและจังหวะการลงน้ำหนักที่เหมาะสม`;
  } else {
    praise = `คุณมีความตั้งใจและพยายามรักษาตำแหน่งได้ดีในจุดเริ่มต้นของ${categoryName}`;
  }

  // Improvement based on telemetry
  if (directionErrors > 0 && slipCount > 2) {
    improvement = `แต่ยังมีข้อผิดพลาดเรื่องทิศทางการขยับมือ (เช่น จังหวะหมุนคลึงวนขมับหรือบ่ามีการหมุนผิดด้าน) และมีจังหวะที่มือหลุดออกจากจุดเป้าหมาย ${slipCount} ครั้ง`;
  } else if (directionErrors > 0) {
    improvement = `แต่ในช่วงนวดคลึงวนมีการขยับมือกลับทิศทางที่กำหนด แนะนำให้สังเกตลูกศรชี้นำและหมุนวนตามเข็มนาฬิกาอย่างนุ่มนวล`;
  } else if (slipCount > 2) {
    improvement = `อย่างไรก็ตาม เซนเซอร์ตรวจพบการหลุดของมือนอกระยะ Hitbox ${slipCount} ครั้ง ทำให้เวลาหยุดนับชั่วคราว`;
  } else {
    improvement = `การเคลื่อนไหวมือราบรื่นและควบคุมทิศทางเวกเตอร์ได้เกือบสมบูรณ์แบบ`;
  }

  // Clinical tip based on technique
  if (slipCount > 2) {
    clinicalTip = `คำแนะนำ: พยายามรักษาระดับมือให้คงที่เพื่อลดการหลุดของเซนเซอร์ระหว่างการกดจุด และใช้การทิ้งน้ำหนักจากลำตัวแทนการเกร็งข้อมือ`;
  } else if (directionErrors > 0) {
    clinicalTip = `คำแนะนำ: ในท่านวดคลึงวน ให้ใช้โคนฝ่ามือหรือนิ้วหัวแม่มือหมุนวนเป็นเกลียวสม่ำเสมอ เพื่อให้แรงกดซึมลึกถึงชั้นพังผืดกล้ามเนื้อ`;
  } else {
    clinicalTip = `คำแนะนำ: รักษาจังหวะการหายใจเข้า-ออกให้ประสานกับจังหวะกด-ปล่อย จะช่วยเพิ่มประสิทธิผลในการคลายเส้นของผู้นวด`;
  }

  return `${praise} ${improvement} ${clinicalTip}`;
}

/**
 * Generate Overall AI Insights for Instructor (Admin Dashboard)
 */
export function generateInstructorStudentInsights(user, sessions = []) {
  if (!sessions || sessions.length === 0) {
    return `นักศึกษา "${user.name}" ยังไม่มีประวัติการฝึกซ้อมในระบบ แนะนำให้มอบหมายให้เริ่มจากหมวดร่างกายท่อนบนเพื่อทดสอบการจับจุดเบื้องต้น`;
  }

  const avgScore = Math.round(sessions.reduce((acc, s) => acc + s.totalScore, 0) / sessions.length);
  const totalSlips = sessions.reduce((acc, s) => acc + (s.slipCount || 0), 0);
  const totalDirErrors = sessions.reduce((acc, s) => acc + (s.directionErrors || 0), 0);
  const recentSessions = sessions.slice(0, 3);
  const recentAvg = Math.round(recentSessions.reduce((acc, s) => acc + s.totalScore, 0) / recentSessions.length);

  let strengths = '';
  let weaknesses = '';

  if (avgScore >= 80) {
    strengths = 'มีจุดแข็งเรื่องการนวดรีดเส้นตามแนวกล้ามเนื้อและการลงน้ำหนักกดจุดที่คงที่ สัมผัสต่อเนื่องดี';
  } else {
    strengths = 'มีความเข้าใจในตำแหน่งจุดกายวิภาคหลัก สามารถเริ่มทำความคุ้นเคยกับเส้นประธานได้';
  }

  if (totalDirErrors > 2 || totalSlips > 4) {
    weaknesses = `แต่ต้องปรับปรุงเรื่องความต่อเนื่องในการนวดคลึงวนเป็นวงกลม เพราะมือหลุดบ่อย (${totalSlips} ครั้ง) และหมุนผิดทิศทางใน ${recentSessions.length} รอบล่าสุด`;
  } else {
    weaknesses = 'การควบคุมทิศทางทำได้น่าพอใจ ควรเน้นฝึกความเร็วและความลื่นไหลในการเปลี่ยนสโตรกจุดต่อไป';
  }

  return `นักศึกษาคนนี้ได้คะแนนเฉลี่ย ${avgScore}% (แนวโน้มรอบล่าสุด: ${recentAvg}%) ${strengths} ${weaknesses}`;
}
