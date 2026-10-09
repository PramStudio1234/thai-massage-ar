import React, { useState, useRef, useEffect } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import { regionInfo, feedbackFor } from '../../lib/domain';
import SessionReportDialog from '../SessionReportDialog';
import introductionImage from '../../../รูป/แนะนำ.png';
import upperBodyImage from '../../../รูป/ท่อนบน.png';
import middleBodyImage from '../../../รูป/ท่อนกลาง.png';
import lowerBodyImage from '../../../รูป/ท่อนล่าง.png';

const regionImages = { upper: upperBodyImage, middle: middleBodyImage, lower: lowerBodyImage };
import { 
  Sparkles, 
  Play, 
  Activity, 
  Target, 
  Clock3, 
  ShieldCheck, 
  ChevronRight, 
  ScanLine, 
  MousePointer2, 
  Camera, 
  History,
  MoveUpRight,
  CheckCircle2
} from 'lucide-react';

export default function UserDashboard({ onStartSession, onViewHistory }) {
  const { currentUser, targetNodes, sessions, isSupabaseConfigured, refreshOnlineData } = usePlatform();
  const [selectedRegion, setSelectedRegion] = useState('upper');
  const [selectedPart, setSelectedPart] = useState('บ่า 2 ข้าง');
  const [trainingMode, setTrainingMode] = useState('camera'); // 'camera' or 'demo'
  const [selectedReport, setSelectedReport] = useState(null);
  const [setupNavigation, setSetupNavigation] = useState(0);
  const setupRef = useRef(null);
  const setupHeadingRef = useRef(null);

  useEffect(() => {
    if (refreshOnlineData) {
      refreshOnlineData();
    }
  }, []);

  useEffect(() => {
    if (!setupNavigation) return;
    const frame = requestAnimationFrame(() => {
      const panel = setupRef.current;
      if (!panel) return;
      const headerHeight = document.querySelector('.workspace-shell > header')?.getBoundingClientRect().height || 0;
      const bannerHeight = document.querySelector('[data-simulation-banner]')?.getBoundingClientRect().height || 0;
      panel.style.scrollMarginTop = `${headerHeight + bannerHeight + 16}px`;
      setupHeadingRef.current?.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [setupNavigation]);

  // Real user session stats (strictly calculated from actual camera runs)
  const userSessions = sessions.filter(s => 
    (s.userId && s.userId === currentUser?.id) || 
    (s.user_id && s.user_id === currentUser?.id) || 
    (s.userName && s.userName.toLowerCase() === currentUser?.name?.toLowerCase()) || 
    (s.user_name && s.user_name.toLowerCase() === currentUser?.name?.toLowerCase()) ||
    (s.studentName && s.studentName.toLowerCase() === currentUser?.name?.toLowerCase())
  );
  const totalSessions = userSessions.length;
  const avgScore = totalSessions > 0 
    ? Math.round(userSessions.reduce((acc, s) => acc + (s.totalScore || s.score || 0), 0) / totalSessions)
    : 0;
  const totalDurationMin = Math.round(userSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60);
  const latestAccuracy = userSessions.length > 0 
    ? (userSessions[0]?.accuracy || userSessions[0]?.directionScore || 0) 
    : null;

  // Parts available in selected region
  const currentRegionConfig = regionInfo[selectedRegion] || regionInfo.upper;
  const availableParts = currentRegionConfig.parts || [];
  const hasSelectedTargets = targetNodes.some(n => n.region === selectedRegion && n.name === selectedPart);

  const handleStart = () => {
    sound.playClick();
    const regionNodes = targetNodes.filter(n => n.region === selectedRegion);
    const partNodes = regionNodes.filter(n => n.name === selectedPart);
    if (!partNodes.length) return;
    const nodesToUse = partNodes;

    onStartSession({
      region: selectedRegion,
      part: selectedPart,
      mode: trainingMode, // Pass selected mode ('camera' or 'demo')
      nameTh: currentRegionConfig.name,
      nameEn: currentRegionConfig.english,
      nodes: nodesToUse
    });
  };

  return (
    <div className="workspace-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-3.5 sm:space-y-4 animate-fade-in">
      
      {/* 1. Header with Live Thai Date */}
      <div className="workspace-heading flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-sky-700 uppercase mb-0.5 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Klay Klaai Wellness Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            สวัสดี, {currentUser?.name?.split(' ')[0] || 'ผู้เรียน'}
            <span className="text-sky-700 ml-1.5 font-normal">✳</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            ยินดีต้อนรับเข้าสู่ระบบ พร้อมพัฒนาทักษะการนวดแผนไทยด้วยเทคโนโลยี AR และ AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (refreshOnlineData) {
                sound.playClick();
                refreshOnlineData();
              }
            }}
            title="คลิกเพื่อซิงค์ผลการฝึกกับ Supabase ทันที"
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isSupabaseConfigured 
                ? 'bg-emerald-50 text-sky-800 border-emerald-300 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isSupabaseConfigured ? '🟢 ฐานข้อมูลออนไลน์ (Supabase) ⟳' : '⚪ โหมดในเครื่อง (Local Storage)'}</span>
          </button>
          <div className="text-xs text-sky-700/80 font-mono bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date())}
          </div>
        </div>
      </div>

      {/* 2. SENSA Hero Welcome Banner with Introduction Image */}
      <div className="workspace-panel relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-600/30 shadow-md p-4 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Left Copy */}
        <div className="relative z-10 max-w-xl space-y-2.5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-sky-700 text-[11px] font-semibold">
            <ScanLine size={13} className="text-sky-700" />
            <span>AR MASSAGE & HEALTH SIMULATION</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            สัมผัสภูมิปัญญาไทย <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-blue-600 to-cyan-600">
              ผ่านการฝึกที่เข้าใจคุณ
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            ฝึกการเคลื่อนไหวมืออย่างแม่นยำตามแนวเส้นประธานสิบ 
            พร้อมระบบตรวจจับ MediaPipe Pose & Hands และคำแนะนำการนวดแบบเรียลไทม์
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleStart}
              disabled={!hasSelectedTargets}
              className="jelly-button px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Camera size={15} />
              <span>เริ่มฝึกด้วยกล้อง AR (MediaPipe) ทันที</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                const el = document.getElementById('region-selection-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="jelly-button px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-slate-700 font-semibold text-xs border border-emerald-200 flex items-center space-x-1.5 transition-all"
            >
              <Play size={13} className="fill-current text-sky-700" />
              <span>เลือกส่วนของร่างกาย ({selectedPart})</span>
            </button>

            <span className="text-[11px] text-sky-700/80 flex items-center space-x-1.5 pl-1">
              <ShieldCheck size={14} className="text-sky-700 shrink-0" />
              <span>ภาพกล้องประมวลผลบนอุปกรณ์ของคุณ</span>
            </span>
          </div>
        </div>

        {/* Keep the original image proportions and show the whole illustration. */}
        <div className="relative flex items-center justify-center w-48 h-48 lg:w-56 lg:h-56 shrink-0">
          <img src={introductionImage}
            alt="ภาพแนะนำการฝึกนวดไทยด้วย AR ตัวละครแสดงแนวเส้นและจุดเป้าหมายบนร่างกาย"
            className="block w-full h-full object-contain drop-shadow-md" />
        </div>

      </div>

      {/* 3. Stats Grid (4 Cards from SENSA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="workspace-panel p-3.5 sm:p-4 rounded-xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>รอบการฝึกทั้งหมด</span>
            <Activity size={16} className="text-sky-700" />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {totalSessions} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
          </div>
          <div className="text-[11px] text-sky-700/80">บันทึกสะสมในระบบ</div>
        </div>

        <div className="workspace-panel p-3.5 sm:p-4 rounded-xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ประเมินเฉลี่ยรวมทุกรอบ</span>
            <Target size={16} className="text-sky-700" />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {avgScore || '—'} <span className="text-xs font-normal text-slate-500">%</span>
          </div>
          <div className="text-[11px] text-sky-700 flex items-center space-x-1">
            <MoveUpRight size={11} />
            <span>{totalSessions > 0 ? `เฉลี่ยจากทั้งหมด ${totalSessions} รอบการฝึก` : 'เริ่มฝึกเพื่อประเมินผล'}</span>
          </div>
        </div>

        <div className="workspace-panel p-3.5 sm:p-4 rounded-xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>เวลาฝึกสะสม</span>
            <Clock3 size={16} className="text-cyan-700" />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {totalDurationMin || 0} <span className="text-xs font-normal text-slate-500">นาที</span>
          </div>
          <div className="text-[11px] text-slate-500">ทุกนาทีมีความหมาย</div>
        </div>

        <div className="workspace-panel p-3.5 sm:p-4 rounded-xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ความแม่นยำล่าสุด</span>
            <Sparkles size={16} className="text-amber-700" />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {latestAccuracy !== null ? `${latestAccuracy}%` : '—'}
          </div>
          <div className="text-[11px] text-amber-700/80">
            {latestAccuracy !== null ? 'จากการฝึกล่าสุด' : 'ยังไม่มีประวัติการฝึก'}
          </div>
        </div>
      </div>

      {/* 4. Region Selection (3 Body Cards: Upper, Middle, Lower) */}
      <div id="region-selection-section" className="space-y-4">
        <div className="workspace-heading flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
              วันนี้ อยากฝึกส่วนไหน? (Body Sections)
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              เลือกหมวดหมู่ส่วนของร่างกาย
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-sm">
            *ระบบจะโหลดเฉพาะจุดเป้าหมายของหมวดนั้นขึ้นบนจอ AR เพื่อลดความสับสนของผู้เรียน
          </p>
        </div>

        {/* 3 Body Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {(['upper', 'middle', 'lower']).map((r, idx) => {
            const config = regionInfo[r];
            const isSelected = selectedRegion === r;
            const regionNodes = targetNodes.filter(n => n.region === r);

            return (
              <button
                key={r}
                type="button"
                aria-pressed={isSelected}
                aria-controls="training-setup-section"
                onClick={() => {
                  sound.playClick();
                  setSelectedRegion(r);
                  setSelectedPart(config.parts[0]);
                  setSetupNavigation(value => value + 1);
                }}
                className={`workspace-panel region-card w-full text-left p-6 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${isSelected ? 'is-selected' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="region-accent font-mono text-xs font-bold tracking-widest text-sky-500/70">
                      0{idx + 1}
                    </span>
                    <div className="region-thumbnail w-24 h-32 sm:w-28 sm:h-36 shrink-0 flex items-center justify-center bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden p-1">
                      <img src={regionImages[r]} alt={`ภาพแนะนำการฝึก${config.name}`}
                        className="block w-full h-full object-contain" loading="lazy" />
                    </div>
                  </div>

                  <span className="region-accent text-[10px] font-bold tracking-wider text-sky-700/80 font-mono">
                    {config.english}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5 mb-1.5">{config.name}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed mb-4">{config.description}</p>

                  <div className="text-[11px] text-slate-500 font-medium">
                    ครอบคลุม: <span className="region-accent text-sky-700">{config.parts.join(' · ')}</span>
                  </div>
                </div>

                <div className="region-card-footer mt-6 pt-4 border-t border-emerald-200 flex items-center justify-between text-xs w-full">
                  <span className="region-accent text-sky-700 font-semibold flex items-center space-x-1.5">
                    <Target size={14} />
                    <span>{regionNodes.length} จุดเป้าหมาย</span>
                  </span>
                  <span className="region-arrow w-7 h-7 rounded-full flex items-center justify-center transition-all bg-emerald-50 text-sky-700 border border-emerald-200">
                    <ChevronRight size={16} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Part & Mode Setup Panel */}
      <section id="training-setup-section" ref={setupRef} aria-labelledby="training-setup-heading" className="workspace-panel p-6 sm:p-8 rounded-3xl bg-white border border-emerald-200 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-4">
          <div>
            <span className="text-xs font-mono text-sky-700 font-bold uppercase tracking-wider">
              {currentRegionConfig.name} ({currentRegionConfig.english})
            </span>
            <h3 id="training-setup-heading" ref={setupHeadingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 mt-0.5 focus:outline-none">เลือกจุดนวดและโหมดการฝึก</h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-sky-700 font-mono">
            ขั้นตอน 02 / 02
          </span>
        </div>

        {/* Part Chips */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            เลือกอวัยวะเป้าหมายที่ต้องการฝึก:
          </label>
          <div className="flex flex-wrap gap-2.5">
            {availableParts.map(partName => {
              const partCount = targetNodes.filter(n => n.region === selectedRegion && n.name === partName).length;
              const isPartSelected = selectedPart === partName;

              return (
                <button
                  key={partName}
                  onClick={() => { sound.playClick(); setSelectedPart(partName); }}
                  className={`jelly-button px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                    isPartSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-50 hover:bg-emerald-50 text-slate-700 border border-emerald-200'
                  }`}
                >
                  <Target size={15} />
                  <span>{partName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isPartSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-sky-700'
                  }`}>
                    {partCount} จุด
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Part Anatomical Details Card */}
          {(() => {
            const currentPartNodes = targetNodes.filter(n => n.region === selectedRegion && n.name === selectedPart);
            const currentPartNode = currentPartNodes[0];
            if (!currentPartNode) return null;

            return (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Target size={14} className="text-sky-700" />
                    <span>ข้อมูลกายวิภาคจุดที่เลือก: {selectedPart}</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-sky-800">
                    {currentPartNodes.length} ตำแหน่งเป้าหมาย
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-100 shadow-sm">
                    <span className="text-slate-500 font-medium block text-[10px]">กล้ามเนื้อที่โฟกัส:</span>
                    <span className="font-bold text-slate-800">{currentPartNode.muscle}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-100 shadow-sm">
                    <span className="text-slate-500 font-medium block text-[10px]">เทคนิคและคำแนะนำการนวด:</span>
                    <span className="font-semibold text-slate-800">{currentPartNode.techniqueGuide}</span>
                  </div>
                </div>

                {currentPartNode.motion === 'circular' && (
                  <div className="text-[11px] text-amber-800 flex items-center space-x-1.5 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>สำหรับจุดนี้ ระบบจะตรวจจับการคลึงวนตามเข็มนาฬิกา (Clockwise) เท่านั้น เพื่อผลการฟื้นฟูกล้ามเนื้อที่ถูกต้อง</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Mode Options: Demo vs Camera */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            เลือกโหมดการฝึกปฏิบัติ:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { sound.playClick(); setTrainingMode('camera'); }}
              className={`workspace-choice p-4 rounded-2xl border text-left flex items-start space-x-3.5 transition-all ${
                trainingMode === 'camera'
                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/30 text-slate-900'
                  : 'bg-emerald-50 hover:bg-emerald-50 border-emerald-200 text-slate-700'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-sky-700 shrink-0">
                <Camera size={22} />
              </div>
              <div>
                <b className="text-sm font-bold block text-slate-900">กล้องจริง (Live Camera Tracking)</b>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  ตรวจจับร่างกายและมือด้วย MediaPipe Pose & Hands แบบเรียลไทม์ พร้อมฟิลเตอร์อินฟราเรด
                </p>
              </div>
            </button>

            <button
              onClick={() => { sound.playClick(); setTrainingMode('demo'); }}
              className={`workspace-choice p-4 rounded-2xl border text-left flex items-start space-x-3.5 transition-all ${
                trainingMode === 'demo'
                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/30 text-slate-900'
                  : 'bg-emerald-50 hover:bg-emerald-50 border-emerald-200 text-slate-700'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-700 shrink-0">
                <MousePointer2 size={22} />
              </div>
              <div>
                <b className="text-sm font-bold block text-slate-900">โหมดสาธิต (Interactive Mouse / Demo)</b>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  ฝึกด้วยเมาส์หรือดูตัวอย่างการเคลื่อนไหวมือจำลองอัตโนมัติ (เหมาะสำหรับการทดสอบด่วน)
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Start Training Button */}
        <div className="pt-2">
          <button
            onClick={handleStart}
            disabled={!hasSelectedTargets}
            className="jelly-button w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play size={18} className="fill-current" />
            <span>เริ่มฝึกปฏิบัติบริเวณ{selectedPart} ({trainingMode === 'camera' ? 'กล้องจริง' : 'โหมดสาธิต'})</span>
          </button>
        </div>
      </section>

      {/* 6. Recent Sessions & AI Recommendation Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Recent Sessions List (7 cols) */}
        <div className="workspace-panel lg:col-span-7 p-6 rounded-2xl bg-white border border-emerald-200 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <History size={16} className="text-sky-700" />
                <span>ประวัติและการประเมินแต่ละรอบ ({userSessions.length} รอบ)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                เปอร์เซ็นต์คะแนนย่อยและข้อเสนอแนะเชิงคลินิกจากการฝึกจริง
              </p>
            </div>
            {totalSessions > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-emerald-50 text-sky-800 border border-emerald-200">
                เฉลี่ยรวมทุกรอบ: {avgScore}%
              </span>
            )}
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {userSessions.length > 0 ? (
              userSessions.map((s, idx) => (
                <div key={s.id || idx} className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 hover:border-emerald-400 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-sky-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <ScanLine size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          รอบที่ {userSessions.length - idx}: การนวด{s.part || s.categoryNameTh || 'จุดกายวิภาค'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.completedAt || s.created} · {s.mode === 'camera' ? 'กล้องจริง (AR)' : 'โหมดสาธิต'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-block ${
                        (s.totalScore ?? s.score) >= 80 ? 'bg-emerald-500/20 text-sky-700 border border-emerald-500/30' :
                        (s.totalScore ?? s.score) >= 70 ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30' :
                        'bg-red-500/20 text-red-700 border border-red-500/30'
                      }`}>
                        ประเมินได้ {s.totalScore ?? s.score}%
                      </span>
                    </div>
                  </div>

                  {/* 3 Subscores Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-emerald-200/60">
                    <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">ความต่อเนื่อง</span>
                      <b className="text-slate-900 font-mono">{s.continuityScore ?? 40}% / 40%</b>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">ความถูกต้องทิศทาง</span>
                      <b className="text-sky-700 font-mono">{s.directionScore ?? s.accuracy ?? 40}% / 40%</b>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-slate-500 block text-[10px]">ความสม่ำเสมอ</span>
                      <b className="text-cyan-700 font-mono">{s.speedScore ?? 20}% / 20%</b>
                    </div>
                  </div>

                  {/* Feedback Snippet & Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200/40 text-xs">
                    <div className="text-slate-600 text-[11px] italic truncate max-w-sm">
                      💬 AI: "{s.feedback || s.aiFeedback || 'ปฏิบัติตามเกณฑ์มาตรฐานได้ดี'}"
                    </div>
                    <button 
                      type="button" 
                      className="jelly-button jelly-button-secondary px-3 py-1 text-xs self-end sm:self-auto shrink-0" 
                      onClick={() => setSelectedReport(s)}
                    >
                      ดูกระดาษสรุป & PDF
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                ยังไม่มีประวัติการฝึก — ผลการฝึกและการประเมินแต่ละรอบจะถูกบันทึกลงฐานข้อมูลและแสดงที่นี่
              </p>
            )}
          </div>
        </div>

        {/* AI Insight Panel (5 cols) */}
        <div className="workspace-panel lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-white to-white border border-emerald-600/30 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-2">
              <Sparkles size={16} />
              <span>คำแนะนำจาก AI สำหรับคุณ</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {userSessions[0] ? (
                userSessions[0].feedback || userSessions[0].aiFeedback || feedbackFor(userSessions[0])
              ) : (
                'เริ่มจากบริเวณบ่า เคลื่อนไหวมือช้า ๆ ตามลูกศรชี้นำ และรักษามือให้อยู่ในวงเป้าหมายเพื่อสะสมคะแนนความต่อเนื่อง'
              )}
            </p>
          </div>

          <div className="pt-4 border-t border-emerald-200 flex items-center justify-between text-xs text-sky-700/80 font-mono">
            <span>ก้าวเล็ก ๆ สู่ทักษะที่มั่นใจ</span>
            <CheckCircle2 size={16} />
          </div>
        </div>

      </div>
      {selectedReport && (
        <SessionReportDialog 
          session={selectedReport} 
          studentName={selectedReport?.studentName || selectedReport?.userName || currentUser?.name} 
          onClose={() => setSelectedReport(null)} 
        />
      )}

    </div>
  );
}
