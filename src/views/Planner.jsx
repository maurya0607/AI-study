import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { generatePlan as apiGeneratePlan } from '../services/aiService';
import { Calendar, CheckSquare, Sparkles, BookOpen, Clock, AlertCircle, Trash2, ArrowRight } from 'lucide-react';

export default function Planner({ user }) {
  const [activePlanRecord, setActivePlanRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [examDate, setExamDate] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [studyHours, setStudyHours] = useState(3);
  const [learningGoals, setLearningGoals] = useState('');

  const [completedTasks, setCompletedTasks] = useState({});

  useEffect(() => {
    loadStudyPlan();
  }, []);

  useEffect(() => {
    if (activePlanRecord?.id) {

      try {
        const saved = JSON.parse(localStorage.getItem(`checked_tasks_${activePlanRecord.id}`) || '{}');
        setCompletedTasks(saved);
      } catch {
        setCompletedTasks({});
      }
    }
  }, [activePlanRecord]);

  const loadStudyPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data && data.length > 0) {
        setActivePlanRecord(data[0]);
      } else {
        setActivePlanRecord(null);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!subjectsText || !studyHours) return;

    setGenerating(true);
    setActivePlanRecord(null);

    const subjects = subjectsText.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const result = await apiGeneratePlan(user.id, {
        examDate,
        subjects,
        studyHours,
        learningGoals
      });
      setActivePlanRecord(result);
    } catch (err) {
      console.error('Failed to generate study plan:', err);
      alert('Failed to generate study plan: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskCheckboxChange = (dayIdx, taskIdx, isChecked) => {
    if (!activePlanRecord) return;
    
    const key = `${dayIdx}-${taskIdx}`;
    const updated = { ...completedTasks, [key]: isChecked };
    setCompletedTasks(updated);

    localStorage.setItem(`checked_tasks_${activePlanRecord.id}`, JSON.stringify(updated));
  };

  const handleDeletePlan = async () => {
    if (!confirm('Are you sure you want to clear your current study schedule? This cannot be undone.')) {
      return;
    }

    try {
      if (activePlanRecord?.id) {
        const { error } = await supabase
          .from('study_plans')
          .delete()
          .eq('id', activePlanRecord.id);
          
        if (error) throw error;
        localStorage.removeItem(`checked_tasks_${activePlanRecord.id}`);
      }
      setActivePlanRecord(null);
    } catch (err) {
      console.error('Failed to delete study plan:', err);
      alert('Failed to clear plan: ' + err.message);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AI Study Planner</h1>
          <p style={styles.subtitle}>Formulate personalized schedules mapping to your deadlines.</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.centerLoading}><div className="loading-spinner"></div></div>
      ) : activePlanRecord ? (
        
        <div style={styles.planViewLayout} className="animate-fade-in planner-layout">
          {}
          <div style={styles.sidebarColumn} className="planner-sidebar">
            <div style={styles.summaryCard} className="glass-card">
              <div style={styles.sidebarSectionHeader}>
                <Calendar size={18} color="#a78bfa" />
                <span>Sprint Strategy</span>
              </div>
              <p style={styles.summaryText}>{activePlanRecord.plan_data.summary}</p>
              
              <div style={styles.sidebarDivider}></div>

              <div style={styles.sidebarSectionHeader}>
                <CheckSquare size={18} color="#f472b6" />
                <span>Weekly Targets</span>
              </div>
              <ul style={styles.targetsList}>
                {activePlanRecord.plan_data.weeklyGoals?.map((goal, idx) => (
                  <li key={idx} style={styles.targetItem}>{goal}</li>
                ))}
              </ul>

              <button onClick={handleDeletePlan} style={styles.clearBtn} className="btn btn-danger">
                <Trash2 size={14} /> Clear Study Plan
              </button>
            </div>
          </div>

          {}
          <div style={styles.timelineColumn} className="planner-timeline">
            <h2 style={styles.sectionTitle}>7-Day Schedule</h2>
            <div style={styles.timelineFeed}>
              {activePlanRecord.plan_data.schedule?.map((item, dayIdx) => {

                const dayTasksCount = item.tasks?.length || 0;
                const completedCount = Object.keys(completedTasks).filter(key => {
                  return key.startsWith(`${dayIdx}-`) && completedTasks[key];
                }).length;
                const isDayDone = dayTasksCount > 0 && completedCount === dayTasksCount;

                return (
                  <div key={dayIdx} style={styles.dayCard} className="glass-card">
                    <div style={styles.dayCardHeader}>
                      <div style={styles.dayCardMeta}>
                        <span style={styles.dayTag}>{item.day}</span>
                        <h3 style={styles.dayTopic}>{item.topic}</h3>
                      </div>
                      <div style={styles.dayCardDetails}>
                        <span style={styles.daySubjectBadge}>{item.subject}</span>
                        <span style={styles.dayDurationBadge}><Clock size={12} /> {item.duration}</span>
                      </div>
                    </div>

                    <div style={styles.dayTasksContainer}>
                      <h4 style={styles.tasksHeading}>Daily Tasks ({completedCount}/{dayTasksCount})</h4>
                      <div style={styles.tasksList}>
                        {item.tasks?.map((task, taskIdx) => {
                          const key = `${dayIdx}-${taskIdx}`;
                          const isChecked = !!completedTasks[key];

                          return (
                            <label key={taskIdx} style={{
                              ...styles.taskLabel,
                              opacity: isChecked ? 0.6 : 1,
                              textDecoration: isChecked ? 'line-through' : 'none'
                            }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleTaskCheckboxChange(dayIdx, taskIdx, e.target.checked)}
                                style={styles.checkbox}
                              />
                              <span style={styles.taskText}>{task}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {item.revisionTask && (
                      <div style={styles.revisionBox}>
                        <p style={styles.revisionText}>
                          <strong>🔄 Revision Loop:</strong> {item.revisionTask}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        
        <div style={styles.formContainer} className="glass-card">
          {generating ? (
            <div style={styles.generatingState}>
              <div className="loading-spinner" style={styles.spinnerLg}></div>
              <h3 className="animate-pulse-glow" style={styles.generatingTitle}>
                Crafting Personalized Schedule...
              </h3>
              <p style={styles.generatingSub}>
                Gemini AI is analyzing subjects, calculating sprints, and scheduling mock test milestones.
              </p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} style={styles.form}>
              <div style={styles.formHeader}>
                <Sparkles size={24} color="#a78bfa" />
                <h2 style={styles.formTitle}>Initialize Study Schedule</h2>
              </div>
              
              <p style={styles.formDesc}>
                Provide details about your subjects and constraints, and our AI will build a strategic study track.
              </p>

              <div style={styles.inputRow}>
                <div style={{ ...styles.inputCol, flex: 2 }}>
                  <label className="input-label">Subjects to study</label>
                  <input
                    type="text"
                    placeholder="Maths, Organic Chemistry, Physics"
                    value={subjectsText}
                    onChange={(e) => setSubjectsText(e.target.value)}
                    className="input-field"
                    required
                  />
                  <span style={styles.fieldHint}>Separate subjects with commas</span>
                </div>
                
                <div style={{ ...styles.inputCol, flex: 1 }}>
                  <label className="input-label">Exam target date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={styles.inputRow}>
                <div style={{ ...styles.inputCol, flex: 1 }}>
                  <label className="input-label">Daily Study Target (Hours)</label>
                  <div style={styles.hoursSliderWrapper}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={studyHours}
                      onChange={(e) => setStudyHours(parseInt(e.target.value))}
                      style={styles.slider}
                    />
                    <span style={styles.hoursDisplay}>{studyHours} Hours/Day</span>
                  </div>
                </div>
              </div>

              <div style={styles.inputCol}>
                <label className="input-label">Learning Goals & Directions (Optional)</label>
                <textarea
                  placeholder="e.g. Master stoichiometry problems, review textbook modules, prepare for final midterms."
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  style={styles.textarea}
                  className="input-field"
                />
              </div>

              <button type="submit" style={styles.submitBtn} className="btn btn-primary">
                ✨ Generate Personalized 7-Day Plan
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '6px'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-muted))'
  },
  centerLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px'
  },
  planViewLayout: {
    display: 'flex',
    gap: '30px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  sidebarColumn: {
    width: '320px',
    flexShrink: 0
  },
  summaryCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: 'rgba(20,20,28,0.4)',
    position: 'sticky',
    top: '30px'
  },
  sidebarSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'hsl(var(--text-muted))'
  },
  summaryText: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.5'
  },
  sidebarDivider: {
    height: '1px',
    backgroundColor: 'hsl(var(--border-glass))'
  },
  targetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingLeft: '18px',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))'
  },
  targetItem: {
    lineHeight: '1.4'
  },
  clearBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
    gap: '6px',
    marginTop: '10px'
  },
  timelineColumn: {
    flex: 1,
    minWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    marginBottom: '4px'
  },
  timelineFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  dayCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    background: 'rgba(20, 20, 28, 0.4)'
  },
  dayCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid hsl(var(--border-glass))',
    paddingBottom: '14px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  dayCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  dayTag: {
    fontSize: '0.75rem',
    fontWeight: '800',
    background: 'hsl(var(--primary))',
    color: '#fff',
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  dayTopic: {
    fontSize: '1.15rem',
    fontWeight: '600',
    fontFamily: 'var(--font-title)'
  },
  dayCardDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  daySubjectBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid hsl(var(--border-glass))',
    padding: '3px 8px',
    borderRadius: '12px',
    color: 'hsl(var(--text-muted))'
  },
  dayDurationBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#a78bfa',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  dayTasksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  tasksHeading: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'hsl(var(--text-dark))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  taskLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease'
  },
  checkbox: {
    marginTop: '3px',
    cursor: 'pointer',
    accentColor: 'hsl(var(--primary))'
  },
  taskText: {
    lineHeight: '1.4'
  },
  revisionBox: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid hsl(var(--border-glass))',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)'
  },
  revisionText: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.4'
  },
  formContainer: {
    padding: '40px',
    maxWidth: '700px',
    margin: '0 auto',
    width: '100%',
    backgroundColor: 'rgba(20,20,28,0.4)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid hsl(var(--border-glass))',
    paddingBottom: '16px'
  },
  formTitle: {
    fontSize: '1.4rem',
    fontFamily: 'var(--font-title)'
  },
  formDesc: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.5'
  },
  inputRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  inputCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '200px'
  },
  fieldHint: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-dark))',
    marginTop: '2px'
  },
  hoursSliderWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '4px'
  },
  slider: {
    flex: 1,
    accentColor: 'hsl(var(--primary))',
    cursor: 'pointer'
  },
  hoursDisplay: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#a78bfa',
    width: '100px'
  },
  textarea: {
    minHeight: '100px',
    resize: 'vertical'
  },
  submitBtn: {
    padding: '13px 20px',
    fontSize: '1rem',
    marginTop: '10px'
  },
  generatingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
    padding: '40px 0'
  },
  generatingTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#a78bfa'
  },
  generatingSub: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    maxWidth: '320px',
    lineHeight: '1.5'
  },
  spinnerLg: {
    width: '32px',
    height: '32px',
    borderWidth: '3px'
  }
};
