import React, { useState } from 'react';
import logo from '../../../รูป/โลโก้.png';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import AuthField from './AuthField';
import LoadingIndicator from '../LoadingIndicator';

export default function Login({ onSwitchToRegister, onLoginSuccess }) {
  const { login, isSupabaseConfigured } = usePlatform();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    sound.playClick();
    setError('');

    if (!identifier || !password) {
      setError('กรุณาระบุอีเมลหรือชื่อที่ลงทะเบียน และรหัสผ่านให้ครบถ้วน');
      sound.playWarning();
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = login(identifier, password);
      setIsLoading(false);
      if (result.success) {
        sound.playNodeComplete();
        onLoginSuccess(result.user.role);
      } else {
        setError(result.error);
        sound.playWarning();
      }
    }, 400);
  };

  return (
    <form onSubmit={handleSubmit} className="form" aria-labelledby="login-heading">
      <div className="flex flex-col items-center justify-center pt-5 pb-1">
        <img src={logo} alt="Klay Klaai Logo" className="w-14 h-14 object-contain drop-shadow mb-1.5" />
        <span className="text-xl font-extrabold text-white tracking-wide">Klay Klaai</span>
        <h2 id="login-heading" className="text-xs text-slate-300 mt-0.5 font-medium">เข้าสู่ระบบการฝึกอบรม</h2>
        <div className="mt-2">
          <span className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
            isSupabaseConfigured 
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50' 
              : 'bg-slate-800/80 text-slate-400 border-slate-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isSupabaseConfigured ? '🟢 ออนไลน์ (Supabase Cloud DB)' : '⚪ โหมดในเครื่อง (Local Storage)'}</span>
          </span>
        </div>
      </div>
      {error && (
        <div className="auth-message" role="alert">
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}
      <AuthField label="อีเมล หรือ ชื่อที่ลงทะเบียน" icon={User} name="identifier"
        type="text" autoComplete="username" value={identifier}
        onChange={(e) => setIdentifier(e.target.value)} placeholder="ระบุอีเมล หรือ ชื่อที่ลงทะเบียน" />
      <AuthField label="รหัสผ่าน" icon={Lock} name="password"
        type="password" autoComplete="current-password" value={password}
        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      <div className="btn">
        <button type="submit" disabled={isLoading} className="button1">
          {isLoading ? <><LoadingIndicator tone="white" label="กำลังเข้าสู่ระบบ" /><span>กำลังเข้าสู่ระบบ...</span></> : <><span>เข้าสู่ระบบ</span><ArrowRight size={16} /></>}
        </button>
        <button type="button" className="button2" onClick={() => { sound.playClick(); onSwitchToRegister(); }}>
          ลงทะเบียน
        </button>
      </div>
      <p className="auth-switch-hint">ยังไม่มีบัญชีผู้ใช้งาน? เลือกลงทะเบียน</p>
    </form>
  );
}
