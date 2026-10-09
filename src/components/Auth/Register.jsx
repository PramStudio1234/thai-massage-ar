import React, { useState } from 'react';
import appLogo from '../../../รูป/โลโก้.png';
import { usePlatform } from '../../context/PlatformContext';
import { sound } from '../../utils/audio';
import { User, Phone, Mail, Calendar, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import AuthField from './AuthField';

export default function Register({ onSwitchToLogin }) {
  const { register } = usePlatform();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    requestedRole: 'user', // 'user' or 'admin'
    password: '',
    confirmPassword: ''
  });

  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Real-time password matching logic
  const isConfirmFilled = formData.confirmPassword.length > 0;
  const isPasswordMismatch = isConfirmFilled && (formData.password !== formData.confirmPassword);
  const isPasswordMatch = isConfirmFilled && (formData.password === formData.confirmPassword);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setGeneralError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sound.playClick();

    if (!formData.fullName || !formData.phone || !formData.email || !formData.dob || !formData.password) {
      setGeneralError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      sound.playWarning();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setGeneralError('รหัสผ่านไม่ตรงกัน กรุณาระบุให้ถูกต้อง');
      sound.playWarning();
      return;
    }

    const res = register(formData);
    if (res.success) {
      sound.playNodeComplete();
      setSubmittedSuccess(true);
    } else {
      setGeneralError(res.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
      sound.playWarning();
    }
  };

  if (submittedSuccess) {
    return (
      <div className="form form-register auth-success" role="status">
        <CheckCircle2 size={48} />
        <h2>ลงทะเบียนเรียบร้อยแล้ว!</h2>
        <p>คำขอของคุณได้รับการบันทึกเข้าสู่ระบบเรียบร้อยแล้ว<br />
          {formData.requestedRole === 'admin'
            ? 'คำขอเป็น Admin อยู่ระหว่างรอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ'
            : 'คุณสามารถเข้าสู่ระบบเพื่อเริ่มการฝึกปฏิบัติได้ทันที'}
        </p>
        <button type="button" className="button1" onClick={() => { sound.playClick(); onSwitchToLogin(); }}>ไปที่หน้าเข้าสู่ระบบ</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form form-register" aria-labelledby="register-heading">
      <div className="flex flex-col items-center justify-center pt-4 pb-1">
        <img src={appLogo} alt="Klay Klaai Logo" className="w-12 h-12 object-contain drop-shadow mb-1" />
        <span className="text-lg font-bold text-white tracking-wide">Klay Klaai</span>
        <h2 id="register-heading" className="text-xs text-slate-300 mt-0.5 font-medium">ลงทะเบียนสมาชิกใหม่</h2>
      </div>
      <p className="auth-description">ระบบฝึกทักษะการนวดแผนไทยด้วยเทคโนโลยี AR</p>
      {generalError && <div className="auth-message" role="alert"><AlertCircle size={16} /><span>{generalError}</span></div>}
      <AuthField label="ชื่อ-นามสกุล *" icon={User} name="fullName" type="text" autoComplete="name"
        value={formData.fullName} onChange={handleChange} placeholder="นาย สมชาย รักสุขภาพ" required />
      <div className="auth-grid">
        <AuthField label="เบอร์โทรศัพท์ *" icon={Phone} name="phone" type="tel" autoComplete="tel"
          value={formData.phone} onChange={handleChange} placeholder="081-234-5678" required />
        <AuthField label="อีเมล *" icon={Mail} name="email" type="email" autoComplete="email"
          value={formData.email} onChange={handleChange} placeholder="user@example.com" required />
      </div>
      <AuthField label="วันเดือนปีเกิด *" icon={Calendar} name="dob" type="date" autoComplete="bday"
        value={formData.dob} onChange={handleChange} required />
      <fieldset className="auth-roles">
        <legend>เลือกสิทธิ์การใช้งาน (Role Selection) *</legend>
        <div className="auth-role-options">
          <label className="auth-role">
            <input type="radio" name="requestedRole" value="user" checked={formData.requestedRole === 'user'} onChange={handleChange} />
            <span>User (ผู้ใช้งานทั่วไป)</span>
          </label>
          <label className="auth-role">
            <input type="radio" name="requestedRole" value="admin" checked={formData.requestedRole === 'admin'} onChange={handleChange} />
            <span>Admin (ผู้สอน)</span>
          </label>
        </div>
        {formData.requestedRole === 'admin' && <p className="auth-role-note">* ต้องได้รับการอนุมัติเพื่อเป็นแอดมิน</p>}
      </fieldset>
      <div className="auth-grid">
        <AuthField label="รหัสผ่าน *" icon={Lock} name="password" type="password" autoComplete="new-password"
          value={formData.password} onChange={handleChange} placeholder="••••••••" required />
        <AuthField label="ยืนยันรหัสผ่าน *" icon={Lock} name="confirmPassword" type="password" autoComplete="new-password"
          value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required invalid={isPasswordMismatch}
          aria-describedby={isConfirmFilled ? 'password-match-status' : undefined} />
      </div>
      {isPasswordMismatch && <div id="password-match-status" className="auth-message" role="status"><AlertCircle size={15} /><span>รหัสผ่านไม่ตรงกัน กรุณาระบุให้ถูกต้อง</span></div>}
      {isPasswordMatch && <div id="password-match-status" className="auth-message auth-message-success" role="status"><CheckCircle2 size={15} /><span>รหัสผ่านตรงกันถูกต้อง</span></div>}
      <div className="btn">
        <button type="submit" disabled={isPasswordMismatch} className="button1">ยืนยันการลงทะเบียน</button>
        <button type="button" className="button2" onClick={() => { sound.playClick(); onSwitchToLogin(); }}>เข้าสู่ระบบ</button>
      </div>
      <p className="auth-switch-hint">มีบัญชีอยู่แล้ว? เลือกเข้าสู่ระบบ</p>
    </form>
  );
}
