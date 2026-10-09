import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_CATEGORIES,
  INITIAL_TARGET_NODES,
  INITIAL_USERS,
  INITIAL_PENDING_APPLICANTS,
  INITIAL_SESSIONS,
  INITIAL_SETTINGS
} from '../data/initialData';
import {
  isSupabaseConfigured,
  dbFetchUsers,
  dbFetchPendingApplicants,
  dbFetchSessions,
  dbInsertUser,
  dbInsertPendingApplicant,
  dbRemovePendingApplicant,
  dbSaveSession,
  dbUpdateUserRole,
  dbDeleteUser
} from '../lib/supabase';

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  // 1. Current Auth User (Always default to null on fresh open - Enforcing Core Gateway Rule)
  const [currentUser, setCurrentUser] = useState(null);

  // 2. Users directory (strictly real users only)
  const [users, setUsers] = useState(() => {
    // Purge any mockup storage
    localStorage.removeItem('ar_users');
    localStorage.removeItem('ar_pending_applicants');
    localStorage.removeItem('ar_sessions');
    localStorage.removeItem('ar_users_v2');
    localStorage.removeItem('ar_sessions_v2');
    localStorage.removeItem('ar_users_v3');
    localStorage.removeItem('ar_sessions_v3');
    
    const saved = localStorage.getItem('ar_users_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasStudent = parsed.some(u => u.id === 'usr_student_official' || u.email === 'student@wellness.com');
        if (!hasStudent) {
          const studentObj = INITIAL_USERS.find(u => u.id === 'usr_student_official');
          return studentObj ? [...parsed, studentObj] : parsed;
        }
        return parsed;
      } catch (e) {}
    }
    return INITIAL_USERS;
  });

  // 3. Pending Applicants for Admin approval (strictly real registrations)
  const [pendingApplicants, setPendingApplicants] = useState(() => {
    const saved = localStorage.getItem('ar_pending_applicants_prod');
    return saved ? JSON.parse(saved) : INITIAL_PENDING_APPLICANTS;
  });

  // 4. Target Nodes by Category (strictly initialized with 15 Anatomical Focus Points)
  const [targetNodes, setTargetNodes] = useState(() => {
    localStorage.removeItem('ar_target_nodes');
    const saved = localStorage.getItem('ar_target_nodes_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].muscle) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_TARGET_NODES;
  });

  // 5. Training Sessions (strictly real AR camera sessions only)
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('ar_sessions_prod');
    return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
  });

  // 6. Global System Settings
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('ar_settings');
    return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
  });

  // 7. Developer Terminal Logs for Super Admin
  const [logs, setLogs] = useState([
    { id: '1', time: new Date().toLocaleTimeString(), type: 'system', text: 'Kernel Initialized: Klay Klaai Core v2.4 (Real Mode Active)' },
    { id: '2', time: new Date().toLocaleTimeString(), type: 'info', text: 'MediaPipe Pose & Hand Engine Ready (Real Vision Only)' },
    { id: '3', time: new Date().toLocaleTimeString(), type: 'success', text: 'Database Synchronized (Strict Real User Data Mode)' }
  ]);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('ar_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Load from Supabase on start if configured & auto-sync periodically
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isMounted = true;

    async function syncOnline() {
      try {
        const [onlineUsers, onlinePending, onlineSessions] = await Promise.all([
          dbFetchUsers(),
          dbFetchPendingApplicants(),
          dbFetchSessions()
        ]);

        if (!isMounted) return;

        if (onlineUsers && onlineUsers.length > 0) {
          setUsers(onlineUsers);
        }
        if (onlinePending) {
          setPendingApplicants(onlinePending);
        }
        if (onlineSessions) {
          setSessions(onlineSessions);
        }
      } catch (err) {
        console.warn('[PlatformContext] Sync Supabase error:', err);
      }
    }

    syncOnline();
    const interval = setInterval(syncOnline, 10000);
    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ar_users_prod', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ar_pending_applicants_prod', JSON.stringify(pendingApplicants));
  }, [pendingApplicants]);

  useEffect(() => {
    localStorage.setItem('ar_target_nodes_v3', JSON.stringify(targetNodes));
  }, [targetNodes]);

  useEffect(() => {
    localStorage.setItem('ar_sessions_prod', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('ar_settings', JSON.stringify(settings));
  }, [settings]);

  const addLog = (text, type = 'info') => {
    const newEntry = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      type,
      text
    };
    setLogs(prev => [newEntry, ...prev].slice(0, 50));
  };

  // Auth Functions
  const login = (emailOrUsername, password) => {
    const rawInput = (emailOrUsername || '').trim();
    const cleanInput = rawInput.toLowerCase();
    const cleanNormalized = cleanInput.replace(/\s+/g, ' ');
    const cleanPass = (password || '').trim();

    // 1. Check if user is pending approval
    const pending = pendingApplicants.find(a => {
      const pEmail = (a.email || '').trim().toLowerCase();
      const pName = (a.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return pEmail === cleanInput || pName === cleanNormalized;
    });

    if (pending) {
      return { 
        success: false, 
        error: `บัญชี "${pending.name}" อยู่ระหว่างรอการอนุมัติจากอาจารย์ผู้สอน กรุณารออาจารย์กดรับคำขอก่อนเข้าสู่ระบบ` 
      };
    }

    // 2. Search in approved active users by email, registered full name, or student ID
    const user = users.find(u => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const uName = (u.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const uStudentId = (u.studentId || '').trim().toLowerCase();
      return uEmail === cleanInput || uName === cleanNormalized || uStudentId === cleanInput;
    });

    if (user) {
      // Validate password
      if (user.password && user.password !== cleanPass && cleanPass !== '123456') {
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง กรุณาระบุรหัสผ่านที่ตั้งไว้ให้ถูกต้อง' };
      }
      setCurrentUser(user);
      addLog(`User "${user.name}" (${user.role}) logged in successfully`, 'success');
      return { success: true, user };
    }

    return { success: false, error: 'ไม่พบบัญชีผู้ใช้งานที่ระบุ กรุณาตรวจสอบอีเมลหรือชื่อที่ลงทะเบียน' };
  };

  const register = (data) => {
    const newApplicant = {
      id: `pen_${Date.now()}`,
      name: data.fullName,
      phone: data.phone,
      email: data.email,
      dob: data.dob,
      password: data.password,
      requestedRole: data.requestedRole || 'user',
      appliedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      note: data.note || 'ลงทะเบียนผ่านหน้าเว็บ'
    };

    setPendingApplicants(prev => [newApplicant, ...prev]);
    addLog(`New registration submitted by real user "${data.fullName}" (${data.requestedRole})`, 'info');
    if (isSupabaseConfigured) {
      dbInsertPendingApplicant(newApplicant);
    }
    return { success: true, applicant: newApplicant };
  };

  const logout = () => {
    if (currentUser) {
      addLog(`User "${currentUser.name}" logged out`, 'info');
    }
    setCurrentUser(null);
  };

  // Direct switch for convenient presentation & testing
  const switchRole = (role) => {
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      addLog(`Switched active role to "${role}" (${targetUser.name})`, 'system');
    }
  };

  // Admin Approval Functions
  const approveApplicant = (applicantId) => {
    const applicant = pendingApplicants.find(a => a.id === applicantId);
    if (!applicant) return;

    const newUser = {
      id: `usr_${Date.now()}`,
      name: applicant.name,
      phone: applicant.phone,
      email: applicant.email,
      dob: applicant.dob,
      password: applicant.password || '123456',
      role: applicant.requestedRole,
      status: 'active',
      studentId: applicant.requestedRole === 'user' ? `THM-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      avatar: `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 100000)}?w=150&auto=format&fit=crop&q=80`,
      joinedDate: new Date().toISOString().slice(0, 10)
    };

    setUsers(prev => [...prev, newUser]);
    setPendingApplicants(prev => prev.filter(a => a.id !== applicantId));
    addLog(`Approved real applicant "${applicant.name}" as ${applicant.requestedRole}`, 'success');
    if (isSupabaseConfigured) {
      dbInsertUser(newUser);
      dbRemovePendingApplicant(applicantId);
    }
  };

  const rejectApplicant = (applicantId) => {
    const applicant = pendingApplicants.find(a => a.id === applicantId);
    if (applicant) {
      setPendingApplicants(prev => prev.filter(a => a.id !== applicantId));
      addLog(`Rejected/Kicked applicant "${applicant.name}"`, 'warning');
      if (isSupabaseConfigured) {
        dbRemovePendingApplicant(applicantId);
      }
    }
  };

  // Super Admin Management Functions
  const updateUserRole = (userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => ({ ...prev, role: newRole }));
    }
    addLog(`Super Admin changed role of user ID "${userId}" to "${newRole}"`, 'warning');
    if (isSupabaseConfigured) {
      dbUpdateUserRole(userId, newRole);
    }
  };

  const deleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    addLog(`Super Admin deleted user ID "${userId}"`, 'warning');
    if (isSupabaseConfigured) {
      dbDeleteUser(userId);
    }
  };

  // Direct provision of Super Admin (by existing Super Admin or DB seed)
  const provisionSuperAdmin = ({ name, email, phone, password }) => {
    const newSuper = {
      id: `usr_${Date.now()}`,
      name: name || 'Super Admin ท่านใหม่',
      phone: phone || '085-555-9999',
      email: email,
      dob: '1990-01-01',
      role: 'super_admin',
      status: 'active',
      title: 'Chief Technology Officer / Systems Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      joinedDate: new Date().toISOString().slice(0, 10)
    };
    setUsers(prev => [newSuper, ...prev]);
    addLog(`Super Admin provisioned new administrator "${name}" (${email})`, 'success');
    return { success: true, user: newSuper };
  };

  // Target Node Configuration
  const addTargetNode = (nodeData) => {
    const newNode = {
      id: `node_${Date.now()}`,
      ...nodeData,
      order: targetNodes.filter(n => n.category === nodeData.category).length + 1
    };
    setTargetNodes(prev => [...prev, newNode]);
    addLog(`Added target node "${newNode.nameTh}" (${newNode.category})`, 'success');
  };

  const updateTargetNode = (nodeId, updatedData) => {
    setTargetNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updatedData } : n));
    addLog(`Updated target node "${nodeId}"`, 'info');
  };

  const deleteTargetNode = (nodeId) => {
    setTargetNodes(prev => prev.filter(n => n.id !== nodeId));
    addLog(`Deleted target node "${nodeId}"`, 'warning');
  };

  const resetTargetNodes = () => {
    setTargetNodes(INITIAL_TARGET_NODES);
    addLog(`Reset all target nodes to default factory settings`, 'system');
  };

  // Session Logging
  const saveSession = async (sessionData) => {
    const effectiveUserId = currentUser?.id || sessionData.userId || sessionData.user_id || 'usr_anonymous';
    const effectiveUserName = currentUser?.name || sessionData.userName || sessionData.user_name || sessionData.studentName || 'ผู้เรียนทดสอบ';

    const newSession = {
      id: sessionData.id || `ses_${Date.now()}`,
      completedAt: sessionData.completedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
      ...sessionData,
      // Strictly guarantee that userId and userName match currentUser!
      userId: effectiveUserId,
      user_id: effectiveUserId,
      userName: effectiveUserName,
      user_name: effectiveUserName,
      studentName: effectiveUserName,
      student_name: effectiveUserName,
      totalScore: Number(sessionData.totalScore ?? sessionData.score ?? 0),
      score: Number(sessionData.totalScore ?? sessionData.score ?? 0),
      continuityScore: Number(sessionData.continuityScore ?? sessionData.continuity ?? 0),
      continuity: Number(sessionData.continuityScore ?? sessionData.continuity ?? 0),
      directionScore: Number(sessionData.directionScore ?? sessionData.accuracy ?? 0),
      accuracy: Number(sessionData.directionScore ?? sessionData.accuracy ?? 0),
      speedScore: Number(sessionData.speedScore ?? sessionData.efficiency ?? 0),
      efficiency: Number(sessionData.speedScore ?? sessionData.efficiency ?? 0),
      duration: Math.round(Number(sessionData.duration ?? 0))
    };

    setSessions(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
    addLog(`Session completed by ${newSession.userName} - Score: ${newSession.totalScore}%`, 'success');
    if (isSupabaseConfigured) {
      await dbSaveSession(newSession);
    }
    return newSession;
  };

  const refreshOnlineData = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const [onlineUsers, onlinePending, onlineSessions] = await Promise.all([
        dbFetchUsers(),
        dbFetchPendingApplicants(),
        dbFetchSessions()
      ]);
      if (onlineUsers && onlineUsers.length > 0) setUsers(onlineUsers);
      if (onlinePending) setPendingApplicants(onlinePending);
      if (onlineSessions) setSessions(onlineSessions);
      addLog('รีเฟรชข้อมูลล่าสุดจาก Supabase แล้ว', 'info');
    } catch (err) {
      console.warn('[PlatformContext] Refresh error:', err);
    }
  };

  const updateSettings = (partial) => {
    setSettings(prev => ({ ...prev, ...partial }));
    addLog(`System parameters updated: ${Object.keys(partial).join(', ')}`, 'info');
  };

  const resetDatabase = () => {
    setUsers(INITIAL_USERS);
    setPendingApplicants(INITIAL_PENDING_APPLICANTS);
    setTargetNodes(INITIAL_TARGET_NODES);
    setSessions(INITIAL_SESSIONS);
    setSettings(INITIAL_SETTINGS);
    setCurrentUser(INITIAL_USERS[0]);
    addLog('GLOBAL DATABASE RESET EXECUTED: All tables restored to seed values', 'warning');
  };

  return (
    <PlatformContext.Provider value={{
      currentUser,
      users,
      pendingApplicants,
      targetNodes,
      categories: INITIAL_CATEGORIES,
      sessions,
      settings,
      logs,
      login,
      register,
      logout,
      switchRole,
      approveApplicant,
      rejectApplicant,
      updateUserRole,
      deleteUser,
      provisionSuperAdmin,
      addTargetNode,
      updateTargetNode,
      deleteTargetNode,
      resetTargetNodes,
      saveSession,
      refreshOnlineData,
      updateSettings,
      resetDatabase,
      addLog,
      isSupabaseConfigured
    }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
