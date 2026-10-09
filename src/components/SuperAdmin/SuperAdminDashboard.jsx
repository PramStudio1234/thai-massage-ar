import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import { defaultNodes, regionInfo } from '../../lib/domain';
import { 
  Settings2, 
  Plus, 
  Save, 
  Terminal, 
  Database, 
  Trash2, 
  RotateCcw, 
  ShieldCheck, 
  Sliders, 
  Cpu, 
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserPlus
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { 
    currentUser, 
    users, 
    updateUserRole, 
    deleteUser, 
    provisionSuperAdmin,
    targetNodes, 
    addTargetNode, 
    updateTargetNode, 
    deleteTargetNode, 
    resetTargetNodes, 
    settings, 
    updateSettings, 
    logs, 
    resetDatabase 
  } = usePlatform();

  const [activeTab, setActiveTab] = useState('config'); // 'config', 'terminal', 'override'
  const [draftNodes, setDraftNodes] = useState(targetNodes);
  const [selectedNodeId, setSelectedNodeId] = useState(targetNodes[0]?.id || 'upper-บ่า-0');
  const [resetModal, setResetModal] = useState(false);
  const [confirmResetText, setConfirmResetText] = useState('');
  const [notice, setNotice] = useState('');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Terminal CLI state
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState([
    { text: 'SENSA Thai Wellness Lab - System Workspace Root Shell', type: 'system' },
    { text: 'Type "help" to display available CLI developer commands.', type: 'info' }
  ]);

  const target = draftNodes.find(n => n.id === selectedNodeId) || draftNodes[0];

  const editTarget = (partial) => {
    setDraftNodes(nodes => nodes.map(n => n.id === target.id ? { ...n, ...partial } : n));
  };

  const handleAddNewNode = () => {
    sound.playClick();
    const id = `node-${Date.now()}`;
    const newNode = {
      ...defaultNodes[0],
      id,
      name: 'จุดนวดเป้าหมายใหม่',
      english: 'New Acupoint',
      seconds: 15,
      radius: 0.048,
      a: 11,
      b: 12,
      t: 0.5,
      ox: 0,
      oy: 0
    };
    setDraftNodes(d => [newNode, ...d]);
    setSelectedNodeId(id);
  };

  const handleSaveNodes = () => {
    sound.playNodeComplete();
    draftNodes.forEach(n => {
      updateTargetNode(n.id, n);
    });
    setNotice('✓ บันทึกการตั้งค่าจุดเป้าหมายและค่าพารามิเตอร์ MediaPipe เรียบร้อยแล้ว');
    setTimeout(() => setNotice(''), 3500);
  };

  const handleCliCommand = (e) => {
    e.preventDefault();
    const cmd = cliInput.trim().toLowerCase();
    if (!cmd) return;

    sound.playClick();
    const newHist = [...cliHistory, { text: `$ ${cliInput}`, type: 'input' }];

    switch (cmd) {
      case 'help':
        newHist.push({
          text: 'Commands:\n  help      - Show this help\n  status    - Show MediaPipe tracking & core status\n  nodes     - List loaded anatomical targets\n  users     - List all registered users\n  db:reset  - Restore system seed tables\n  clear     - Clear terminal',
          type: 'info'
        });
        break;
      case 'status':
        newHist.push({
          text: `[KLAY KLAAI CORE OK]\n  Platform: Klay Klaai AR Training Platform\n  Tracking: MediaPipe Pose Lite & Hand Landmarker\n  Targets: ${draftNodes.length} nodes\n  Hitbox: ${settings.hitboxRadius || 55}px\n  Storage: LocalStorage + D1 Schema`,
          type: 'success'
        });
        break;
      case 'nodes':
        newHist.push({
          text: draftNodes.map(n => `• [${n.region}] ${n.name} (${n.english}) - ${n.motion} (${n.seconds}s)`).join('\n'),
          type: 'info'
        });
        break;
      case 'users':
        newHist.push({
          text: users.map(u => `• ${u.name} [${u.role}] - ${u.email}`).join('\n'),
          type: 'info'
        });
        break;
      case 'clear':
        setCliHistory([]);
        setCliInput('');
        return;
      default:
        newHist.push({ text: `Unknown command "${cmd}". Type "help" for help.`, type: 'error' });
        break;
    }

    setCliHistory(newHist);
    setCliInput('');
  };

  return (
    <div className="workspace-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-3.5 sm:space-y-4 animate-fade-in">
      
      {/* Header */}
      <div className="workspace-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-amber-500/30 shadow-md">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-amber-700 uppercase font-mono mb-0.5 flex items-center space-x-1.5">
            <ShieldCheck size={13} />
            <span>SYSTEM WORKSPACE (SUPER ADMIN & DEVELOPER)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            ตั้งค่าห้องฝึกและพารามิเตอร์ MediaPipe
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            กำหนดจุดเป้าหมายกายวิภาค เวลา รัศมีสัมผัส Hitbox และสัดส่วนอ้างอิง Pose Landmarks
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-mono font-bold self-start sm:self-auto">
          SUPER ADMIN ROOT
        </span>
      </div>

      {/* Tabs */}
      <div className="workspace-tabs flex flex-wrap gap-3 border-b border-emerald-200 pb-1.5">
        <button
          onClick={() => { sound.playClick(); setActiveTab('config'); }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition-all relative ${
            activeTab === 'config' ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings2 size={16} />
          <span>กำหนดจุดเป้าหมายกายวิภาค (Target Nodes)</span>
          {activeTab === 'config' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-400 rounded-full" />}
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('terminal'); }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition-all relative ${
            activeTab === 'terminal' ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Terminal size={16} />
          <span>Developer Terminal & Status</span>
          {activeTab === 'terminal' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-400 rounded-full" />}
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('override'); }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition-all relative ${
            activeTab === 'override' ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database size={16} />
          <span>จัดการสิทธิ์ผู้ใช้ (Global Override)</span>
          {activeTab === 'override' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-400 rounded-full" />}
        </button>
      </div>

      {/* TAB 1: SENSA CONFIGURATION PANEL */}
      {activeTab === 'config' && target && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Left Column (4 cols): Target Nodes List */}
          <div className="workspace-panel lg:col-span-4 p-4 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <span>จุดฝึกทั้งหมด</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-sky-700 font-mono">
                  {draftNodes.length}
                </span>
              </h3>

              <button
                onClick={handleAddNewNode}
                className="jelly-button jelly-button-icon p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/40 text-xs flex items-center space-x-1"
                title="เพิ่มจุดฝึกใหม่"
              >
                <Plus size={15} />
                <span>เพิ่มจุด</span>
              </button>
            </div>

            {/* Grouped by Region */}
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {(['upper', 'middle', 'lower']).map(r => (
                <div key={r} className="space-y-1.5">
                  <span className="text-[10px] font-bold text-sky-700/80 font-mono uppercase tracking-wider block">
                    {regionInfo[r]?.name}
                  </span>

                  {draftNodes.filter(n => n.region === r).map(n => {
                    const isSelected = n.id === target.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => { sound.playClick(); setSelectedNodeId(n.id); }}
                        className={`workspace-choice w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border border-amber-500/50 text-slate-900 font-semibold'
                            : 'bg-emerald-50 hover:bg-emerald-50 text-slate-700 border border-emerald-200'
                        }`}
                      >
                        <div>
                          <div>{n.name}</div>
                          <small className="text-[10px] text-slate-500 font-mono">{n.english}</small>
                        </div>
                        <span className="text-[10px] text-sky-700 font-mono">{n.seconds}s</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (8 cols): Editor Form */}
          <div className="workspace-panel lg:col-span-8 p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-4">
            
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Settings2 size={18} className="text-amber-700" />
                <span>กำหนดคุณสมบัติจุดเป้าหมาย</span>
              </h3>

              <button
                onClick={() => {
                  sound.playWarning();
                  setDraftNodes(d => d.filter(n => n.id !== target.id));
                  const remainingNodes = draftNodes.filter(n => n.id !== target.id);
                  if (remainingNodes.length > 0) setSelectedNodeId(remainingNodes[0].id);
                }}
                disabled={draftNodes.length <= 1}
                className="jelly-button jelly-button-secondary jelly-button-icon p-1.5 rounded-lg text-slate-500 hover:text-red-700 transition-colors disabled:opacity-40"
                title="ลบจุดนี้"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ชื่อภาษาไทย</label>
                  <input
                    type="text"
                    value={target.name}
                    onChange={(e) => editTarget({ name: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ชื่อภาษาอังกฤษ</label>
                  <input
                    type="text"
                    value={target.english}
                    onChange={(e) => editTarget({ english: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">กล้ามเนื้อที่โฟกัส (Muscle)</label>
                  <input
                    type="text"
                    value={target.muscle || ''}
                    onChange={(e) => editTarget({ muscle: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900"
                    placeholder="เช่น กล้ามเนื้อสองข้างของแนวกระดูกคอ"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">คำแนะนำและเทคนิคการนวด (Technique Guide)</label>
                  <input
                    type="text"
                    value={target.techniqueGuide || ''}
                    onChange={(e) => editTarget({ techniqueGuide: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900"
                    placeholder="เช่น คลึงเบา ๆ เป็นวงเล็ก ไม่กดกระดูกคอ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">หมวดร่างกาย</label>
                  <select
                    value={target.region}
                    onChange={(e) => editTarget({ region: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900"
                  >
                    <option value="upper">ร่างกายท่อนบน (Upper)</option>
                    <option value="middle">ร่างกายท่อนกลาง (Middle)</option>
                    <option value="lower">ร่างกายท่อนล่าง (Lower)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ทิศทางการนวด</label>
                  <select
                    value={target.motion}
                    onChange={(e) => editTarget({ motion: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900"
                  >
                    <option value="circular">คลึงวนตามเข็มนาฬิกา (Circular Clockwise)</option>
                    <option value="vertical">ลูบตามแนวยาว (Longitudinal Stroke)</option>
                    <option value="pulse">กดจุดเป็นจังหวะ (Pulsing)</option>
                  </select>
                </div>
              </div>

              {/* Sliders: Seconds & Radius */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">เวลาต่อจุด (Seconds)</span>
                    <span className="text-amber-700 font-mono font-bold">{target.seconds} วินาที</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={target.seconds}
                    onChange={(e) => editTarget({ seconds: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">รัศมีสัมผัส Hitbox (Radius)</span>
                    <span className="text-amber-700 font-mono font-bold">{Math.round((target.radius || 0.048) * 1000)} / 1000</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={Math.round((target.radius || 0.048) * 1000)}
                    onChange={(e) => editTarget({ radius: Number(e.target.value) / 1000 })}
                    className="w-full accent-amber-500"
                  />
                  <small className="text-[10px] text-slate-500 block">
                    รัศมีเล็ก = ระดับยากขึ้น · อ้างอิงตามสัดส่วนความกว้างของหน้าจอ
                  </small>
                </div>
              </div>

              {/* MediaPipe Pose Landmarks Interpolation */}
              <div className="border-t border-emerald-200 pt-4 space-y-3">
                <h4 className="font-bold text-sky-700">ตำแหน่งอ้างอิง MediaPipe Pose Landmarks (0–32)</h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Landmark A (0–32)</label>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={target.a ?? 11}
                      onChange={(e) => editTarget({ a: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Landmark B (0–32)</label>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={target.b ?? 12}
                      onChange={(e) => editTarget({ b: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">สัดส่วน A–B (t: 0-1)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={target.t ?? 0.5}
                      onChange={(e) => editTarget({ t: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">ชดเชยแกน X (ox: -0.15 ถึง 0.15)</label>
                    <input
                      type="number"
                      min="-0.15"
                      max="0.15"
                      step="0.005"
                      value={target.ox ?? 0}
                      onChange={(e) => editTarget({ ox: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">ชดเชยแกน Y (oy: -0.15 ถึง 0.15)</label>
                    <input
                      type="number"
                      min="-0.15"
                      max="0.15"
                      step="0.005"
                      value={target.oy ?? 0}
                      onChange={(e) => editTarget({ oy: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSaveNodes}
                  className="jelly-button py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center space-x-2 transition-all"
                >
                  <Save size={15} />
                  <span>บันทึกการตั้งค่าจุดฝึก</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setDraftNodes(defaultNodes);
                    setSelectedNodeId(defaultNodes[0].id);
                  }}
                  className="jelly-button jelly-button-secondary text-slate-500 hover:text-slate-900 text-xs underline underline-offset-2"
                >
                  คืนค่าเริ่มต้น (Default Nodes)
                </button>
              </div>

              {notice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-600/40 text-sky-700 text-xs flex items-center space-x-2">
                  <CheckCircle2 size={16} />
                  <span>{notice}</span>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: TERMINAL UI & STATUS */}
      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="workspace-panel lg:col-span-8 p-4 rounded-2xl bg-white border border-emerald-200 font-mono text-xs shadow-2xl flex flex-col h-[480px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-slate-500 mb-2">
              <span className="flex items-center space-x-2">
                <Terminal size={14} className="text-amber-700" />
                <span>sensa-shell: ~root</span>
              </span>
              <span className="text-[10px] text-slate-500">Node v24 / WASM</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
              {cliHistory.map((h, i) => (
                <div key={i} className={`whitespace-pre-wrap ${
                  h.type === 'input' ? 'text-cyan-700 font-bold' :
                  h.type === 'system' ? 'text-amber-700' :
                  h.type === 'success' ? 'text-sky-700' :
                  h.type === 'error' ? 'text-red-700' : 'text-slate-700'
                }`}>
                  {h.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleCliCommand} className="pt-2 border-t border-slate-200 flex items-center space-x-2">
              <span className="text-amber-700 font-bold">$</span>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder="status, nodes, users, help..."
                className="flex-1 bg-transparent border-none text-slate-900 focus:outline-none text-xs font-mono"
              />
            </form>
          </div>

          <div className="workspace-panel lg:col-span-4 p-5 rounded-2xl bg-white border border-emerald-200 space-y-4 text-xs font-mono">
            <div className="text-xs font-bold text-sky-700 border-b border-emerald-200 pb-2 flex items-center justify-between">
              <span>SYSTEM ENVIRONMENT</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-2 text-slate-700">
              <div><span className="text-slate-500">workspace:</span> SENSA Thai Wellness Lab</div>
              <div><span className="text-slate-500">tracking:</span> MediaPipe Pose Lite + Hand Landmarker</div>
              <div><span className="text-slate-500">targets:</span> {draftNodes.length} nodes configured</div>
              <div><span className="text-slate-500">privacy:</span> Camera processed locally on-device</div>
              <div><span className="text-slate-500">feedback:</span> Clinical Rule Engine + Gemini API</div>
            </div>

            <div className="pt-4 border-t border-emerald-200">
              <button
                onClick={() => setResetModal(true)}
                className="jelly-button jelly-button-danger w-full py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-700 border border-red-800/50 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
              >
                <RotateCcw size={14} />
                <span>รีเซ็ตประวัติการฝึกทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL OVERRIDE */}
      {activeTab === 'override' && (
        <div className="workspace-panel p-6 rounded-3xl bg-white border border-emerald-200 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">จัดการสิทธิ์สมาชิกทั้งหมด (Global Override)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Super Admin สามารถปรับเปลี่ยนบทบาทและควบคุมสิทธิ์ของทุกคนในระบบ</p>
            </div>
            
            <div className="flex items-center space-x-3 self-end sm:self-auto">
              <span className="text-xs text-slate-500 font-mono">{users.length} บัญชี</span>
              <button
                onClick={() => { sound.playClick(); setShowProvisionModal(true); }}
                className="jelly-button py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
              >
                <UserPlus size={14} />
                <span>+ เพิ่ม Super Admin โดยตรง</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-emerald-200 text-slate-500">
                  <th className="py-2.5 px-3">ชื่อ</th>
                  <th className="py-2.5 px-3">อีเมล</th>
                  <th className="py-2.5 px-3">บทบาท</th>
                  <th className="py-2.5 px-3">เปลี่ยนสิทธิ์</th>
                  <th className="py-2.5 px-3 text-right">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-emerald-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === 'admin' ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-500/30' :
                        u.role === 'super' || u.role === 'super_admin' ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30' :
                        'bg-emerald-500/20 text-sky-700 border border-emerald-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role === 'super' ? 'super_admin' : u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                        className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="user">User (ผู้เรียน)</option>
                        <option value="admin">Admin (ผู้สอน)</option>
                        <option value="super_admin">Super Admin (ผู้ดูแลระบบ)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => deleteUser(u.id)}
                        disabled={u.id === currentUser?.id}
                        className="jelly-button jelly-button-secondary p-1 rounded text-slate-500 hover:text-red-700 disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPER ADMIN DIRECT PROVISION MODAL (Requirement 1.3) */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="workspace-panel max-w-md w-full bg-white border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
                <ShieldCheck size={18} />
                <span>แต่งตั้ง / เพิ่ม Super Admin โดยตรง</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 font-mono">
                DIRECT PROVISION
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              สิทธิ์ Super Admin ไม่สามารถสมัครผ่านหน้าเว็บได้ ต้องได้รับการเพิ่มโดยตรงจาก Super Admin ปัจจุบันเท่านั้น
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!provisionForm.name || !provisionForm.email) return;
                sound.playNodeComplete();
                provisionSuperAdmin(provisionForm);
                setShowProvisionModal(false);
                setProvisionForm({ name: '', email: '', phone: '', password: '' });
                setNotice('✓ เพิ่มสิทธิ์ Super Admin ให้กับ ' + provisionForm.name + ' สำเร็จแล้ว');
                setTimeout(() => setNotice(''), 3500);
              }}
              className="space-y-3 pt-1 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-medium mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  placeholder="ดร. ธีรภัทร เทคโนโลยี"
                  value={provisionForm.name}
                  onChange={(e) => setProvisionForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">อีเมล *</label>
                <input
                  type="email"
                  required
                  placeholder="superadmin2@wellness.com"
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    placeholder="089-111-2222"
                    value={provisionForm.phone}
                    onChange={(e) => setProvisionForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">รหัสผ่านเริ่มต้น</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="jelly-button jelly-button-secondary px-4 py-2 rounded-xl bg-emerald-50 text-slate-700 hover:text-slate-900 border border-emerald-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="jelly-button px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  ยืนยันการเพิ่ม Super Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="workspace-panel max-w-md w-full bg-white border border-red-600/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">ยืนยันการล้างประวัติการฝึกทั้งหมด</h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              ประวัติและคะแนนการฝึกของทุกคนจะถูกลบถาวร พิมพ์คำว่า <b>RESET</b> เพื่อยืนยัน
            </p>

            <input
              type="text"
              value={confirmResetText}
              onChange={(e) => setConfirmResetText(e.target.value)}
              placeholder="RESET"
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-slate-900 font-mono text-xs"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => { setResetModal(false); setConfirmResetText(''); }}
                className="jelly-button jelly-button-secondary px-4 py-2 rounded-xl bg-emerald-50 text-slate-700 text-xs"
              >
                ยกเลิก
              </button>

              <button
                disabled={confirmResetText !== 'RESET'}
                onClick={() => {
                  sound.playWarning();
                  resetDatabase();
                  setResetModal(false);
                  setConfirmResetText('');
                }}
                className="jelly-button jelly-button-danger px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs disabled:opacity-40"
              >
                ยืนยันล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
