import { useState } from 'react';
import { CheckCircle2, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import { feedbackFor } from '../../lib/domain';
import LoadingIndicator from '../LoadingIndicator';
import SessionReport from '../SessionReport';

export default function PostSessionModal({ sessionData, onClose, onRetry }) {
  const { saveSession, settings, currentUser } = usePlatform();
  const result = sessionData?.result || sessionData?.scores || { score: 0, continuity: 0, accuracy: 0, efficiency: 0, duration: 0, exits: 0, nodes: 0, part: sessionData?.category?.part || 'บทเรียน' };
  const [feedbackText, setFeedbackText] = useState(result.feedback || feedbackFor(result));
  const [completedAt] = useState(() => new Date().toISOString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const report = { ...result, totalScore: result.totalScore ?? result.score, userName: currentUser?.name, completedAt };

  const handleRegenerateFeedback = async () => {
    sound.playClick();
    setIsGenerating(true);
    try {
      if (settings?.geminiApiKey) {
        const prompt = `วิเคราะห์ผลการฝึกนวดแผนไทยบริเวณ "${result.part}" คะแนนรวม ${result.score}% ความต่อเนื่อง ${result.continuity}% ทิศทาง ${result.accuracy}% ${result.trackingMode === 'direction-only' ? 'การตรวจจับขาดช่วง' : 'มือหลุด'} ${result.exits || 0} ครั้ง ${result.trackingMode === 'direction-only' ? 'ระบบตรวจเฉพาะทิศทางการเคลื่อนไหวมือ ไม่ได้ตรวจว่ามืออยู่ในรัศมีจุดนวด ' : ''}ให้คำแนะนำทางการแพทย์แผนไทยที่กระชับ สุภาพ และปฏิบัติได้จริง`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.geminiApiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) { setFeedbackText(text.trim()); return; }
        }
      }
      setFeedbackText(feedbackFor(result));
    } catch { setFeedbackText(feedbackFor(result)); }
    finally { setIsGenerating(false); }
  };

  const handleSave = () => {
    if (saved || isGenerating) return;
    setSaved(true);
    sound.playClick();
    saveSession({ 
      ...report, 
      id: sessionData?.savedSessionId || report.id, 
      directionScore: result.accuracy, 
      categoryNameTh: result.part, 
      feedback: feedbackText,
      aiFeedback: feedbackText 
    });
    onClose();
  };

  return <div className="report-dialog-backdrop animate-fade-in" role="dialog" aria-modal="true" aria-label="สรุปผลหลังฝึกเสร็จ">
    <div className="report-dialog">
      <div className="report-toolbar">
        <button type="button" className="jelly-button jelly-button-secondary" onClick={handleRegenerateFeedback} disabled={isGenerating || saved}>
          {isGenerating ? <LoadingIndicator label="กำลังประมวลผลคำแนะนำด้วย AI" /> : <RefreshCw size={16} />}<span>วิเคราะห์ฟีดแบ็กซ้ำ</span>
        </button>
      </div>

      {/* Prominent High-Visibility AI Feedback Highlight Card */}
      <div className="mb-2.5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-500/30 shadow-md backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-sky-800">
            <Sparkles size={15} className="text-emerald-600 animate-pulse" />
            <span>คำแนะนำและฟีดแบ็กจาก AI:</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-100 text-sky-800 border border-emerald-300">
            คะแนนรวม {result.score ?? result.totalScore ?? '100'}%
          </span>
        </div>
        <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
          {feedbackText}
        </p>
      </div>

      <SessionReport session={report} feedback={feedbackText} generating={isGenerating} />
      <div className="report-actions">
        <button type="button" className="jelly-button jelly-button-secondary" onClick={() => { sound.playClick(); onRetry(); }} disabled={isGenerating || saved}><RotateCcw size={14} /><span>ฝึกซ้ำ</span></button>
        <button type="button" className="jelly-button" onClick={handleSave} disabled={isGenerating || saved}><CheckCircle2 size={14} /><span>บันทึกผล และกลับหน้าหลัก</span></button>
      </div>
    </div>
  </div>;
}
