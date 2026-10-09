import React, { useState, useRef, useEffect } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import { avg, formatDate, feedbackFor } from '../../lib/domain';
import LoadingIndicator from '../LoadingIndicator';
import SessionReportDialog from '../SessionReportDialog';
import { 
  Users, 
  UserCheck, 
  Target, 
  ScanLine, 
  Search, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Play, 
  Clock3, 
  Activity,
  ArrowRight,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard({ onSimulateAsUser }) {
  const { 
    currentUser, 
    users, 
    pendingApplicants, 
    approveApplicant, 
    rejectApplicant, 
    sessions,
    isSupabaseConfigured,
    refreshOnlineData
  } = usePlatform();

  const [activeTab, setActiveTab] = useState('user_requests'); // 'user_requests', 'admin_requests', 'members'

  // Auto-refresh from Supabase on mount and tab switch so Admin always sees fresh learner data
  useEffect(() => {
    if (refreshOnlineData) {
      refreshOnlineData();
    }
  }, [activeTab]);
  const [search, setSearch] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!refreshOnlineData || isSyncing) return;
    sound.playClick();
    setIsSyncing(true);
    await refreshOnlineData();
    setActionNotice('✓ ดึงข้อมูลล่าสุดจาก Supabase Cloud เรียบร้อยแล้ว');
    setTimeout(() => {
      setIsSyncing(false);
      setActionNotice('');
    }, 2500);
  };
  const [cohortInsight, setCohortInsight] = useState(
    sessions.length > 0
      ? 'จากการวิเคราะห์ข้อมูลผู้เรียนในคลาสทั้งหมด: มีการควบคุมทิศทางและความต่อเนื่องตามเกณฑ์มาตรฐาน'
      : 'ยังไม่มีข้อมูลการฝึกของผู้เรียนจริงในระบบ — ระบบ AI พร้อมประมวลผลสรุปจุดอ่อนร่วมทันทีที่มีผู้เรียนส่งผลการฝึกจริงผ่านกล้อง AR'
  );

  const requestsSectionRef = useRef(null);

  const handleJumpToUserRequests = () => {
    sound.playClick();
    setActiveTab('user_requests');
    setTimeout(() => {
      requestsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleJumpToAdminRequests = () => {
    sound.playClick();
    setActiveTab('admin_requests');
    setTimeout(() => {
      requestsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleJumpToMembers = () => {
    sound.playClick();
    setActiveTab('members');
    setTimeout(() => {
      requestsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleRefreshCohortAi = () => {
    sound.playClick();
    setAiAnalyzing(true);
    setTimeout(() => {
      if (sessions.length === 0) {
        setCohortInsight('ยังไม่มีข้อมูลการฝึกของผู้เรียนจริงในระบบ กรุณารอผู้เรียนลงทะเบียนและฝึกปฏิบัติจริงผ่านกล้อง AR');
      } else {
        const avgScore = Math.round(sessions.reduce((acc, s) => acc + (s.totalScore || s.score || 0), 0) / sessions.length);
        setCohortInsight(
          `การวิเคราะห์ข้อมูลผู้เรียนจริงล่าสุด (${sessions.length} รอบการฝึก): คะแนนเฉลี่ยของคลาสอยู่ที่ ${avgScore}% แนะนำให้อาจารย์ผู้สอนเน้นสาธิตการรักษาระดับแรงกดให้นิ่งและควบคุมทิศทางอย่างต่อเนื่อง`
        );
      }
      setAiAnalyzing(false);
      sound.playNodeComplete();
    }, 500);
  };

  const activeLearners = users.filter(u => u.status === 'active' && u.role === 'user');
  const userRequests = pendingApplicants.filter(a => (a.requestedRole || 'user') === 'user');
  const adminRequests = pendingApplicants.filter(a => a.requestedRole === 'admin');

  const handleApprove = (req) => {
    sound.playNodeComplete();
    approveApplicant(req.id);
    setActionNotice(`✓ อนุมัติ "${req.name}" (${req.requestedRole === 'admin' ? 'สิทธิ์แอดมิน/ผู้สอน' : 'สิทธิ์ผู้เรียน'}) สำเร็จแล้ว`);
    setTimeout(() => setActionNotice(''), 4500);
  };

  const handleReject = (req) => {
    sound.playWarning();
    rejectApplicant(req.id);
    setActionNotice(`✕ ปฏิเสธคำขอของ "${req.name}" เรียบร้อยแล้ว`);
    setTimeout(() => setActionNotice(''), 4500);
  };

  const filteredMembers = users.filter(u => 
    `${u.name} ${u.email} ${u.studentId || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  // Student specific history
  const studentSessions = selectedStudent 
    ? sessions.filter(s => 
        (s.userId && s.userId === selectedStudent.id) || 
        (s.user_id && s.user_id === selectedStudent.id) || 
        (s.userName && s.userName.toLowerCase() === selectedStudent.name.toLowerCase()) || 
        (s.user_name && s.user_name.toLowerCase() === selectedStudent.name.toLowerCase()) ||
        (s.studentName && s.studentName.toLowerCase() === selectedStudent.name.toLowerCase())
      )
    : [];
  const studentAvg = avg(studentSessions.map(s => s.totalScore ?? s.score ?? 0));
  const studentAccuracy = avg(studentSessions.map(s => s.accuracy ?? s.directionScore ?? 0));

  // Breakdown of body parts trained (เค้าทำส่วนไหนไปบ้างกี่รอบ)
  const studentPartBreakdown = React.useMemo(() => {
    const map = {};
    studentSessions.forEach(s => {
      const partName = s.part || s.categoryNameTh || s.category || 'ไม่ระบุบริเวณ';
      if (!map[partName]) {
        map[partName] = { name: partName, count: 0, scores: [] };
      }
      map[partName].count += 1;
      map[partName].scores.push(s.totalScore ?? s.score ?? 0);
    });
    return Object.values(map).map(item => ({
      ...item,
      avgScore: avg(item.scores)
    })).sort((a, b) => b.count - a.count);
  }, [studentSessions]);

  return (
    <div className="workspace-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-3.5 sm:space-y-4 animate-fade-in">
      
      {/* 1. Header with Simulation Button */}
      <div className="workspace-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-md">
        <div className="space-y-1">
          <div className="text-[10px] font-bold tracking-widest text-sky-700 uppercase font-mono flex items-center space-x-1.5">
            <ShieldCheck size={13} />
            <span>INSTRUCTOR WORKSPACE (อาจารย์ผู้ประเมิน)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            ดูแลการเรียนรู้ของผู้เรียน
          </h1>
          <p className="text-xs text-slate-600">
            มองเห็นพัฒนาการของนักศึกษา ตรวจสอบสิทธิ์ และให้คำแนะนำทางวิชาชีพที่ตรงจุด
          </p>

          {/* Quick jump badges */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              onClick={handleJumpToUserRequests}
              className={`jelly-button px-2.5 py-0.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                userRequests.length > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/40'
                  : 'bg-emerald-50 hover:bg-emerald-50 text-slate-700 border border-emerald-200'
              }`}
            >
              <UserCheck size={12} className={userRequests.length > 0 ? 'text-amber-700' : 'text-slate-500'} />
              <span>คำขอของผู้เรียน ({userRequests.length})</span>
            </button>

            <button
              onClick={handleJumpToAdminRequests}
              className={`jelly-button px-2.5 py-0.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                adminRequests.length > 0
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 border border-cyan-500/40'
                  : 'bg-emerald-50 hover:bg-emerald-50 text-slate-700 border border-emerald-200'
              }`}
            >
              <ShieldCheck size={12} className={adminRequests.length > 0 ? 'text-cyan-700' : 'text-slate-500'} />
              <span>คำขอของแอดมิน ({adminRequests.length})</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onSimulateAsUser();
          }}
          className="jelly-button px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0 self-start sm:self-auto"
        >
          <ScanLine size={15} />
          <span>จำลองการเป็นผู้เรียน (AR Simulation)</span>
        </button>
      </div>

      {/* 2. Stats Grid (4 Cards from SENSA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Active Learners */}
        <div 
          onClick={handleJumpToMembers}
          className="workspace-panel p-3.5 sm:p-4 rounded-xl bg-white border border-emerald-200 shadow-sm cursor-pointer hover:border-emerald-500/60 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-sky-700">
            <span>ผู้เรียนที่อนุมัติแล้ว</span>
            <Users size={16} className="text-sky-700" />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {activeLearners.length} <span className="text-xs font-normal text-slate-500">คน</span>
          </div>
          <div className="text-[11px] text-sky-700/80 flex items-center space-x-1">
            <span>คลิกดูสมาชิกทั้งหมด</span>
            <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 2: User Requests */}
        <div 
          onClick={handleJumpToUserRequests}
          className={`workspace-panel p-3.5 sm:p-4 rounded-xl border shadow-sm cursor-pointer transition-all group ${
            userRequests.length > 0 
              ? 'bg-white border-amber-500/60 shadow-amber-950/20' 
              : 'bg-white border-emerald-200 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-amber-700">
            <span className="font-semibold text-amber-700">คำขอของผู้เรียน</span>
            <UserCheck size={16} className={userRequests.length > 0 ? 'text-amber-700 animate-bounce' : 'text-sky-700'} />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono flex items-baseline space-x-2">
            <span>{userRequests.length}</span>
            <span className="text-xs font-normal text-slate-500">คำขอ</span>
            {userRequests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 font-sans font-semibold border border-amber-500/30">
                รออนุมัติ
              </span>
            )}
          </div>
          <div className="text-[11px] text-amber-700/80 flex items-center space-x-1">
            <span>คลิกตรวจสอบ & กดรับ</span>
            <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 3: Admin Requests */}
        <div 
          onClick={handleJumpToAdminRequests}
          className={`workspace-panel p-3.5 sm:p-4 rounded-xl border shadow-sm cursor-pointer transition-all group ${
            adminRequests.length > 0 
              ? 'bg-white border-cyan-500/60 shadow-cyan-950/20' 
              : 'bg-white border-emerald-200 hover:border-cyan-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-cyan-700">
            <span className="font-semibold text-cyan-700">คำขอของแอดมิน</span>
            <ShieldCheck size={16} className={adminRequests.length > 0 ? 'text-cyan-700 animate-bounce' : 'text-cyan-700'} />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono flex items-baseline space-x-2">
            <span>{adminRequests.length}</span>
            <span className="text-xs font-normal text-slate-500">คำขอ</span>
            {adminRequests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 font-sans font-semibold border border-cyan-500/30">
                รออนุมัติ
              </span>
            )}
          </div>
          <div className="text-[11px] text-cyan-700/80 flex items-center space-x-1">
            <span>คลิกตรวจสอบ & กดรับ</span>
            <ArrowRight size={11} />
          </div>
        </div>

        {/* Card 4: Total Sessions */}
        <div className="workspace-panel p-3.5 sm:p-4 rounded-xl bg-white border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>จำนวนการฝึกสะสม</span>
            <ScanLine size={16} className="text-sky-700" />
          </div>
          <div className="my-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {sessions.length} <span className="text-xs font-normal text-slate-500">รอบ</span>
          </div>
          <div className="text-[11px] text-sky-700/80 font-mono">
            คะแนนเฉลี่ย: {avg(sessions.map(s => s.totalScore || s.score || 0)) || '—'}%
          </div>
        </div>
      </div>

      {/* 3. Analytics Section: Side-by-Side 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
        
        {/* Left Column: Overall Progression Trend Chart */}
        <div className="workspace-panel p-4 sm:p-4.5 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Activity size={16} className="text-sky-700" />
              <span>พัฒนาการคะแนนโดยรวม (Progression Trend)</span>
            </h3>
            <span className="text-[11px] text-sky-700/80 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              12 รอบล่าสุด
            </span>
          </div>

          <div className="w-full h-32 relative">
            <svg className="w-full h-full" viewBox="0 0 680 145" preserveAspectRatio="none">
              <defs>
                <linearGradient id="admin-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid */}
              {[0, 25, 50, 75, 100].map(v => (
                <g key={v}>
                  <text x="25" y={126 - v * 1.05} fontSize="9" fill="#4b7894" textAnchor="end" fontFamily="monospace">
                    {v}
                  </text>
                  <path d={`M35 ${122 - v * 1.05} H670`} stroke="rgba(70, 120, 95, 0.2)" strokeDasharray="4 4" />
                </g>
              ))}

              {/* Data Curve */}
              {(() => {
                const sorted = [...sessions].slice(-10);
                if (sorted.length === 0) {
                  return (
                    <text x="340" y="70" fill="#4b7894" fontSize="11" textAnchor="middle" fontFamily="sans-serif">
                      ยังไม่มีข้อมูลการฝึกจากผู้เรียนจริงในระบบ
                    </text>
                  );
                }

                const pts = sorted.map((r, i) => {
                  const x = 50 + (i / Math.max(1, sorted.length - 1)) * 600;
                  const score = r.totalScore || r.score || 0;
                  const y = 122 - (score * 1.05);
                  return { x, y, score, date: r.completedAt || r.created };
                });

                const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
                const areaPoints = `50,122 ${polyPoints} ${pts[pts.length - 1].x},122`;

                return (
                  <>
                    <polygon points={areaPoints} fill="url(#admin-chart-fill)" />
                    <polyline points={polyPoints} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill="#091812" stroke="#10b981" strokeWidth="2" />
                        <text x={p.x} y={p.y - 7} fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {p.score}%
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Right Column: Class-Wide AI Insights */}
        <div className="workspace-panel p-4 sm:p-4.5 rounded-2xl bg-white border border-emerald-500/40 shadow-md space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
            <div className="flex items-center space-x-1.5 text-sky-700 font-bold text-sm">
              <Sparkles size={16} className="text-sky-700" />
              <span>AI Insights — สรุปจุดอ่อนร่วม</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefreshCohortAi}
                disabled={aiAnalyzing}
                className="jelly-button jelly-button-secondary py-0.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-50 text-slate-700 text-[11px] flex items-center space-x-1 transition-colors border border-emerald-200"
              >
                {aiAnalyzing ? <LoadingIndicator label="กำลังวิเคราะห์" /> : <RefreshCw size={11} />}
                <span>ประมวลผลซ้ำ</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {aiAnalyzing ? 'ระบบกำลังสังเคราะห์สถิติการฝึกและข้อผิดพลาดร่วม...' : cohortInsight}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] text-amber-700 font-semibold">⚠️ จุดอ่อนร่วม</div>
              <div className="text-slate-900 font-bold text-xs truncate">
                {sessions.length > 0 ? 'ต้นคอ & ยอดบ่า' : '— รอข้อมูล —'}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                {sessions.length > 0 ? 'แรงกดสะดุด' : 'รอส่งผล'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] text-sky-700 font-semibold">✓ จุดแข็งคลาส</div>
              <div className="text-slate-900 font-bold text-xs truncate">
                {sessions.length > 0 ? 'แนวแขนล่าง' : '— รอข้อมูล —'}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                {sessions.length > 0 ? 'รีดเส้นสม่ำเสมอ' : 'รอส่งผล'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] text-cyan-700 font-semibold">📊 แนะนำการสอน</div>
              <div className="text-slate-900 font-bold text-xs truncate">
                {sessions.length > 0 ? 'เน้นจังหวะช้า' : '— รอข้อมูล —'}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                {sessions.length > 0 ? 'ลดการเร่งมือ' : 'มาตรฐานเวชศาสตร์'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="workspace-panel p-3 rounded-xl bg-emerald-50 border border-emerald-500/60 text-sky-700 text-xs sm:text-sm font-semibold flex items-center space-x-2 animate-fade-in shadow-md">
          <CheckCircle2 size={16} className="text-sky-700 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 4. Tabs: User Requests vs Admin Requests vs Members Directory */}
      <div ref={requestsSectionRef} id="requests-section" className="space-y-3 scroll-mt-6">
        <div className="workspace-tabs flex flex-wrap border-b border-emerald-200 gap-1.5 sm:gap-4 pb-1.5">
          {/* TAB BUTTON 1: USER REQUESTS */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('user_requests'); }}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 transition-all relative ${
              activeTab === 'user_requests' ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck size={16} />
            <span>คำขอของผู้เรียน</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              userRequests.length > 0 
                ? 'bg-amber-500 text-slate-950 font-mono animate-pulse' 
                : 'bg-emerald-50 text-slate-500 border border-emerald-200'
            }`}>
              {userRequests.length}
            </span>
            {activeTab === 'user_requests' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 rounded-full" />}
          </button>

          {/* TAB BUTTON 2: ADMIN REQUESTS */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('admin_requests'); }}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 transition-all relative ${
              activeTab === 'admin_requests' ? 'text-cyan-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck size={16} />
            <span>คำขอของแอดมิน</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              adminRequests.length > 0 
                ? 'bg-cyan-400 text-slate-950 font-mono animate-pulse' 
                : 'bg-emerald-50 text-slate-500 border border-emerald-200'
            }`}>
              {adminRequests.length}
            </span>
            {activeTab === 'admin_requests' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400 rounded-full" />}
          </button>

          {/* TAB BUTTON 3: ALL MEMBERS */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('members'); }}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 transition-all relative ${
              activeTab === 'members' ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={16} />
            <span>สมาชิกทั้งหมด</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-slate-500 border border-emerald-200 font-mono">
              {filteredMembers.length}
            </span>
            {activeTab === 'members' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1 CONTENT: USER REQUESTS (คำขอของผู้เรียน)                  */}
        {/* ============================================================== */}
        {activeTab === 'user_requests' && (
          <div className="workspace-panel p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <UserCheck size={18} className="text-amber-700" />
                  <span>คำขอเข้าใช้งานของผู้เรียน (Learner Enrollment Requests)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายชื่อผู้เรียนที่ลงทะเบียนผ่านหน้าเว็บ ตรวจสอบข้อมูลแล้วเลือก "กดรับ (อนุมัติ)" เพื่อให้เข้าสู่ระบบได้ หรือ "ปฏิเสธ"
                </p>
              </div>

              <span className="text-xs text-amber-700 font-mono bg-amber-50 border border-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
                รอการอนุมัติ: {userRequests.length} ท่าน
              </span>
            </div>

            {userRequests.length === 0 ? (
              <div className="workspace-panel py-14 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-emerald-200">
                <div className="workspace-panel w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-sky-700">
                  <UserCheck size={28} />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">ไม่มีคำขอของผู้เรียนที่รออนุมัติในขณะนี้</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    เมื่อมีผู้เรียนลงทะเบียนใหม่ผ่านหน้าแรก ระบบจะแสดงข้อมูลชื่อ-นามสกุล เบอร์โทร อีเมล วันเกิด ที่นี่ทันทีเพื่อให้อาจารย์กดรับหรือปฏิเสธ
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-emerald-200 text-slate-500">
                        <th className="py-3 px-3">ผู้ยื่นคำขอ</th>
                        <th className="py-3 px-3">เบอร์โทรศัพท์</th>
                        <th className="py-3 px-3">วันเดือนปีเกิด</th>
                        <th className="py-3 px-3">เวลายื่นคำขอ</th>
                        <th className="py-3 px-3">สิทธิ์ที่ขอ</th>
                        <th className="py-3 px-3 text-right">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/40">
                      {userRequests.map(req => (
                        <tr key={req.id} className="hover:bg-emerald-50 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center space-x-3">
                              <span className="w-9 h-9 rounded-full bg-emerald-50 text-sky-700 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                                {req.name ? req.name.slice(0, 1) : 'U'}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{req.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                                  <Mail size={11} className="text-sky-700" />
                                  <span>{req.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-slate-700">
                            <div className="flex items-center space-x-1.5">
                              <Phone size={12} className="text-slate-500" />
                              <span>{req.phone || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-slate-700">
                            <div className="flex items-center space-x-1.5">
                              <Calendar size={12} className="text-slate-500" />
                              <span>{req.dob || req.birth || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                            <div className="flex items-center space-x-1.5">
                              <Clock3 size={12} className="text-slate-500" />
                              <span>{req.appliedDate || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-sky-700 border border-emerald-500/30">
                              ผู้เรียน (User)
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleApprove(req)}
                                className="jelly-button px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 transition-all transform active:scale-95"
                              >
                                <Check size={14} />
                                <span>กดรับ (อนุมัติ)</span>
                              </button>

                              <button
                                onClick={() => handleReject(req)}
                                className="jelly-button jelly-button-danger px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-700 hover:text-slate-900 font-semibold text-xs border border-red-800/60 flex items-center space-x-1.5 transition-all transform active:scale-95"
                              >
                                <X size={14} />
                                <span>ปฏิเสธ</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {userRequests.map(req => (
                    <div key={req.id} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-10 h-10 rounded-full bg-emerald-50 text-sky-700 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                            {req.name ? req.name.slice(0, 1) : 'U'}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{req.name}</div>
                            <div className="text-xs text-slate-500 font-mono">{req.email}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-sky-700 border border-emerald-500/30">
                          ผู้เรียน
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1 border-t border-emerald-200">
                        <div>📞 <span className="font-mono">{req.phone || '—'}</span></div>
                        <div>🎂 <span className="font-mono">{req.dob || req.birth || '—'}</span></div>
                        <div className="col-span-2 text-[11px] text-slate-500">
                          🕒 ยื่นเมื่อ: <span className="font-mono">{req.appliedDate || '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t border-emerald-200">
                        <button
                          onClick={() => handleApprove(req)}
                          className="jelly-button flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md"
                        >
                          <Check size={14} />
                          <span>กดรับ (อนุมัติ)</span>
                        </button>

                        <button
                          onClick={() => handleReject(req)}
                          className="jelly-button jelly-button-danger py-2 px-3.5 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-700 font-semibold text-xs border border-red-800/60 flex items-center justify-center space-x-1.5 transition-all"
                        >
                          <X size={14} />
                          <span>ปฏิเสธ</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2 CONTENT: ADMIN REQUESTS (คำขอของแอดมิน)                   */}
        {/* ============================================================== */}
        {activeTab === 'admin_requests' && (
          <div className="workspace-panel p-4 sm:p-5 rounded-2xl bg-white border border-cyan-200 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldCheck size={18} className="text-cyan-700" />
                  <span>คำขอของแอดมิน / ผู้สอน (Instructor Role Requests)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายชื่อผู้ที่ลงทะเบียนขอสิทธิ์เป็น Admin/อาจารย์ผู้สอน ต้องได้รับการตรวจสอบและอนุมัติก่อนจึงจะเข้าถึงระบบผู้สอนได้
                </p>
              </div>

              <span className="text-xs text-cyan-700 font-mono bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full self-start sm:self-auto">
                รอการอนุมัติ: {adminRequests.length} ท่าน
              </span>
            </div>

            {/* Security Caution Box */}
            <div className="workspace-panel p-3.5 rounded-2xl bg-cyan-50 border border-cyan-600/30 flex items-start space-x-3 text-xs text-cyan-700">
              <ShieldCheck size={18} className="text-cyan-700 shrink-0 mt-0.5" />
              <div>
                <b className="font-semibold text-cyan-100">ข้อควรทราบด้านสิทธิ์การใช้งาน:</b> บัญชีที่ได้รับการอนุมัติในหมวดนี้จะได้รับสิทธิ์เป็น <span className="font-bold underline">Admin (อาจารย์ผู้สอน)</span> สามารถตรวจสอบพัฒนาการของผู้เรียน สรุปผล AI และเข้าถึงการอนุมัติสิทธิ์สมาชิกคนอื่นได้
              </div>
            </div>

            {adminRequests.length === 0 ? (
              <div className="workspace-panel py-14 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-cyan-200">
                <div className="workspace-panel w-14 h-14 mx-auto rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">ไม่มีคำขอของแอดมินที่รออนุมัติในขณะนี้</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    เมื่อมีผู้ใช้ลงทะเบียนโดยเลือกบทบาท "Admin (ผู้สอน)" ระบบจะส่งข้อมูลคำขอมาที่เมนูนี้ เพื่อให้อาจารย์ตรวจสอบข้อมูลและกดยืนยันรับสิทธิ์
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-cyan-200 text-slate-500">
                        <th className="py-3 px-3">ผู้ยื่นคำขอ</th>
                        <th className="py-3 px-3">เบอร์โทรศัพท์</th>
                        <th className="py-3 px-3">วันเดือนปีเกิด</th>
                        <th className="py-3 px-3">เวลายื่นคำขอ</th>
                        <th className="py-3 px-3">สิทธิ์ที่ขอ</th>
                        <th className="py-3 px-3 text-right">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-900/40">
                      {adminRequests.map(req => (
                        <tr key={req.id} className="hover:bg-cyan-50 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center space-x-3">
                              <span className="w-9 h-9 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-200">
                                {req.name ? req.name.slice(0, 1) : 'A'}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{req.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                                  <Mail size={11} className="text-cyan-700" />
                                  <span>{req.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-slate-700">
                            <div className="flex items-center space-x-1.5">
                              <Phone size={12} className="text-slate-500" />
                              <span>{req.phone || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-slate-700">
                            <div className="flex items-center space-x-1.5">
                              <Calendar size={12} className="text-slate-500" />
                              <span>{req.dob || req.birth || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                            <div className="flex items-center space-x-1.5">
                              <Clock3 size={12} className="text-slate-500" />
                              <span>{req.appliedDate || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-700 border border-cyan-500/30">
                              Admin (ผู้สอน)
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleApprove(req)}
                                className="jelly-button px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 transition-all transform active:scale-95"
                              >
                                <Check size={14} />
                                <span>กดรับ (อนุมัติเป็นแอดมิน)</span>
                              </button>

                              <button
                                onClick={() => handleReject(req)}
                                className="jelly-button jelly-button-danger px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-700 hover:text-slate-900 font-semibold text-xs border border-red-800/60 flex items-center space-x-1.5 transition-all transform active:scale-95"
                              >
                                <X size={14} />
                                <span>ปฏิเสธ</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {adminRequests.map(req => (
                    <div key={req.id} className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-200">
                            {req.name ? req.name.slice(0, 1) : 'A'}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{req.name}</div>
                            <div className="text-xs text-slate-500 font-mono">{req.email}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-700 border border-cyan-500/30">
                          แอดมิน
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1 border-t border-cyan-200">
                        <div>📞 <span className="font-mono">{req.phone || '—'}</span></div>
                        <div>🎂 <span className="font-mono">{req.dob || req.birth || '—'}</span></div>
                        <div className="col-span-2 text-[11px] text-slate-500">
                          🕒 ยื่นเมื่อ: <span className="font-mono">{req.appliedDate || '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t border-cyan-200">
                        <button
                          onClick={() => handleApprove(req)}
                          className="jelly-button flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md"
                        >
                          <Check size={14} />
                          <span>กดรับ (อนุมัติเป็นแอดมิน)</span>
                        </button>

                        <button
                          onClick={() => handleReject(req)}
                          className="jelly-button jelly-button-danger py-2 px-3.5 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-700 font-semibold text-xs border border-red-800/60 flex items-center justify-center space-x-1.5 transition-all"
                        >
                          <X size={14} />
                          <span>ปฏิเสธ</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3 CONTENT: MEMBERS TABLE (สมาชิกทั้งหมด)                   */}
        {/* ============================================================== */}
        {activeTab === 'members' && (
          <div className="workspace-panel p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">รายชื่อสมาชิกที่อนุมัติแล้ว</h3>
                <p className="text-xs text-slate-500 mt-0.5">ผู้เรียนและอาจารย์ที่ได้รับสิทธิ์เข้าใช้งานระบบอย่างถูกต้อง</p>
              </div>

              <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="jelly-button jelly-button-secondary px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 whitespace-nowrap bg-emerald-50 border border-emerald-300 text-sky-800 hover:bg-emerald-100 transition-all shadow-sm"
                  title="กดเพื่อดึงข้อมูลผู้เรียนและรอบการฝึกจาก Supabase ทันที"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-700' : 'text-sky-700'} />
                  <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Supabase'}</span>
                </button>

                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ หรืออีเมล..."
                    className="w-full pl-9 pr-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-200 text-slate-500">
                    <th className="py-3 px-3">ชื่อสมาชิก</th>
                    <th className="py-3 px-3">บทบาท</th>
                    <th className="py-3 px-3">การฝึก / คะแนนเฉลี่ย</th>
                    <th className="py-3 px-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40">
                  {filteredMembers.map(u => {
                    const uSessions = sessions.filter(s => 
                      (s.userId && s.userId === u.id) || 
                      (s.user_id && s.user_id === u.id) || 
                      (s.userName && s.userName.toLowerCase() === u.name.toLowerCase()) || 
                      (s.user_name && s.user_name.toLowerCase() === u.name.toLowerCase()) ||
                      (s.studentName && s.studentName.toLowerCase() === u.name.toLowerCase())
                    );
                    const uAvg = avg(uSessions.map(s => s.totalScore ?? s.score ?? 0));

                    return (
                      <tr key={u.id} className="hover:bg-emerald-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 h-8 rounded-full bg-emerald-50 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name.slice(0, 1)}
                            </span>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(u)}
                                className="bg-transparent border-0 p-0 shadow-none font-bold text-slate-900 hover:text-sky-700 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 focus-visible:outline-offset-2"
                              >
                                {u.name}
                              </button>
                              <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.role === 'admin' ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-500/30' :
                            u.role === 'super' || u.role === 'super_admin' ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30' :
                            'bg-emerald-500/20 text-sky-700 border border-emerald-500/30'
                          }`}>
                            {u.role === 'admin' ? 'ผู้สอน' : u.role === 'super' || u.role === 'super_admin' ? 'ผู้ดูแลระบบ' : 'ผู้เรียน'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {uSessions.length} รอบ <span className="text-sky-700 font-bold">· {uAvg || '—'}%</span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedStudent(u)}
                            className="jelly-button jelly-button-secondary text-xs text-sky-700 hover:text-sky-700 font-semibold underline underline-offset-2"
                          >
                            ดูโปรไฟล์
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>

      {/* STUDENT PROFILE & CLINICAL REPORT DRAWER/MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="workspace-panel max-w-2xl w-full bg-white border border-emerald-600/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-emerald-200 pb-4">
              <div className="flex items-center space-x-3.5">
                <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-sky-700 flex items-center justify-center font-bold text-lg">
                  {selectedStudent.name.slice(0, 1)}
                </span>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedStudent.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="jelly-button jelly-button-secondary jelly-button-icon p-1.5 rounded-lg text-slate-500 hover:text-slate-900 bg-emerald-50 border border-emerald-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick 3 Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <b className="text-xl font-bold text-slate-900 font-mono">{studentSessions.length}</b>
                <small className="block text-[11px] text-slate-500 font-medium">รอบการฝึกทั้งหมด</small>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 ring-1 ring-emerald-500/20">
                <b className="text-xl font-bold text-sky-700 font-mono">{studentAvg || '—'}%</b>
                <small className="block text-[11px] text-sky-800 font-bold">เปอร์เซ็นต์ประเมินรวมทุกรอบ</small>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <b className="text-xl font-bold text-cyan-700 font-mono">{studentAccuracy || '—'}%</b>
                <small className="block text-[11px] text-slate-500 font-medium">ทิศทางถูกต้องเฉลี่ย</small>
              </div>
            </div>

            {/* Body Parts Breakdown (เค้าทำส่วนไหนไปบ้างกี่รอบ) */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Target size={14} className="text-sky-700" />
                  <span>สรุปบริเวณร่างกายที่ฝึก (ทำส่วนไหนไปบ้างกี่รอบ)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {studentPartBreakdown.length} บริเวณ
                </span>
              </div>

              {studentPartBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {studentPartBreakdown.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500">
                          ฝึกสะสม <span className="font-bold text-sky-800 font-mono">{item.count}</span> รอบ
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                          item.avgScore >= 80 ? 'bg-emerald-100 text-sky-800' :
                          item.avgScore >= 70 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.avgScore}%
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">คะแนนเฉลี่ย</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-2 text-center">
                  ยังไม่มีประวัติการฝึกในแต่ละส่วนของร่างกาย
                </p>
              )}
            </div>

            {/* Instructor AI Clinical Report */}
            <div className="workspace-panel p-4 rounded-2xl bg-gradient-to-br from-white to-white border border-emerald-600/40 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
                <Sparkles size={16} />
                <span>รายงานวิเคราะห์ผู้เรียนสำหรับอาจารย์</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {studentSessions.length > 0
                  ? `คะแนนเฉลี่ยรวมทุกรอบ ${studentAvg}% จาก ${studentSessions.length} รอบการฝึก ความถูกต้องของทิศทางเฉลี่ย ${studentAccuracy}% ${
                      studentAccuracy >= 80
                        ? 'มีจุดแข็งเรื่องการควบคุมทิศทางการนวดรีดเส้นตามแนวกล้ามเนื้อได้สม่ำเสมอ'
                        : 'ควรเน้นฝึกตามลูกศรชี้นำช้า ๆ และลดความเร็วเพื่อควบคุมทิศทางให้แม่นยำขึ้น'
                    }`
                  : 'ยังไม่มีผลการฝึกเพียงพอสำหรับประมวลผล'}
              </p>
            </div>

            {/* Session History with Detailed Feedback */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ประวัติการฝึกแต่ละรอบ & Feedback ({studentSessions.length} รอบ):
                </h4>
                <span className="text-[10px] text-slate-500">คลิกที่รอบการฝึกเพื่อดู Feedback และกระดาษสรุป</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {studentSessions.length > 0 ? (
                  studentSessions.map((s, idx) => (
                    <div key={s.id || idx} className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 space-y-2 text-xs hover:border-emerald-400 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            รอบที่ {studentSessions.length - idx}: การนวด{s.part || s.categoryNameTh || 'จุดกายวิภาค'}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                            {s.completedAt || s.created} · {s.mode === 'camera' ? 'กล้องจริง (AR)' : s.mode === 'demo' ? 'สาธิต' : 'ไม่ระบุโหมด'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sky-800 text-sm px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                          {s.totalScore ?? s.score}%
                        </span>
                      </div>

                      {/* Sub-scores */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] py-1 border-t border-emerald-100">
                        <span className="text-slate-600">ความต่อเนื่อง: <b className="font-mono text-slate-900">{s.continuityScore ?? 40}%</b></span>
                        <span className="text-slate-600">ทิศทาง: <b className="font-mono text-sky-700">{s.directionScore ?? s.accuracy ?? 40}%</b></span>
                        <span className="text-slate-600">ความสม่ำเสมอ: <b className="font-mono text-cyan-700">{s.speedScore ?? 20}%</b></span>
                      </div>

                      {/* Feedback Returned from this Session */}
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-100 space-y-1">
                        <div className="font-bold text-[11px] text-sky-800 flex items-center space-x-1">
                          <Sparkles size={11} />
                          <span>Feedback การประเมินของรอบนี้:</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed italic">
                          "{s.feedback || s.aiFeedback || 'ผู้เรียนปฏิบัติตามเกณฑ์ทิศทางและความเร็วมาตรฐานได้ถูกต้องครบถ้วน'}"
                        </p>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button 
                          type="button" 
                          className="jelly-button jelly-button-secondary px-3 py-1 text-xs" 
                          onClick={() => setSelectedReport(s)}
                        >
                          ดูกระดาษสรุปฉบับเต็ม / ดาวน์โหลด PDF
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    ยังไม่มีข้อมูลประวัติการฝึกของผู้เรียนท่านนี้
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
      {selectedReport && <SessionReportDialog session={selectedReport} studentName={selectedStudent?.name} onClose={() => setSelectedReport(null)} />}

    </div>
  );
}
