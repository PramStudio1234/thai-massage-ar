import { forwardRef } from 'react';
import { feedbackFor } from '../lib/domain';
import LoadingIndicator from './LoadingIndicator';
import './SessionReport.css';

const percentage = value => Number.isFinite(Number(value)) && value != null ? `${Math.round(Number(value))}%` : 'ไม่ระบุ';
export const normalizeReport = session => ({
  ...session,
  score: session.totalScore ?? session.score,
  accuracy: session.accuracy ?? session.directionScore,
  part: session.part || session.categoryNameTh || 'ไม่ระบุบริเวณ',
});

const SessionReport = forwardRef(function SessionReport({ session, studentName, feedback, generating = false }, ref) {
  const data = normalizeReport(session);
  const hasMetrics = [data.continuity, data.accuracy, data.efficiency].every(value => value != null && Number.isFinite(Number(value)));
  const advice = feedback || data.feedback || (hasMetrics ? feedbackFor(data) : 'ยังไม่มีคำแนะนำที่บันทึกไว้สำหรับการฝึกครั้งนี้');
  return (
    <article ref={ref} className="session-paper" aria-label="กระดาษสรุปผลการฝึก">
      <header className="report-section session-paper__header">
        <p className="session-paper__eyebrow">KLAY KLAAI · TRAINING REPORT</p>
        <h2>สรุปผลการฝึกและคำแนะนำ</h2>
        <p>การนวดบริเวณ{data.part}</p>
      </header>
      <dl className="report-section session-paper__details">
        <div><dt>ผู้ฝึก</dt><dd>{studentName || data.userName || 'ผู้เรียน'}</dd></div>
        <div><dt>วันที่ฝึก</dt><dd>{data.completedAt || data.created || 'ไม่ระบุ'}</dd></div>
        <div><dt>โหมดฝึก</dt><dd>{data.mode === 'camera' ? 'กล้องจริง' : data.mode === 'demo' ? 'โหมดสาธิต' : 'ไม่ระบุ'}</dd></div>
        <div><dt>เวลา / จุดเป้าหมาย</dt><dd>{data.duration != null ? `${Math.round(data.duration)} วินาที` : 'ไม่ระบุเวลา'} · {data.nodes != null ? `${data.nodes} จุด` : 'ไม่ระบุจำนวนจุด'}</dd></div>
      </dl>
      <section className="report-section session-paper__score">
        <span>คะแนนรวม</span><strong>{data.score ?? '—'}<small> / 100</small></strong>
      </section>
      <section className="report-section session-paper__metrics" aria-label="คะแนนแต่ละด้าน">
        <h3>ผลประเมินแต่ละด้าน</h3>
        {[
          ['ความต่อเนื่องของแรงและจังหวะ', data.continuity, '40%'],
          ['ความถูกต้องของทิศทาง', data.accuracy, '40%'],
          ['เวลาตามเกณฑ์', data.efficiency, '20%'],
        ].map(([label, value, weight]) => <div key={label}><span>{label}<small>น้ำหนัก {weight}</small></span><b>{percentage(value)}</b></div>)}
      </section>
      <section className="report-section session-paper__feedback" aria-busy={generating}>
        <h3>ฟีดแบ็กและคำแนะนำจากระบบ AI</h3>
        {generating ? <div className="session-paper__loading"><LoadingIndicator /><span>กำลังประมวลผลคำแนะนำ...</span></div> : advice.split(/\n+/).filter(Boolean).map((paragraph, index) => <p className="report-section" key={index}>{paragraph}</p>)}
        <small>{data.trackingMode === 'direction-only' ? 'การตรวจจับขาดช่วง' : 'มือออกจากจุดเป้าหมาย'}: {data.exits ?? 'ไม่ระบุ'}{data.exits != null ? ' ครั้ง' : ''}</small>
      </section>
      <footer className="report-section session-paper__footer">Klay Klaai - Thai Massage & Wellness AR Training Platform</footer>
    </article>
  );
});
export default SessionReport;
