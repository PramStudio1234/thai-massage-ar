-- ==============================================================================
-- 🌿 Thai Massage & Wellness AR Training Platform
-- Supabase PostgreSQL Database Schema
-- วิธีใช้: นำโค้ดนี้ทั้งหมดไปวางใน Supabase Dashboard -> SQL Editor แล้วกด RUN
-- ==============================================================================

-- 1. สร้างตารางผู้ใช้งานระบบ (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  dob TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin' | 'super_admin'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  student_id TEXT,
  title TEXT,
  avatar TEXT,
  password TEXT DEFAULT '123456',
  joined_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. สร้างตารางคำขอลงทะเบียนที่รอการอนุมัติ (pending_applicants)
CREATE TABLE IF NOT EXISTS public.pending_applicants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  dob TEXT,
  password TEXT DEFAULT '123456',
  requested_role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  applied_date TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. สร้างตารางประวัติการฝึกปฏิบัติและผลประเมิน (training_sessions)
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  student_name TEXT,
  category TEXT, -- 'upper' | 'middle' | 'lower'
  category_name_th TEXT,
  part TEXT, -- เช่น 'บ่า 2 ข้าง', 'คอด้านหลัง', 'น่อง'
  mode TEXT DEFAULT 'camera', -- 'camera' | 'demo'
  total_score INTEGER NOT NULL DEFAULT 0, -- คะแนนรวม 0-100%
  continuity_score INTEGER DEFAULT 0, -- ความต่อเนื่อง 40%
  direction_score INTEGER DEFAULT 0, -- ความถูกต้องของทิศทาง 40%
  speed_score INTEGER DEFAULT 0, -- ความสม่ำเสมอของความเร็ว 20%
  duration INTEGER DEFAULT 0, -- ระยะเวลาฝึก (วินาที)
  feedback TEXT, -- คำแนะนำ AI ทางการแพทย์
  ai_feedback TEXT,
  clinical_insights JSONB DEFAULT '{}'::jsonb,
  node_results JSONB DEFAULT '[]'::jsonb,
  hand_focus_count INTEGER DEFAULT 1,
  completed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง Index เพื่อให้การ Query สถิติของผู้เรียนและแอดมินรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.training_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_category ON public.training_sessions (category);
CREATE INDEX IF NOT EXISTS idx_sessions_part ON public.training_sessions (part);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.training_sessions (created_at DESC);

-- 4. ตั้งค่าสิทธิ์ความปลอดภัย (Row Level Security - RLS) สำหรับการเชื่อมต่อผ่าน API Key
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้เว็บแอปพลิเคชัน (Anon Key) อ่านและบันทึกข้อมูลได้
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
  DROP POLICY IF EXISTS "Allow anon all on pending_applicants" ON public.pending_applicants;
  DROP POLICY IF EXISTS "Allow anon all on training_sessions" ON public.training_sessions;
END $$;

CREATE POLICY "Allow anon all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on pending_applicants" ON public.pending_applicants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on training_sessions" ON public.training_sessions FOR ALL USING (true) WITH CHECK (true);

-- 5. บันทึกข้อมูลเริ่มต้น (Seed Initial Accounts)
INSERT INTO public.users (id, name, phone, email, dob, role, status, title, joined_date, password)
VALUES 
  (
    'usr_admin_root',
    'ดร. นภาพร ประเสริฐเวช (Instructor)',
    '089-876-5432',
    'admin@wellness.com',
    '1984-11-20',
    'admin',
    'active',
    'ผู้เชี่ยวชาญศาสตร์การนวดแผนไทย / อาจารย์ผู้ประเมิน',
    '2026-08-01',
    '123456'
  ),
  (
    'usr_super_root',
    'ผู้ดูแลระบบสูงสุด (Super Admin)',
    '085-555-9999',
    'superadmin@wellness.com',
    '1990-03-15',
    'super_admin',
    'active',
    'Chief Technology Officer / AR Systems Lead',
    '2026-07-15',
    '123456'
  ),
  (
    'usr_student_official',
    'พิมพ์ชนก สุขสมบูรณ์ (ผู้เรียน)',
    '081-234-5678',
    'student@wellness.com',
    '1998-05-12',
    'user',
    'active',
    'นักศึกษาหลักสูตรการแพทย์แผนไทยประยุกต์',
    '2026-09-01',
    '123456'
  )
ON CONFLICT (email) DO NOTHING;
