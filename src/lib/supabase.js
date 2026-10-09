import { createClient } from '@supabase/supabase-js';

let rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// ปรับแต่ง URL อัตโนมัติ: ตัด /rest/v1/ หรือ slash ต่อท้ายออก เพื่อให้ต่อ Supabase สำเร็จเสมอ
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('your-project-id')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// Database Helper Services (Online Supabase)
// ==========================================

export async function dbFetchUsers() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map(u => ({
      ...u,
      studentId: u.student_id || u.studentId,
      student_id: u.student_id || u.studentId,
      joinedDate: u.joined_date || u.joinedDate,
      joined_date: u.joined_date || u.joinedDate
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch users:', err.message);
    return null;
  }
}

export async function dbFetchPendingApplicants() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('pending_applicants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map(a => ({
      ...a,
      requestedRole: a.requested_role || a.requestedRole,
      requested_role: a.requested_role || a.requestedRole,
      appliedDate: a.applied_date || a.appliedDate,
      applied_date: a.applied_date || a.appliedDate
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch pending applicants:', err.message);
    return null;
  }
}

export async function dbFetchSessions(userId = null) {
  if (!supabase) return null;
  try {
    let query = supabase
      .from('training_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // Map snake_case to both camelCase and snake_case so all UI components work seamlessly!
    return data.map(row => ({
      ...row,
      id: row.id,
      userId: row.user_id,
      user_id: row.user_id,
      userName: row.user_name,
      user_name: row.user_name,
      studentName: row.student_name || row.user_name,
      student_name: row.student_name || row.user_name,
      totalScore: Number(row.total_score ?? 0),
      score: Number(row.total_score ?? 0),
      continuityScore: Number(row.continuity_score ?? 0),
      continuity: Number(row.continuity_score ?? 0),
      directionScore: Number(row.direction_score ?? 0),
      accuracy: Number(row.direction_score ?? 0),
      speedScore: Number(row.speed_score ?? 0),
      efficiency: Number(row.speed_score ?? 0),
      category: row.category,
      categoryNameTh: row.category_name_th || 'ร่างกายท่อนบน',
      category_name_th: row.category_name_th || 'ร่างกายท่อนบน',
      duration: Math.round(Number(row.duration ?? 0)),
      part: row.part,
      mode: row.mode || 'camera',
      feedback: row.feedback || row.ai_feedback || '',
      aiFeedback: row.ai_feedback || row.feedback || '',
      clinicalInsights: row.clinical_insights || {},
      nodeResults: row.node_results || [],
      handFocusCount: row.hand_focus_count || 1,
      completedAt: row.completed_at || (row.created_at ? new Date(row.created_at).toISOString().replace('T', ' ').slice(0, 16) : '')
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch sessions:', err.message);
    return null;
  }
}

export async function dbInsertUser(user) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      role: user.role || 'user',
      status: user.status || 'active',
      student_id: user.studentId || user.student_id,
      title: user.title,
      avatar: user.avatar,
      password: user.password || '123456',
      joined_date: user.joinedDate || user.joined_date || new Date().toISOString().slice(0, 10)
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to insert user:', err.message);
    return false;
  }
}

export async function dbInsertPendingApplicant(applicant) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('pending_applicants').insert({
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      dob: applicant.dob,
      password: applicant.password || '123456',
      requested_role: applicant.requestedRole || applicant.requested_role || 'user',
      applied_date: applicant.appliedDate || applicant.applied_date,
      note: applicant.note || ''
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to insert pending applicant:', err.message);
    return false;
  }
}

export async function dbRemovePendingApplicant(applicantId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('pending_applicants')
      .delete()
      .eq('id', applicantId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to delete pending applicant:', err.message);
    return false;
  }
}

export async function dbSaveSession(session) {
  if (!supabase) return false;
  try {
    const payload = {
      id: String(session.id || `ses_${Date.now()}`),
      user_id: String(session.userId || session.user_id || 'usr_anonymous'),
      user_name: String(session.userName || session.user_name || session.studentName || 'ผู้เรียน'),
      student_name: String(session.studentName || session.userName || 'ผู้เรียน'),
      category: String(session.category || 'upper'),
      category_name_th: String(session.categoryNameTh || session.category_name_th || 'ร่างกายท่อนบน'),
      part: String(session.part || 'บทเรียน'),
      mode: String(session.mode || 'camera'),
      total_score: Math.round(Number(session.totalScore ?? session.score ?? 0)),
      continuity_score: Math.round(Number(session.continuityScore ?? session.continuity ?? 0)),
      direction_score: Math.round(Number(session.directionScore ?? session.accuracy ?? 0)),
      speed_score: Math.round(Number(session.speedScore ?? session.efficiency ?? 0)),
      duration: Math.round(Number(session.duration ?? 0)),
      feedback: String(session.feedback || session.aiFeedback || ''),
      ai_feedback: String(session.aiFeedback || session.feedback || ''),
      clinical_insights: session.clinicalInsights || {},
      node_results: session.nodeResults || [],
      hand_focus_count: Math.round(Number(session.handFocusCount || 1)),
      completed_at: String(session.completedAt || new Date().toISOString().replace('T', ' ').slice(0, 16))
    };
    const { error } = await supabase.from('training_sessions').upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to save session:', err.message);
    return false;
  }
}

export async function dbUpdateUserRole(userId, newRole) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to update user role:', err.message);
    return false;
  }
}

export async function dbDeleteUser(userId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] Failed to delete user:', err.message);
    return false;
  }
}
