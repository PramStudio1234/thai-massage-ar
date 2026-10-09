import React, { useState } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import Navbar from './components/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Welcome from './components/Welcome';
import welcomeBackground from '../รูป/รูปเริ่มต้น.jpg';
import workspaceBackground from '../รูป/ภาพพื้นหลัง01.png';
import './Workspace.css';
import './JellyButton.css';
import './components/Auth/Auth.css';
import UserDashboard from './components/User/UserDashboard';
import ARSimulator from './components/User/ARSimulator';
import PostSessionModal from './components/User/PostSessionModal';
import AdminDashboard from './components/Admin/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';

function MainLayout() {
  const { currentUser, categories, targetNodes, saveSession } = usePlatform();

  // Navigation states: 'dashboard', 'simulator', 'auth_login', 'auth_register'
  const [view, setView] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [hasStarted, setHasStarted] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [finishedSessionData, setFinishedSessionData] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const [isSimulatingUser, setIsSimulatingUser] = useState(false);

  // Reset simulation state if user logs out or switches role
  React.useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setIsSimulatingUser(false);
    }
  }, [currentUser]);

  // If user is not authenticated, show Login/Register view
  if (!currentUser) {
    if (!hasStarted) {
      return <Welcome onStart={() => { setAuthMode('login'); setHasStarted(true); }} />;
    }
    return (
      <div className="auth-screen">
        <div 
          className="auth-bg" 
          style={{ backgroundImage: `url("${welcomeBackground}")` }} 
          aria-hidden="true" 
        />
        <button type="button" className="auth-home" onClick={() => setHasStarted(false)}>
          ← กลับหน้าแรก
        </button>
        <main className="auth-main">
          {authMode === 'login' ? (
            <Login 
              onSwitchToRegister={() => setAuthMode('register')} 
              onLoginSuccess={(role) => setView('dashboard')} 
            />
          ) : (
            <Register 
              onSwitchToLogin={() => setAuthMode('login')} 
            />
          )}
        </main>
        <footer className="auth-footer">
          Klay Klaai AR Training Platform © 2026 • Digital Health & Medicine AI Lab
        </footer>
      </div>
    );
  }

  // Handle Starting a Training Session from Dashboard
  const handleStartSession = (category) => {
    setActiveCategory(category);
    setView('simulator');
  };

  // Handle Session Completion with Immediate Auto-save
  const handleFinishSession = (sessionResults) => {
    const res = sessionResults?.result || sessionResults?.scores || {};
    const autoSession = saveSession({
      ...res,
      category: activeCategory?.region || res.region || 'upper',
      categoryNameTh: activeCategory?.nameTh || res.part || 'บทเรียน',
      part: activeCategory?.part || res.part || 'บทเรียน',
      mode: activeCategory?.mode || res.mode || 'camera',
      directionScore: res.accuracy,
      continuityScore: res.continuity,
      speedScore: res.efficiency,
      totalScore: res.totalScore ?? res.score,
      duration: res.duration,
      feedback: res.feedback || 'การฝึกเสร็จสิ้นเรียบร้อย',
      aiFeedback: res.feedback || 'การฝึกเสร็จสิ้นเรียบร้อย'
    });

    setFinishedSessionData({
      ...sessionResults,
      savedSessionId: autoSession?.id
    });
    setShowPostModal(true);
  };

  return (
    <div className="workspace-shell min-h-screen flex flex-col justify-between text-slate-700"
      style={{ '--workspace-background': `url("${workspaceBackground}")` }}>
      
      {/* Universal Top Navigation Header */}
      <Navbar 
        onNavigate={(target) => {
          if (target === 'dashboard') setView('dashboard');
          if (target === 'simulator') {
            if (!activeCategory || !activeCategory.nodes) {
              const defaultRegionNodes = targetNodes ? targetNodes.filter(n => n.region === 'upper') : [];
              const partNodes = defaultRegionNodes.filter(n => n.name === 'บ่า 2 ข้าง');
              setActiveCategory({
                region: 'upper',
                part: 'บ่า 2 ข้าง',
                mode: 'camera',
                nameTh: 'ร่างกายท่อนบน',
                nameEn: 'Upper Body',
                nodes: partNodes.length > 0 ? partNodes : defaultRegionNodes
              });
            }
            setView('simulator');
          }
        }} 
        currentTab={view} 
      />

      {/* Main Dynamic Viewport Based on Role and Active Screen */}
      <main className="flex-1">
        
        {/* VIEW 1: AR MASSAGE SIMULATOR */}
        {view === 'simulator' && (
          <ARSimulator
            category={activeCategory}
            onBackToDashboard={() => setView('dashboard')}
            onFinishSession={handleFinishSession}
          />
        )}

        {/* VIEW 2: ROLE-BASED DASHBOARDS */}
        {view === 'dashboard' && (
          <>
            {/* 1. USER ROLE: Student Welcome & Body Section Selector */}
            {currentUser.role === 'user' && (
              <UserDashboard
                onStartSession={handleStartSession}
              />
            )}

            {/* 2. ADMIN ROLE: Instructor Approval, User Analytics & Simulation Mode */}
            {currentUser.role === 'admin' && (
              isSimulatingUser ? (
                <div className="space-y-2">
                  {/* Floating Notification Banner for Admin in Simulation Mode */}
                  <div data-simulation-banner className="bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 border-b border-amber-500/50 px-4 py-3 backdrop-blur-md sticky top-0 z-30 shadow-xl">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2.5 text-amber-700 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span>โหมดจำลองมุมมองผู้เรียน (Student Simulation View) — แสดงหน้าจอจริง การเลือกจุดนวด และระบบฝึกแบบที่ผู้เรียนเจอ 100%</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsSimulatingUser(false);
                        }}
                        className="jelly-button jelly-button-secondary px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 hover:text-slate-900 border border-amber-400/50 font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 shrink-0"
                      >
                        <span>✕ ออกจากโหมดจำลอง (กลับหน้าแดชบอร์ดอาจารย์)</span>
                      </button>
                    </div>
                  </div>

                  {/* The actual User Experience that student sees */}
                  <UserDashboard
                    onStartSession={handleStartSession}
                  />
                </div>
              ) : (
                <AdminDashboard
                  onSimulateAsUser={() => {
                    setIsSimulatingUser(true);
                  }}
                />
              )
            )}

            {/* 3. SUPER ADMIN ROLE: Terminal UI, Module Target Nodes & MediaPipe Hitbox Tuning */}
            {(currentUser.role === 'super_admin' || currentUser.role === 'super') && (
              <SuperAdminDashboard />
            )}
          </>
        )}

      </main>

      {/* 2.5 POST-SESSION AI EVALUATION MODAL */}
      {showPostModal && (
        <PostSessionModal
          sessionData={finishedSessionData}
          onClose={() => {
            setShowPostModal(false);
            setView('dashboard');
          }}
          onRetry={() => {
            setShowPostModal(false);
            setView('simulator');
          }}
        />
      )}

      {/* Global Footer (shown on dashboard views) */}
      {view !== 'simulator' && (
        <footer className="py-4 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sky-700 font-bold">NuadThai AR</span>
              <span>— ระบบฝึกทักษะนวดแผนไทยอัจฉริยะ (Thai Massage Digital Health & Wellness)</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>MediaPipe Pose & Hands Tracking</span>
              <span>•</span>
              <span>Infrared Thermal AR Filter</span>
              <span>•</span>
              <span className="text-sky-700 font-semibold">Ready for Evaluation</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}

export default function App() {
  return (
    <PlatformProvider>
      <MainLayout />
    </PlatformProvider>
  );
}
