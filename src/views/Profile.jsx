import React, { useState, useEffect } from 'react';
import supabase, { isSupabaseConfigured } from '../services/supabaseClient';
import { getAiStatus, getPreferredProvider, setPreferredProvider } from '../services/aiService';
import {
  User, Mail, Phone, Calendar, Shield, Flame, Brain,
  FileText, Check, ShieldCheck, Copy, Zap, Cpu,
  Settings, Activity, ChevronRight, Star, Lock
} from 'lucide-react';

export default function Profile({ user, onProfileUpdate }) {
  const [name, setName] = useState(user?.user_metadata?.name || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || user?.user_metadata?.phone || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [stats, setStats] = useState({ docs: 0, quizzes: 0, streak: 1 });
  const [aiStatus, setAiStatus] = useState({ gemini: false, groq: false });
  const [preferredProvider, setPreferredProviderState] = useState(getPreferredProvider());
  const [providerSaved, setProviderSaved] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: docs } = await supabase.from('documents').select('id');
        const { data: quizzes } = await supabase.from('quizzes').select('id');
        let streak = 1;
        try {
          const { data: profile } = await supabase
            .from('user_profiles').select('streak_days')
            .eq('user_id', user.id).single();
          if (profile) streak = profile.streak_days;
        } catch (_) {}
        setStats({ docs: docs?.length || 0, quizzes: quizzes?.length || 0, streak: streak || 1 });
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      }
    }
    loadStats();
    getAiStatus().then(status => setAiStatus(status));
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.updateUser({ data: { name } });
        if (error) throw error;
        if (data.user) onProfileUpdate(data.user);
      } else {
        const mockSessionUser = JSON.parse(localStorage.getItem('mock_session_user') || '{}');
        mockSessionUser.name = name;
        localStorage.setItem('mock_session_user', JSON.stringify(mockSessionUser));
        const mockSession = JSON.parse(localStorage.getItem('mock_session') || '{}');
        if (mockSession.user) { mockSession.user.name = name; localStorage.setItem('mock_session', JSON.stringify(mockSession)); }
        const mockUsers = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
        localStorage.setItem('mock_db_users', JSON.stringify(mockUsers.map(u => u.id === user.id ? { ...u, name } : u)));
        onProfileUpdate({ ...user, name });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Update profile error:', err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProviderChange = (newProvider) => {
    setPreferredProvider(newProvider);
    setPreferredProviderState(newProvider);
    setProviderSaved(true);
    setTimeout(() => setProviderSaved(false), 2500);
  };

  const getInitials = () => {
    if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return user.email.slice(0, 2).toUpperCase();
  };

  const providerType = user.app_metadata?.provider || (user.id?.startsWith('google-') ? 'google' : 'email');
  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Sandbox Session';

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={15} /> },
    { id: 'ai', label: 'AI Models', icon: <Cpu size={15} /> },
    { id: 'security', label: 'Security', icon: <Shield size={15} /> },
  ];

  return (
    <div style={S.page} className="animate-fade-in">

      {/* ─── HERO BANNER ─── */}
      <div style={S.heroBanner}>
        <div style={S.heroBg} />
        <div style={S.heroInner} className="profile-hero-inner">
          {/* Avatar */}
          <div style={S.avatarRing}>
            <div style={S.avatarGlow} />
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" style={S.avatarImg} referrerPolicy="no-referrer" />
            ) : (
              <div style={S.avatarFallback}>{getInitials()}</div>
            )}
            <div style={S.onlineDot} />
          </div>

          {/* Hero text */}
          <div style={S.heroText}>
            <div style={S.heroNameRow} className="profile-hero-name-row">
              <h1 style={S.heroName}>{name || 'Scholar'}</h1>
              <span style={{
                ...S.providerPill,
                background: providerType === 'google' ? 'linear-gradient(90deg,#4285f4,#34a853)' : 'linear-gradient(90deg,#7c3aed,#ec4899)'
              }}>
                {providerType === 'google' ? ' Google' : ' Email'}
              </span>
            </div>
            <p style={S.heroEmail}>{user.email}</p>
          </div>

          {/* Stats row */}
          <div style={S.heroStats} className="profile-hero-stats">
            {[
              { icon: <Flame size={16} color="#f97316" />, value: `${stats.streak}d`, label: 'Streak' },
              { icon: <FileText size={16} color="#a78bfa" />, value: stats.docs, label: 'Docs' },
              { icon: <Brain size={16} color="#38bdf8" />, value: stats.quizzes, label: 'Quizzes' },
              { icon: <Star size={16} color="#fbbf24" />, value: 'Pro', label: 'Plan' },
            ].map((s, i) => (
              <div key={i} style={S.heroStat}>
                <div style={S.heroStatIcon}>{s.icon}</div>
                <span style={S.heroStatVal}>{s.value}</span>
                <span style={S.heroStatLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div style={S.tabBar}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}
          >
            {t.icon}
            {t.label}
            {activeTab === t.id && <div style={S.tabUnderline} />}
          </button>
        ))}
      </div>

      {/* ─── CONTENT ─── */}
      <div style={S.contentArea}>

        {/* ════════════════ PROFILE TAB ════════════════ */}
        {activeTab === 'profile' && (
          <div style={S.twoCol} className="profile-two-col">
            {/* Left: Info card */}
            <div style={S.infoCard} className="glass-card">
              <div style={S.cardHeader}>
                <div style={S.cardHeaderIcon}><User size={16} color="#a78bfa" /></div>
                <span style={S.cardHeaderTitle}>Identity</span>
              </div>

              {[
                { label: 'Display Name', value: name || '—', icon: <User size={13} /> },
                { label: 'Email Address', value: user.email, icon: <Mail size={13} /> },
                { label: 'Member Since', value: createdDate, icon: <Calendar size={13} /> },
                { label: 'Auth Provider', value: providerType.charAt(0).toUpperCase() + providerType.slice(1), icon: <Shield size={13} /> },
              ].map((item, i) => (
                <div key={i} style={S.infoRow}>
                  <span style={S.infoLabel}>{item.icon} {item.label}</span>
                  <span style={S.infoValue}>{item.value}</span>
                </div>
              ))}

              <div style={S.activityBar}>
                <div style={S.activityBarHeader}>
                  <Activity size={13} color="#a78bfa" />
                  <span>Learning Activity</span>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <div style={{ ...S.activityGrid, minWidth: '240px' }}>
                    {Array.from({ length: 28 }).map((_, i) => {
                      const intensity = Math.random();
                      return (
                        <div key={i} style={{
                          ...S.activityCell,
                          background: intensity > 0.75
                            ? 'hsl(263 70% 52%)'
                            : intensity > 0.5
                            ? 'rgba(124,58,237,0.5)'
                            : intensity > 0.25
                            ? 'rgba(124,58,237,0.25)'
                            : 'rgba(255,255,255,0.04)'
                        }} title={`${Math.floor(intensity * 5)} sessions`} />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Edit form */}
            <div style={S.formCard} className="glass-card">
              <div style={S.cardHeader}>
                <div style={S.cardHeaderIcon}><Settings size={16} color="#a78bfa" /></div>
                <span style={S.cardHeaderTitle}>Update Profile</span>
              </div>

              <form onSubmit={handleUpdateProfile} style={S.form}>
                {/* Name */}
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Display Name</label>
                  <div style={S.fieldWrap}>
                    <User size={16} style={S.fieldIcon} />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="input-field"
                      style={S.fieldInput}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Email Address</label>
                  <div style={S.fieldWrap}>
                    <Mail size={16} style={S.fieldIcon} />
                    <input
                      type="email"
                      value={user.email}
                      className="input-field"
                      style={{ ...S.fieldInput, ...S.fieldDisabled }}
                      disabled
                    />
                    <div style={S.fieldLockBadge}><Lock size={11} /> Read-only</div>
                  </div>
                </div>

                {/* Phone */}
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Phone <span style={S.optionalBadge}>Optional</span></label>
                  <div style={S.fieldWrap}>
                    <Phone size={16} style={S.fieldIcon} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="input-field"
                      style={S.fieldInput}
                    />
                  </div>
                </div>

                <div style={S.formFooter}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={S.saveBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        Saving...
                      </>
                    ) : (
                      <><ShieldCheck size={16} /> Save Changes</>
                    )}
                  </button>

                  {success && (
                    <div style={S.successPill}>
                      <Check size={13} />
                      Saved successfully!
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════════════ AI MODELS TAB ════════════════ */}
        {activeTab === 'ai' && (
          <div style={S.aiWrap}>
            {/* Status strip */}
            <div style={S.statusStrip}>
              <div style={S.statusStripLeft}>
                <Cpu size={18} color="#a78bfa" />
                <div>
                  <p style={S.statusStripTitle}>AI Engine Status</p>
                  <p style={S.statusStripSub}>Live backend connectivity check</p>
                </div>
              </div>
              <div style={S.statusPills}>
                {[
                  { name: 'Gemini', key: 'gemini', onColor: '#34d399', offColor: '#f87171', pill: '#34d399' },
                  { name: 'Groq', key: 'groq', onColor: '#60a5fa', offColor: '#f87171', pill: '#60a5fa' },
                ].map(p => (
                  <div key={p.key} style={{
                    ...S.statusPill,
                    background: aiStatus[p.key] ? `rgba(${p.key === 'gemini' ? '52,211,153' : '96,165,250'},0.12)` : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${aiStatus[p.key] ? (p.key === 'gemini' ? 'rgba(52,211,153,0.3)' : 'rgba(96,165,250,0.3)') : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    <span style={{
                      ...S.statusDot,
                      background: aiStatus[p.key] ? (p.key === 'gemini' ? '#34d399' : '#60a5fa') : '#f87171',
                      boxShadow: aiStatus[p.key] ? `0 0 6px ${p.key === 'gemini' ? '#34d399' : '#60a5fa'}` : 'none',
                    }} />
                    <span style={{ color: aiStatus[p.key] ? (p.key === 'gemini' ? '#34d399' : '#60a5fa') : '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                      {p.name} · {aiStatus[p.key] ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider cards */}
            <p style={S.aiDesc}>
              Choose which AI model powers your Notes, Quizzes, Flashcards, and Study Planner.
              The backend auto-falls back to the other provider if your selection is offline.
            </p>

            <div style={S.providerGrid}>
              {[
                {
                  key: 'gemini',
                  name: 'Google Gemini',
                  model: 'gemini-1.5-flash',
                  desc: 'High-context, multi-modal Google model. Best for structured notes & detailed analysis.',
                  gradient: 'linear-gradient(135deg, #4285f4 0%, #34a853 60%, #fbbc05 100%)',
                  activeColor: '#a78bfa',
                  activeBg: 'rgba(124,58,237,0.08)',
                  icon: <Zap size={22} color="#fff" />,
                  badge: 'Recommended',
                },
                {
                  key: 'groq',
                  name: 'Groq / Llama',
                  model: 'llama-3.3-70b-versatile',
                  desc: 'Ultra-fast open-source LLM via Groq. Best for quick questions & rapid flashcard generation.',
                  gradient: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
                  activeColor: '#60a5fa',
                  activeBg: 'rgba(96,165,250,0.08)',
                  icon: <Brain size={22} color="#fff" />,
                  badge: 'Fast',
                },
              ].map(p => {
                const isActive = preferredProvider === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => handleProviderChange(p.key)}
                    style={{
                      ...S.providerCard,
                      border: `1.5px solid ${isActive ? p.activeColor : 'rgba(255,255,255,0.07)'}`,
                      background: isActive ? p.activeBg : 'rgba(255,255,255,0.015)',
                      boxShadow: isActive ? `0 0 30px -8px ${p.activeColor}55` : 'none',
                    }}
                  >
                    {/* Gradient icon */}
                    <div style={{ ...S.providerIcon, background: p.gradient }}>
                      {p.icon}
                    </div>

                    <div style={S.providerBody}>
                      <div style={S.providerNameRow}>
                        <span style={S.providerName}>{p.name}</span>
                        <span style={{
                          ...S.providerBadge,
                          background: p.key === 'gemini' ? 'rgba(124,58,237,0.15)' : 'rgba(249,115,22,0.15)',
                          color: p.key === 'gemini' ? '#c084fc' : '#fdba74',
                        }}>{p.badge}</span>
                      </div>
                      <code style={S.providerModel}>{p.model}</code>
                      <p style={S.providerDesc}>{p.desc}</p>
                    </div>

                    <div style={{ ...S.providerCheck, opacity: isActive ? 1 : 0 }}>
                      <Check size={14} color={p.activeColor} />
                    </div>
                  </button>
                );
              })}
            </div>

            {providerSaved && (
              <div style={S.providerToast}>
                <ShieldCheck size={16} color="#34d399" />
                <span>
                  Preference saved! AI features now using{' '}
                  <strong>{preferredProvider === 'gemini' ? 'Google Gemini' : 'Groq Llama'}</strong>.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ SECURITY TAB ════════════════ */}
        {activeTab === 'security' && (
          <div style={S.securityWrap}>
            <div style={S.securityGrid}>
              {/* UID */}
              <div style={S.secCard} className="glass-card">
                <div style={S.secCardIcon}><Shield size={18} color="#a78bfa" /></div>
                <div style={S.secCardBody}>
                  <p style={S.secCardLabel}>User UID</p>
                  <div style={S.uidRow}>
                    <code style={S.uidCode}>{user.id}</code>
                    <button onClick={handleCopyUid} style={S.copyBtn} title="Copy UID">
                      {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    </button>
                  </div>
                  {copied && <span style={S.copiedBadge}>Copied!</span>}
                </div>
              </div>

              {/* Session */}
              <div style={S.secCard} className="glass-card">
                <div style={S.secCardIcon}><Calendar size={18} color="#38bdf8" /></div>
                <div style={S.secCardBody}>
                  <p style={S.secCardLabel}>Member Since</p>
                  <p style={S.secCardVal}>{createdDate}</p>
                </div>
              </div>

              {/* Provider */}
              <div style={S.secCard} className="glass-card">
                <div style={S.secCardIcon}><Lock size={18} color="#f97316" /></div>
                <div style={S.secCardBody}>
                  <p style={S.secCardLabel}>Authentication</p>
                  <p style={S.secCardVal}>{providerType === 'google' ? 'Google OAuth 2.0' : 'Email & Password'}</p>
                </div>
              </div>

              {/* DB Status */}
              <div style={S.secCard} className="glass-card">
                <div style={{
                  ...S.secCardIcon,
                  background: isSupabaseConfigured ? 'rgba(52,211,153,0.1)' : 'rgba(249,115,22,0.1)'
                }}>
                  <Activity size={18} color={isSupabaseConfigured ? '#34d399' : '#f97316'} />
                </div>
                <div style={S.secCardBody}>
                  <p style={S.secCardLabel}>Database</p>
                  <p style={{ ...S.secCardVal, color: isSupabaseConfigured ? '#34d399' : '#f97316' }}>
                    {isSupabaseConfigured ? '● Supabase Connected' : '● Local Sandbox Mode'}
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions list */}
            <div style={S.permissionsCard} className="glass-card">
              <div style={S.cardHeader}>
                <div style={S.cardHeaderIcon}><ShieldCheck size={16} color="#34d399" /></div>
                <span style={S.cardHeaderTitle}>Account Permissions</span>
              </div>
              {[
                { label: 'Upload Study Materials', granted: true },
                { label: 'Generate AI Content', granted: true },
                { label: 'Access Quiz History', granted: true },
                { label: 'Sync Across Devices', granted: isSupabaseConfigured },
                { label: 'Admin Dashboard Access', granted: false },
              ].map((p, i) => (
                <div key={i} style={S.permRow}>
                  <span style={S.permLabel}><ChevronRight size={13} style={{ opacity: 0.4 }} /> {p.label}</span>
                  <span style={{ ...S.permStatus, color: p.granted ? '#34d399' : '#f87171' }}>
                    {p.granted ? <Check size={13} /> : '✕'}
                    {p.granted ? 'Granted' : 'Restricted'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Styles                                                      */
/* ─────────────────────────────────────────────────────────── */
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    minHeight: '100%',
  },

  /* ── Hero banner ── */
  heroBanner: {
    position: 'relative',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: '6px',
    padding: '40px 36px 36px',
  },
  heroBg: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(236,72,153,0.12) 50%, rgba(56,189,248,0.1) 100%)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 'var(--radius-lg)',
  },
  heroInner: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
    flexWrap: 'wrap',
  },
  avatarRing: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarGlow: {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '50%',
    background: 'conic-gradient(from 0deg, #7c3aed, #ec4899, #38bdf8, #7c3aed)',
    filter: 'blur(3px)',
    opacity: 0.7,
    animation: 'profile-spin 4s linear infinite',
  },
  avatarImg: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid rgba(255,255,255,0.12)',
    position: 'relative',
    zIndex: 1,
  },
  avatarFallback: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '2rem',
    fontWeight: '800',
    border: '3px solid rgba(255,255,255,0.12)',
    position: 'relative',
    zIndex: 1,
    letterSpacing: '-0.05em',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#34d399',
    border: '2.5px solid hsl(var(--bg-dark))',
    zIndex: 2,
    boxShadow: '0 0 8px #34d399',
  },
  heroText: {
    flex: 1,
    minWidth: '200px',
  },
  heroNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  heroName: {
    fontSize: '1.75rem',
    fontWeight: '800',
    background: 'var(--hero-name-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
  },
  providerPill: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#fff',
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.03em',
  },
  heroEmail: {
    fontSize: '0.88rem',
    color: 'hsl(var(--text-muted))',
    fontFamily: 'monospace',
  },
  heroStats: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginLeft: 'auto',
  },
  heroStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '10px 18px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid hsl(var(--border-glass))',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    minWidth: '62px',
  },
  heroStatIcon: { display: 'flex' },
  heroStatVal: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'hsl(var(--text-main))',
    lineHeight: 1,
  },
  heroStatLabel: {
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },

  /* ── Tabs ── */
  tabBar: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '0 4px',
    marginBottom: '28px',
  },
  tab: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    color: 'hsl(var(--text-dark))',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'color 0.2s',
    borderRadius: '8px 8px 0 0',
  },
  tabActive: {
    color: '#a78bfa',
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: '-1px',
    left: '10%',
    right: '10%',
    height: '2px',
    background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
    borderRadius: '2px 2px 0 0',
  },

  /* ── Content ── */
  contentArea: {
    flex: 1,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.6fr',
    gap: '24px',
    alignItems: 'start',
  },

  /* ── Card base ── */
  infoCard: {
    padding: '24px',
  },
  formCard: {
    padding: '28px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    paddingBottom: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  cardHeaderIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(124,58,237,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'hsl(var(--text-main))',
  },

  /* ── Info rows ── */
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    gap: '8px',
  },
  infoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: 'hsl(var(--text-dark))',
    fontWeight: '500',
    minWidth: '110px',
  },
  infoValue: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: '500',
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '160px',
  },

  /* ── Activity bar ── */
  activityBar: {
    marginTop: '20px',
    padding: '14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '10px',
  },
  activityBarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'hsl(var(--text-dark))',
    fontWeight: '600',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(14, 1fr)',
    gap: '3px',
  },
  activityCell: {
    height: '10px',
    borderRadius: '2px',
    cursor: 'default',
    transition: 'transform 0.1s',
  },

  /* ── Form ── */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'hsl(var(--text-muted))',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  optionalBadge: {
    fontSize: '0.68rem',
    fontWeight: '600',
    color: 'hsl(var(--text-dark))',
    background: 'rgba(255,255,255,0.04)',
    padding: '2px 7px',
    borderRadius: '10px',
    textTransform: 'lowercase',
    letterSpacing: '0',
  },
  fieldWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: '14px',
    color: 'hsl(var(--text-dark))',
    pointerEvents: 'none',
    flexShrink: 0,
  },
  fieldInput: {
    paddingLeft: '42px',
    paddingRight: '16px',
  },
  fieldDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  fieldLockBadge: {
    position: 'absolute',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.7rem',
    color: 'hsl(var(--text-dark))',
    background: 'rgba(255,255,255,0.04)',
    padding: '2px 8px',
    borderRadius: '8px',
    pointerEvents: 'none',
  },
  formFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    paddingTop: '4px',
    flexWrap: 'wrap',
  },
  saveBtn: {
    padding: '11px 26px',
    fontSize: '0.9rem',
    gap: '7px',
  },
  successPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.84rem',
    fontWeight: '600',
    color: '#34d399',
    background: 'rgba(52,211,153,0.08)',
    border: '1px solid rgba(52,211,153,0.2)',
    padding: '8px 14px',
    borderRadius: '20px',
    animation: 'fadeIn 0.3s ease',
  },

  /* ── AI Tab ── */
  aiWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  statusStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '18px 24px',
    background: 'rgba(124,58,237,0.05)',
    border: '1px solid rgba(124,58,237,0.12)',
    borderRadius: '14px',
  },
  statusStripLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusStripTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'hsl(var(--text-main))',
  },
  statusStripSub: {
    fontSize: '0.78rem',
    color: 'hsl(var(--text-dark))',
  },
  statusPills: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '6px 14px',
    borderRadius: '20px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  aiDesc: {
    fontSize: '0.875rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.65',
    maxWidth: '620px',
  },
  providerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  providerCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '22px 20px',
    borderRadius: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    position: 'relative',
  },
  providerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  providerBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  providerNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  providerName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'hsl(var(--text-main))',
  },
  providerBadge: {
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  providerModel: {
    fontSize: '0.72rem',
    color: 'hsl(var(--text-dark))',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  providerDesc: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.5',
    marginTop: '4px',
  },
  providerCheck: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  providerToast: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    background: 'rgba(52,211,153,0.07)',
    border: '1px solid rgba(52,211,153,0.2)',
    borderRadius: '12px',
    color: '#34d399',
    fontSize: '0.875rem',
    animation: 'fadeIn 0.3s ease',
  },

  /* ── Security Tab ── */
  securityWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  securityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  secCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },
  secCardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(124,58,237,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  secCardBody: {
    flex: 1,
    overflow: 'hidden',
  },
  secCardLabel: {
    fontSize: '0.72rem',
    color: 'hsl(var(--text-dark))',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  },
  secCardVal: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: '500',
  },
  uidRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,0,0,0.2)',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  uidCode: {
    fontFamily: 'monospace',
    fontSize: '0.72rem',
    color: 'hsl(var(--text-muted))',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'hsl(var(--text-dark))',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
    transition: 'color 0.2s',
    flexShrink: 0,
  },
  copiedBadge: {
    display: 'inline-block',
    marginTop: '6px',
    fontSize: '0.72rem',
    color: '#34d399',
    fontWeight: '600',
  },

  permissionsCard: {
    padding: '24px',
  },
  permRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  permLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
  },
  permStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
};
