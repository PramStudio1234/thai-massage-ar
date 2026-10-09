import { defaultNodes } from '../lib/domain';

export const INITIAL_CATEGORIES = [
  {
    id: 'upper',
    nameTh: 'ร่างกายท่อนบน',
    nameEn: 'Upper Body',
    description: 'ครอบคลุม 4 จุดโฟกัส: คอด้านหลัง, บ่า 2 ข้าง, ขมับ 2 ข้าง และฐานกะโหลก บรรเทาออฟฟิศซินโดรม',
    icon: 'Brain',
    color: 'emerald',
    badge: '4 จุดโฟกัส',
    totalNodes: 8,
  },
  {
    id: 'middle',
    nameTh: 'ร่างกายท่อนกลาง',
    nameEn: 'Middle Body',
    description: 'ครอบคลุม 4 จุดโฟกัส: ต้นแขนด้านหน้า, ต้นแขนด้านหลัง, แขนท่อนล่างด้านฝ่ามือ และแขนท่อนล่างด้านหลังมือ',
    icon: 'Activity',
    color: 'cyan',
    badge: '4 จุดโฟกัส',
    totalNodes: 8,
  },
  {
    id: 'lower',
    nameTh: 'ร่างกายท่อนล่าง',
    nameEn: 'Lower Body',
    description: 'ครอบคลุม 7 จุดโฟกัส: ต้นขาด้านหน้า, ต้นขาด้านหลัง, ต้นขาด้านข้าง, เข่า, น่อง, หน้าแข้ง และฝ่าเท้า',
    icon: 'Footprints',
    color: 'amber',
    badge: '7 จุดโฟกัส',
    totalNodes: 14,
  }
];

export const INITIAL_TARGET_NODES = defaultNodes;

export const INITIAL_USERS = [
  {
    id: 'usr_admin_root',
    name: 'ดร. นภาพร ประเสริฐเวช (Instructor)',
    phone: '089-876-5432',
    email: 'admin@wellness.com',
    dob: '1984-11-20',
    role: 'admin',
    status: 'active',
    title: 'ผู้เชี่ยวชาญศาสตร์การนวดแผนไทย / อาจารย์ผู้ประเมิน',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    joinedDate: '2026-08-01'
  },
  {
    id: 'usr_super_root',
    name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    phone: '085-555-9999',
    email: 'superadmin@wellness.com',
    dob: '1990-03-15',
    role: 'super_admin',
    status: 'active',
    title: 'Chief Technology Officer / AR Systems Lead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    joinedDate: '2026-07-15'
  },
  {
    id: 'usr_student_official',
    name: 'พิมพ์ชนก สุขสมบูรณ์ (ผู้เรียน)',
    phone: '081-234-5678',
    email: 'student@wellness.com',
    dob: '1998-05-12',
    role: 'user',
    status: 'active',
    title: 'นักศึกษาหลักสูตรการแพทย์แผนไทยประยุกต์',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    joinedDate: '2026-09-01'
  }
];

export const INITIAL_PENDING_APPLICANTS = [];

export const INITIAL_SESSIONS = [];

export const INITIAL_SETTINGS = {
  hitboxRadius: 55, // pixels
  sensitivity: 1.0,
  defaultDurationSec: 15,
  infraredShaderActive: false,
  geminiApiKey: '',
  virtualHandMode: false, // For testing without webcam
  soundEnabled: true,
};
