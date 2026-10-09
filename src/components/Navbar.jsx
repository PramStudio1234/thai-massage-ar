import React from 'react';
import appLogo from '../../รูป/โลโก้.png';
import { usePlatform } from '../context/PlatformContext';
import { sound } from '../utils/audio';
import { 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  Cpu, 
  LogOut, 
  Volume2, 
  VolumeX, 
  Activity, 
  Layers,
  Camera
} from 'lucide-react';

export default function Navbar({ onNavigate, currentTab }) {
  const { currentUser, logout, settings, updateSettings, isSupabaseConfigured, refreshOnlineData } = usePlatform();
  const [syncing, setSyncing] = React.useState(false);

  const toggleSound = () => {
    sound.playClick();
    updateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleSync = async () => {
    if (!refreshOnlineData || syncing) return;
    sound.playClick();
    setSyncing(true);
    await refreshOnlineData();
    setTimeout(() => setSyncing(false), 1200);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'user':
        return {
          label: 'User (ผู้เรียน)',
          color: 'bg-emerald-500/20 text-sky-700 border-emerald-500/40',
          icon: UserCheck
        };
      case 'admin':
        return {
          label: 'Admin (ผู้สอน/ผู้ประเมิน)',
          color: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/40',
          icon: ShieldCheck
        };
      case 'super':
      case 'super_admin':
        return {
          label: 'Super Admin (Developer/IT)',
          color: 'bg-amber-500/20 text-amber-700 border-amber-500/40',
          icon: Cpu
        };
      default:
        return {
          label: 'Guest',
          color: 'bg-white text-slate-700 border-slate-200',
          icon: Activity
        };
    }
  };

  const currentBadge = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = currentBadge?.icon;

  return (
    <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-slate-200 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => { sound.playClick(); onNavigate('dashboard'); }}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm bg-white border border-slate-200/80 p-0.5 group-hover:scale-105 transition-transform duration-200">
            <img 
              src={appLogo} 
              alt="Klay Klaai Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base text-slate-900 tracking-tight">Klay Klaai</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-wellness-500/20 text-sky-700 font-semibold border border-wellness-500/30">
                PRO v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-tight">Digital Health & Wellness Training Platform</p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2.5">
          {/* Supabase Cloud DB Connection Indicator & Sync Trigger */}
          <button
            type="button"
            onClick={handleSync}
            title="คลิกเพื่อซิงค์ข้อมูลกับ Supabase ล่าสุดทันที"
            className={`hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isSupabaseConfigured 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? (syncing ? 'bg-cyan-500 animate-spin' : 'bg-emerald-500 animate-pulse') : 'bg-slate-400'}`} />
            <span>{isSupabaseConfigured ? (syncing ? 'กำลังซิงค์...' : 'Supabase Online ⟳') : 'Local DB'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={settings.soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
            className="jelly-button jelly-button-secondary jelly-button-icon p-1.5 rounded-lg bg-white hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
          >
            {settings.soundEnabled ? <Volume2 size={16} className="text-sky-700" /> : <VolumeX size={16} className="text-slate-500" />}
          </button>

          {currentUser ? (
            <div className="flex items-center space-x-2.5">
              {/* MediaPipe AR Quick Launch Button */}
              <button
                onClick={() => { sound.playClick(); onNavigate('simulator'); }}
                title="เปิดห้องฝึกตรวจจับท่าทางและจุดนวดด้วย MediaPipe"
                className={`jelly-button px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm ${
                  currentTab === 'simulator'
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                <Camera size={14} className={currentTab === 'simulator' ? 'text-white' : 'text-emerald-700'} />
                <span className="hidden md:inline">ห้องตรวจจับ AR (MediaPipe)</span>
                <span className="md:hidden">AR กล้อง</span>
              </button>

              {/* Role Badge */}
              {currentBadge && RoleIcon && (
                <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentBadge.color}`}>
                  <RoleIcon size={13} />
                  <span>{currentBadge.label}</span>
                </div>
              )}

              {/* User Avatar & Name */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full border border-slate-200 object-cover"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-700">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500">{currentUser.email}</div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => { sound.playClick(); logout(); }}
                title="ออกจากระบบ"
                className="jelly-button jelly-button-danger jelly-button-icon p-2 rounded-lg bg-white hover:bg-red-500/20 text-slate-500 hover:text-red-700 border border-slate-200 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { sound.playClick(); onNavigate('login'); }}
              className="jelly-button px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
