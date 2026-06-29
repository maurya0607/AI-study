import React, { useState, useEffect } from 'react';
import supabase, { isSupabaseConfigured } from './services/supabaseClient';
import Auth from './views/Auth';
import Dashboard from './views/Dashboard';
import Documents from './views/Documents';
import Notes from './views/Notes';
import Quizzes from './views/Quizzes';
import Doubts from './views/Doubts';
import Planner from './views/Planner';
import Flashcards from './views/Flashcards';
import Profile from './views/Profile';
import './App.css';

import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Brain, 
  MessageSquare, 
  Calendar, 
  LogOut, 
  Sparkles,
  User,
  Layers,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeDocId, setActiveDocId] = useState('');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
        setView('dashboard');
        setActiveDocId('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div className="loading-spinner" style={styles.spinner}></div>
        <p style={styles.loaderText}>Loading AI Study Workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="app-container">
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`sidebar-panel glass-panel ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoCircle}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h2 style={styles.sidebarBrand}>StudyAssistant</h2>
            <span style={styles.sidebarBrandSub}>AI Learning Suite</span>
          </div>
        </div>

        <nav style={styles.navMenu}>
          <button 
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'dashboard' ? styles.navBtnActive : {})
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => { setView('materials'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'materials' ? styles.navBtnActive : {})
            }}
          >
            <FileText size={18} />
            <span>Study Materials</span>
          </button>

          <button 
            onClick={() => { setView('notes'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'notes' ? styles.navBtnActive : {})
            }}
          >
            <BookOpen size={18} />
            <span>AI Notes</span>
          </button>

          <button 
            onClick={() => { setView('quizzes'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'quizzes' ? styles.navBtnActive : {})
            }}
          >
            <Brain size={18} />
            <span>Practice Quizzes</span>
          </button>

          <button 
            onClick={() => { setView('doubts'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'doubts' ? styles.navBtnActive : {})
            }}
          >
            <MessageSquare size={18} />
            <span>Doubt Solver</span>
          </button>

          <button 
            onClick={() => { setView('planner'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'planner' ? styles.navBtnActive : {})
            }}
          >
            <Calendar size={18} />
            <span>Study Planner</span>
          </button>

          <button 
            onClick={() => { setView('flashcards'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'flashcards' ? styles.navBtnActive : {})
            }}
          >
            <Layers size={18} />
            <span>Flashcards</span>
          </button>

          <button 
            onClick={() => { setView('profile'); setIsSidebarOpen(false); }} 
            style={{
              ...styles.navBtn,
              ...(view === 'profile' ? styles.navBtnActive : {})
            }}
          >
            <User size={18} />
            <span>Profile & Settings</span>
          </button>
        </nav>

        {/* User Status Bar */}
        <div style={styles.sidebarFooter}>
          <div 
            style={{ ...styles.userSection, cursor: 'pointer' }} 
            onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
            title="View Profile Settings"
          >
            <div style={styles.userAvatar}>
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={16} color="hsl(var(--text-muted))" />
              )}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user.name || user.email.split('@')[0]}</div>
              <div style={styles.userEmail} title={user.email}>{user.email}</div>
            </div>
          </div>

          <div style={styles.themeToggleRow}>
            <span style={styles.themeToggleLabel}>Appearance</span>
            <button 
              onClick={toggleTheme} 
              style={styles.themeToggleBtnSidebar}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} color="#eab308" />
                  <span style={{ fontSize: '0.8rem' }}>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={14} color="#3b82f6" />
                  <span style={{ fontSize: '0.8rem' }}>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div style={styles.headerTitle}>
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>Workspace</span>
            <span style={styles.breadcrumbDivider}>/</span>
            <span style={styles.activeBreadcrumb}>
              {view === 'dashboard' && 'Dashboard'}
              {view === 'materials' && 'Study Materials'}
              {view === 'notes' && 'AI Notes'}
              {view === 'quizzes' && 'Practice Quizzes'}
              {view === 'doubts' && 'Doubt Solver'}
              {view === 'planner' && 'Study Planner'}
              {view === 'flashcards' && 'Flashcards'}
              {view === 'profile' && 'Profile & Settings'}
            </span>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.statusChip}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isSupabaseConfigured ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                marginRight: '6px'
              }}></span>
              {isSupabaseConfigured ? 'Database Online' : 'Local Sandbox Mode'}
            </div>
          </div>
        </header>

        <div className="viewport">
          {view === 'dashboard' && (
            <Dashboard 
              user={user} 
              setView={setView} 
              setActiveDocId={setActiveDocId} 
            />
          )}
          {view === 'materials' && (
            <Documents 
              user={user} 
              setView={setView} 
              setActiveDocId={setActiveDocId} 
            />
          )}
          {view === 'notes' && (
            <Notes 
              user={user} 
              activeDocId={activeDocId} 
            />
          )}
          {view === 'quizzes' && (
            <Quizzes 
              user={user} 
              activeDocId={activeDocId} 
            />
          )}
          {view === 'doubts' && (
            <Doubts 
              user={user} 
              activeDocId={activeDocId} 
            />
          )}
          {view === 'planner' && (
            <Planner 
              user={user} 
            />
          )}
          {view === 'flashcards' && (
            <Flashcards
              user={user}
              activeDocId={activeDocId}
            />
          )}
          {view === 'profile' && (
            <Profile 
              user={user} 
              onProfileUpdate={(updatedUser) => setUser(updatedUser)} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  loaderContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'hsl(var(--bg-dark))',
    gap: '16px'
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderWidth: '3px',
    borderTopColor: '#a78bfa'
  },
  loaderText: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.95rem'
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
    padding: '0 8px'
  },
  logoCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #ec4899 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sidebarBrand: {
    fontSize: '1rem',
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
    lineHeight: 1
  },
  sidebarBrandSub: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))'
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'none',
    color: 'hsl(var(--text-muted))',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'left',
    transition: 'all var(--transition-fast)'
  },
  navBtnActive: {
    background: 'rgba(124, 58, 237, 0.1)',
    color: '#a78bfa',
    fontWeight: '600'
  },
  sidebarFooter: {
    borderTop: '1px solid hsl(var(--border-glass))',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 6px'
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid hsl(var(--border-glass))'
  },
  userDetails: {
    flex: 1,
    overflow: 'hidden'
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'hsl(var(--text-main))',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  userEmail: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-dark))',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.04)',
    color: 'hsl(var(--error))',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all var(--transition-fast)'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'hsl(var(--text-dark))'
  },
  breadcrumbDivider: {
    color: 'hsl(var(--border-glass))'
  },
  activeBreadcrumb: {
    color: 'hsl(var(--text-main))',
    fontWeight: '600'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusChip: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid hsl(var(--border-glass))',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: '500'
  },
  themeToggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 6px',
    marginTop: '4px',
    marginBottom: '4px'
  },
  themeToggleLabel: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'hsl(var(--text-muted))'
  },
  themeToggleBtnSidebar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid hsl(var(--border-glass))',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'hsl(var(--text-main))',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)'
  }
};
