import React, { useState, useEffect } from 'react';
import supabase, { isSupabaseConfigured } from '../services/supabaseClient';
import { analyzeWeakness } from '../services/aiService';
import { BookOpen, FileText, Brain, Calendar, HelpCircle, ArrowRight, CheckSquare, Sparkles, Layers, Flame, Award, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Dashboard({ user, setView, setActiveDocId }) {
  const [stats, setStats] = useState({ docs: 0, notes: 0, quizzes: 0, plans: 0, flashcards: 0 });
  const [profile, setProfile] = useState({ streak_days: 0, badges: [] });
  const [recentDocs, setRecentDocs] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [weaknessAnalysis, setWeaknessAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Available Badges Logic
  const ALL_BADGES = [
    { id: 'quiz_master', name: 'Quiz Master', description: 'Complete 3 quizzes', icon: <Award size={24} color="#f59e0b" />, req: (s) => s.quizzes >= 3 },
    { id: 'streak_7', name: '7 Day Streak', description: 'Study 7 days in a row', icon: <Flame size={24} color="#f97316" />, req: (s, p) => p.streak_days >= 7 },
    { id: 'flashcards_2', name: 'Flashcard Explorer', description: 'Generate 2 flashcard decks', icon: <Layers size={24} color="#3b82f6" />, req: (s) => s.flashcards >= 2 },
    { id: 'first_doc', name: 'First Step', description: 'Upload your first document', icon: <Sparkles size={24} color="#eab308" />, req: (s) => s.docs >= 1 }
  ];

  const getBadgeProgress = (badge) => {
    switch (badge.id) {
      case 'quiz_master':
        return `${stats.quizzes}/3`;
      case 'streak_7':
        return `${profile.streak_days}/7`;
      case 'flashcards_2':
        return `${stats.flashcards}/2`;
      case 'first_doc':
        return `${stats.docs}/1`;
      default:
        return '';
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      try {
        // Fetch raw stats
        const { data: docs } = await supabase.from('documents').select('id');
        const { data: notes } = await supabase.from('notes').select('id');
        const { data: quizzes } = await supabase.from('quizzes').select('id');
        const { data: plans } = await supabase.from('study_plans').select('*');
        const { data: flashcardsRecs } = await supabase.from('flashcards').select('id');
        const { data: attempts } = await supabase.from('quiz_attempts').select('*');
        
        const currentStats = {
          docs: docs?.length || 0,
          notes: notes?.length || 0,
          quizzes: quizzes?.length || 0,
          plans: plans?.length || 0,
          flashcards: flashcardsRecs?.length || 0,
        };
        setStats(currentStats);
        setQuizAttempts(attempts || []);

        // Gamification: Profile & Streaks
        const todayStr = new Date().toISOString().split('T')[0];
        let { data: userProfile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
        
        if (!userProfile) {
          // Initialize profile
          const { data: newProfile } = await supabase.from('user_profiles').insert({
            user_id: user.id,
            streak_days: 1,
            last_active_date: todayStr,
            badges: []
          }).select().single();
          userProfile = newProfile;
        }

        // Calculate active streak
        const lastActive = new Date(userProfile.last_active_date);
        const todayDate = new Date(todayStr);
        const diffDays = Math.floor((todayDate - lastActive) / (1000 * 60 * 60 * 24));
        
        let newStreak = userProfile.streak_days;
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }

        // Check for earned badges
        const earnedBadges = ALL_BADGES.filter(b => b.req(currentStats, { streak_days: newStreak })).map(b => b.id);
        
        // Update database if streak, date, or badges changed
        const needsUpdate = 
          newStreak !== userProfile.streak_days || 
          userProfile.last_active_date !== todayStr || 
          JSON.stringify(earnedBadges) !== JSON.stringify(userProfile.badges);

        if (needsUpdate) {
          await supabase.from('user_profiles').update({
            streak_days: newStreak,
            last_active_date: todayStr,
            badges: earnedBadges
          }).eq('user_id', user.id);
          
          userProfile = {
            ...userProfile,
            streak_days: newStreak,
            last_active_date: todayStr,
            badges: earnedBadges
          };
        }

        setProfile(userProfile);

        // Recent docs & plans
        const { data: recent } = await supabase
          .from('documents')
          .select('id, file_name, created_at, user_id')
          .order('created_at', { ascending: false });
        setRecentDocs(recent?.slice(0, 3) || []);

        if (plans && plans.length > 0) {
          const sorted = [...plans].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
          setActivePlan(sorted[0].plan_data);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeWeakness(quizAttempts);
      setWeaknessAnalysis(result);
    } catch (err) {
      console.error(err);
      alert("Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const navigateToDocAction = (docId, targetView) => {
    setActiveDocId(docId);
    setView(targetView);
  };

  // Calculate mock chart data based on stats
  const accuracy = quizAttempts.length > 0 
    ? Math.round((quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / quizAttempts.reduce((acc, curr) => acc + curr.total, 0)) * 100)
    : 0;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Welcome Banner */}
      <div style={styles.welcomeBanner} className="dashboard-welcome-banner">
        <div>
          <h1 style={styles.bannerTitle}>Welcome Back, {user?.name || 'Scholar'}!</h1>
          <p style={styles.bannerSubtitle}>AI Study Assistant is active and ready. What will we learn today?</p>
        </div>
        <div style={styles.streakBadge}>
          <Flame size={20} color="#f97316" />
          <span style={styles.streakText}>{profile.streak_days} Day Streak</span>
        </div>
      </div>

      {/* Gamification / Badges Row */}
      <div style={styles.badgesSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
          <h3 style={styles.sectionTitle}><Award size={18}/> Achievements</h3>
          {!isSupabaseConfigured && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={async () => {
                  const newStreak = profile.streak_days + 1;
                  const updatedBadges = ALL_BADGES.filter(b => b.req(stats, { streak_days: newStreak })).map(b => b.id);
                  await supabase.from('user_profiles').update({ streak_days: newStreak, badges: updatedBadges }).eq('user_id', user.id);
                  setProfile(prev => ({ ...prev, streak_days: newStreak, badges: updatedBadges }));
                }}
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer' }}
                title="Increment streak for testing"
              >
                🔥 +1 Day Streak
              </button>
              <button 
                onClick={async () => {
                  const newFlashcardsCount = stats.flashcards + 1;
                  await supabase.from('flashcards').insert({
                    id: crypto.randomUUID(),
                    document_id: 'mock-doc-' + crypto.randomUUID(),
                    cards: [{ front: 'Q', back: 'A' }]
                  });
                  setStats(prev => {
                    const newStats = { ...prev, flashcards: newFlashcardsCount };
                    const updatedBadges = ALL_BADGES.filter(b => b.req(newStats, { streak_days: profile.streak_days })).map(b => b.id);
                    supabase.from('user_profiles').update({ badges: updatedBadges }).eq('user_id', user.id).then(() => {
                      setProfile(prevP => ({ ...prevP, badges: updatedBadges }));
                    });
                    return newStats;
                  });
                }}
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer' }}
                title="Create a mock flashcard deck for testing"
              >
                📇 +1 Flashcard Deck
              </button>
            </div>
          )}
        </div>
        <div style={styles.badgesGrid}>
          {ALL_BADGES.map(badge => {
            const isEarned = profile.badges?.includes(badge.id);
            return (
              <div key={badge.id} style={{
                ...styles.badgeCard,
                opacity: isEarned ? 1 : 0.4,
                filter: isEarned ? 'none' : 'grayscale(100%)'
              }}>
                <div style={styles.badgeIcon}>{badge.icon}</div>
                <div>
                  <div style={styles.badgeName}>{badge.name}</div>
                  <div style={styles.badgeDesc}>
                    {badge.description}
                    {!isEarned && (
                      <span style={{ opacity: 0.8, display: 'block', fontSize: '0.7rem', color: '#a78bfa', marginTop: '3px' }}>
                        Progress: {getBadgeProgress(badge)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard} className="glass-card" onClick={() => setView('materials')}>
          <div style={{ ...styles.statIconContainer, backgroundColor: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={styles.statVal}>{stats.docs}</div>
            <div style={styles.statLabel}>Documents</div>
          </div>
        </div>
        <div style={styles.statCard} className="glass-card" onClick={() => setView('quizzes')}>
          <div style={{ ...styles.statIconContainer, backgroundColor: 'rgba(18, 186, 172, 0.15)', color: '#38bdf8' }}>
            <Brain size={24} />
          </div>
          <div>
            <div style={styles.statVal}>{stats.quizzes}</div>
            <div style={styles.statLabel}>Practice Quizzes</div>
          </div>
        </div>
        <div style={styles.statCard} className="glass-card">
          <div style={{ ...styles.statIconContainer, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#fef08a' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={styles.statVal}>{accuracy}%</div>
            <div style={styles.statLabel}>Avg. Accuracy</div>
          </div>
        </div>
      </div>

      <div style={styles.mainLayout} className="dashboard-main-layout">
        {/* Left Column: Weakness Analysis */}
        <div style={styles.layoutCol} className="glass-card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <TrendingUp size={20} color="#ec4899" /> AI Weakness Analysis
            </h2>
          </div>
          
          <div style={styles.cardBody}>
            {quizAttempts.length === 0 ? (
              <div style={styles.emptyState}>
                <AlertTriangle size={40} style={styles.emptyIcon} />
                <h3 style={styles.emptyTitle}>No Data Available</h3>
                <p style={styles.emptyText}>Complete at least one practice quiz to receive an AI-powered weakness report.</p>
                <button onClick={() => setView('quizzes')} className="btn btn-primary">Take a Quiz</button>
              </div>
            ) : !weaknessAnalysis ? (
              <div style={styles.emptyState}>
                <Brain size={40} style={{ color: 'hsl(var(--accent-purple))', marginBottom: '16px' }} />
                <h3 style={styles.emptyTitle}>Analyze Your Progress</h3>
                <p style={styles.emptyText}>Based on your {quizAttempts.length} quiz attempts, our AI can pinpoint your weak and strong areas.</p>
                <button onClick={runAnalysis} className="btn btn-primary" disabled={analyzing}>
                  {analyzing ? 'Analyzing...' : 'Generate Report'}
                </button>
              </div>
            ) : (
              <div style={styles.analysisContainer}>
                <div style={styles.analysisRow} className="dashboard-analysis-row">
                  <div style={styles.analysisBox}>
                    <h4 style={{ color: 'hsl(var(--error))', marginBottom: '8px' }}>Weak Areas</h4>
                    <ul style={styles.analysisList}>
                      {weaknessAnalysis.weakAreas?.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div style={styles.analysisBox}>
                    <h4 style={{ color: 'hsl(var(--success))', marginBottom: '8px' }}>Strong Areas</h4>
                    <ul style={styles.analysisList}>
                      {weaknessAnalysis.strongAreas?.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
                <div style={styles.actionBox}>
                  <h4 style={{ color: '#a78bfa', marginBottom: '8px' }}>Recommended Actions</h4>
                  <ul style={styles.analysisList}>
                    {weaknessAnalysis.recommendedActions?.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Planner & Recent Docs */}
        <div style={styles.layoutCol} className="glass-card">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <CheckSquare size={20} color="#a78bfa" /> Active Plan Checklist
            </h2>
          </div>
          
          <div style={{ ...styles.cardBody, minHeight: 'auto', marginBottom: '20px' }}>
            {activePlan ? (
              <div>
                <p style={styles.planOverviewText}><strong>Sprint:</strong> {activePlan.summary}</p>
                <div style={styles.plannerList}>
                  {activePlan.schedule?.slice(0, 2).map((item, index) => (
                    <div key={index} style={styles.planTaskRow}>
                      <span style={styles.dayBadge}>{item.day}</span>
                      <div style={{ flex: 1 }}>
                        <div style={styles.planTaskTitle}>{item.topic}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={styles.emptyText}>No active study plan. Go to Planner to generate one.</p>
            )}
          </div>

          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              <BookOpen size={20} color="#f472b6" /> Recent Materials
            </h2>
          </div>
          <div style={{ ...styles.cardBody, minHeight: 'auto' }}>
            {recentDocs.length > 0 ? (
              <div style={styles.recentDocsList}>
                {recentDocs.map((doc) => (
                  <div key={doc.id} style={styles.docRow}>
                    <div style={styles.docRowName}>{doc.file_name}</div>
                    <div style={styles.docRowActions}>
                      <button onClick={() => navigateToDocAction(doc.id, 'quizzes')} style={styles.docActionBtn}><Brain size={14} /></button>
                      <button onClick={() => navigateToDocAction(doc.id, 'flashcards')} style={styles.docActionBtn}><Layers size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.emptyText}>No materials uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px' },
  welcomeBanner: {
    padding: '30px', borderRadius: 'var(--radius-lg)',
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.08) 100%)',
    border: '1px solid hsl(var(--border-glass))', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: '20px'
  },
  bannerTitle: { fontSize: '1.8rem', marginBottom: '8px' },
  bannerSubtitle: { color: 'hsl(var(--text-muted))', fontSize: '0.95rem' },
  streakBadge: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)',
    padding: '10px 20px', borderRadius: '30px',
  },
  streakText: { fontSize: '1rem', fontWeight: '700', color: '#f97316' },
  badgesSection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionTitle: { fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' },
  badgesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  badgeCard: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
    background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s ease'
  },
  badgeIcon: { fontSize: '1.8rem' },
  badgeName: { fontSize: '0.9rem', fontWeight: '600', color: 'hsl(var(--text-main))' },
  badgeDesc: { fontSize: '0.75rem', color: 'hsl(var(--text-muted))' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  statCard: { padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' },
  statIconContainer: { width: '52px', height: '52px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: '2rem', fontWeight: '800', lineHeight: 1, marginBottom: '4px', fontFamily: 'var(--font-title)' },
  statLabel: { fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: '500' },
  mainLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' },
  layoutCol: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-glass))', paddingBottom: '12px' },
  cardTitle: { fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' },
  cardBody: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '260px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '30px 20px', flex: 1 },
  emptyIcon: { color: 'hsl(var(--text-dark))', marginBottom: '16px', opacity: 0.5 },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', marginBottom: '6px' },
  emptyText: { fontSize: '0.8rem', color: 'hsl(var(--text-muted))', maxWidth: '260px', lineHeight: '1.5', marginBottom: '16px' },
  analysisContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  analysisRow: { display: 'flex', gap: '16px' },
  analysisBox: { flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: 'var(--radius-md)' },
  actionBox: { background: 'rgba(124, 58, 237, 0.05)', border: '1px dashed rgba(124, 58, 237, 0.2)', padding: '16px', borderRadius: 'var(--radius-md)' },
  analysisList: { margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'hsl(var(--text-muted))', lineHeight: '1.6' },
  planOverviewText: { fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '16px' },
  plannerList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  planTaskRow: { display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: 'var(--radius-sm)' },
  dayBadge: { fontSize: '0.75rem', fontWeight: '700', background: 'hsl(var(--primary))', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' },
  planTaskTitle: { fontSize: '0.9rem', fontWeight: '600', color: 'hsl(var(--text-main))' },
  recentDocsList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' },
  docRowName: { fontSize: '0.9rem', fontWeight: '500', color: 'hsl(var(--text-main))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' },
  docRowActions: { display: 'flex', gap: '6px' },
  docActionBtn: { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid hsl(var(--border-glass))', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem' }
};
