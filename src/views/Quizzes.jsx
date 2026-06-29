import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { generateQuiz as apiGenerateQuiz } from '../services/aiService';
import { Brain, FileText, CheckCircle2, XCircle, AlertCircle, RefreshCw, HelpCircle, ArrowRight } from 'lucide-react';

export default function Quizzes({ user, activeDocId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(activeDocId || '');
  const [selectedDocText, setSelectedDocText] = useState('');
  const [quizType, setQuizType] = useState('MCQ');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quizRecord, setQuizRecord] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]); // Array of selections
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      const doc = documents.find(d => d.id === selectedDocId);
      if (doc) {
        setSelectedDocText(doc.extracted_text || '');
      }
      loadQuizzesForDoc(selectedDocId);
    } else {
      setQuizRecord(null);
      setIsPlaying(false);
    }
  }, [selectedDocId, documents]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('documents').select('*');
      if (error) throw error;
      setDocuments(data || []);

      if (activeDocId) {
        setSelectedDocId(activeDocId);
      } else if (data && data.length > 0) {
        setSelectedDocId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizzesForDoc = async (docId) => {
    setLoading(true);
    setQuizRecord(null);
    setIsPlaying(false);
    setIsCompleted(false);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data && data.length > 0) {
        setQuizRecord(data[0]);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDocId || !selectedDocText) return;
    
    setGenerating(true);
    setQuizRecord(null);
    setIsPlaying(false);
    setIsCompleted(false);
    try {
      const result = await apiGenerateQuiz(selectedDocId, selectedDocText, quizType);
      setQuizRecord(result);
    } catch (err) {
      console.error('Quiz generation failed:', err);
      alert('Quiz generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = () => {
    if (!quizRecord?.quiz_data || quizRecord.quiz_data.length === 0) return;
    setIsPlaying(true);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setScore(0);
    setUserAnswers([]);
    setIsCompleted(false);
  };

  const handleOptionSelect = (option) => {
    if (isAnswerRevealed) return; // Prevent changing answer
    setSelectedOption(option);
    setIsAnswerRevealed(true);

    const activeQuestion = quizRecord.quiz_data[currentQuestionIdx];
    const isCorrect = option === activeQuestion.answer;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setUserAnswers(prev => [...prev, {
      question: activeQuestion.question,
      selected: option,
      correct: activeQuestion.answer,
      isCorrect,
      explanation: activeQuestion.explanation
    }]);
  };

  const nextQuestion = async () => {
    setSelectedOption(null);
    setIsAnswerRevealed(false);

    if (currentQuestionIdx + 1 < quizRecord.quiz_data.length) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setIsCompleted(true);
      
      try {
        await supabase.from('quiz_attempts').insert({
          user_id: user.id,
          document_id: selectedDocId,
          score: score,
          total: quizRecord.quiz_data.length,
          topics: []
        });
      } catch (err) {
        console.error('Failed to save quiz attempt:', err);
      }
    }
  };

  const restartSetup = () => {
    setIsPlaying(false);
    setIsCompleted(false);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Practice Assessments</h1>
          <p style={styles.subtitle}>Test your knowledge with auto-generated interactive quizzes.</p>
        </div>
      </div>

      {}
      {!isPlaying && !isCompleted && (
        <div style={styles.setupSection}>
          <div style={styles.controlsCard} className="glass-card">
            <div style={styles.controlGroup}>
              <label className="input-label" style={styles.label}>Select Study Material</label>
              <select 
                value={selectedDocId} 
                onChange={(e) => setSelectedDocId(e.target.value)}
                style={styles.select}
                className="input-field"
              >
                <option value="">-- Choose a document --</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>{d.file_name}</option>
                ))}
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label className="input-label" style={styles.label}>Quiz Format</label>
              <div style={styles.tabsContainer}>
                {['MCQ', 'True/False', 'Fill in the Blanks'].map((format) => (
                  <button
                    key={format}
                    onClick={() => setQuizType(format)}
                    style={{
                      ...styles.tabBtn,
                      background: quizType === format ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.03)',
                      borderColor: quizType === format ? 'hsl(var(--primary))' : 'hsl(var(--border-glass))'
                    }}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.displaySection}>
            {!selectedDocId ? (
              <div style={styles.infoState} className="glass-card">
                <Brain size={48} style={styles.infoIcon} />
                <h3>Choose a Material</h3>
                <p>Choose an uploaded study material from the dropdown above to test yourself.</p>
              </div>
            ) : loading ? (
              <div style={styles.centerLoading}><div className="loading-spinner"></div></div>
            ) : quizRecord ? (
              <div style={styles.quizStartCard} className="glass-card">
                <CheckCircle2 size={48} color="#a78bfa" style={{ marginBottom: '12px' }} />
                <h3>Practice Quiz Ready</h3>
                <p style={styles.quizDetailsText}>
                  A quiz has been generated for this document. It contains <strong>{quizRecord.quiz_data?.length || 0} questions</strong>.
                </p>
                <button onClick={startQuiz} style={styles.startBtn} className="btn btn-primary">
                  🧠 Start Practice Session
                </button>
                
                <div style={styles.divider}>or generate a new one</div>
                <button 
                  onClick={handleGenerate} 
                  style={styles.regenerateBtn}
                  className="btn btn-secondary"
                  disabled={generating}
                >
                  <RefreshCw size={14} /> Re-Generate Quiz ({quizType})
                </button>
              </div>
            ) : (
              <div style={styles.infoState} className="glass-card">
                {generating ? (
                  <div style={styles.generatingState}>
                    <div className="loading-spinner" style={styles.spinnerLg}></div>
                    <h3 className="animate-pulse-glow" style={styles.generatingTitle}>
                      Generating {quizType} quiz with AI...
                    </h3>
                    <p style={styles.generatingSub}>Reading text context, mapping questions, and constructing options JSON</p>
                  </div>
                ) : (
                  <>
                    <Brain size={48} style={{ color: 'hsl(var(--accent-cyan))', marginBottom: '16px' }} />
                    <h3>No Practice Quizzes Found</h3>
                    <p>Generate a quiz containing exactly 5 structured questions from this document.</p>
                    <button 
                      onClick={handleGenerate} 
                      style={styles.generateBtn}
                      className="btn btn-primary"
                      disabled={!selectedDocText}
                    >
                      ✨ Generate {quizType} Quiz
                    </button>
                    {!selectedDocText && (
                      <p style={styles.warnText}>
                        <AlertCircle size={14} /> Selected document text is empty. Quiz cannot be generated.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {isPlaying && quizRecord?.quiz_data && (
        <div style={styles.playerCard} className="glass-card animate-fade-in">
          {}
          <div style={styles.playerHeader}>
            <div style={styles.playerMeta}>
              <Brain size={18} color="#a78bfa" />
              <span>Practice Session</span>
            </div>
            <span style={styles.questionIndex}>
              Question {currentQuestionIdx + 1} of {quizRecord.quiz_data.length}
            </span>
          </div>

          <div style={styles.progressTracker}>
            <div 
              style={{ 
                ...styles.progressBar, 
                width: `${((currentQuestionIdx + 1) / quizRecord.quiz_data.length) * 100}%` 
              }}
            ></div>
          </div>

          {}
          <div style={styles.questionSection}>
            <h2 style={styles.questionText}>
              {quizRecord.quiz_data[currentQuestionIdx].question}
            </h2>
          </div>

          {}
          <div style={styles.optionsGrid}>
            {quizRecord.quiz_data[currentQuestionIdx].options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrectAnswer = option === quizRecord.quiz_data[currentQuestionIdx].answer;
              
              let optionStyle = styles.optionBtn;
              if (isAnswerRevealed) {
                if (isCorrectAnswer) {
                  optionStyle = { ...styles.optionBtn, ...styles.optionCorrect };
                } else if (isSelected) {
                  optionStyle = { ...styles.optionBtn, ...styles.optionIncorrect };
                } else {
                  optionStyle = { ...styles.optionBtn, ...styles.optionDisabled };
                }
              } else if (isSelected) {
                optionStyle = { ...styles.optionBtn, ...styles.optionSelected };
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isAnswerRevealed}
                  style={optionStyle}
                >
                  <span style={styles.optionLetter}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{option}</span>
                  {isAnswerRevealed && isCorrectAnswer && (
                    <CheckCircle2 size={18} color="hsl(var(--success))" />
                  )}
                  {isAnswerRevealed && isSelected && !isCorrectAnswer && (
                    <XCircle size={18} color="hsl(var(--error))" />
                  )}
                </button>
              );
            })}
          </div>

          {}
          {isAnswerRevealed && (
            <div style={styles.explanationBox} className="animate-fade-in">
              <div style={styles.explanationHeader}>
                <HelpCircle size={16} color="#a78bfa" />
                <span>Explanation</span>
              </div>
              <p style={styles.explanationText}>
                {quizRecord.quiz_data[currentQuestionIdx].explanation}
              </p>
              <button onClick={nextQuestion} style={styles.nextBtn} className="btn btn-primary">
                {currentQuestionIdx + 1 < quizRecord.quiz_data.length ? 'Next Question' : 'Finish Quiz'} 
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {}
      {isCompleted && (
        <div style={styles.resultsContainer} className="animate-fade-in">
          <div style={styles.scoreSummaryCard} className="glass-card">
            <h2 style={styles.resultsTitle}>Quiz Completed!</h2>
            <div style={styles.resultsBadge}>
              <div style={styles.scoreBig}>{score}</div>
              <div style={styles.totalBig}>/ {userAnswers.length}</div>
            </div>
            
            <h3 style={styles.performanceRating}>
              {score === userAnswers.length && '🌟 Perfect Score! Dynamic mastery.'}
              {score >= userAnswers.length * 0.75 && score < userAnswers.length && '✨ Excellent work! Very strong grasp.'}
              {score >= userAnswers.length * 0.5 && score < userAnswers.length * 0.75 && '👍 Good effort! Review key details.'}
              {score < userAnswers.length * 0.5 && '📚 Keep studying! Focus on revisions.'}
            </h3>
            
            <div style={styles.resultsActions}>
              <button onClick={startQuiz} style={styles.resultsActionBtn} className="btn btn-primary">
                <RefreshCw size={14} /> Retake Quiz
              </button>
              <button onClick={restartSetup} style={styles.resultsActionBtn} className="btn btn-secondary">
                Select Another Material
              </button>
            </div>
          </div>

          {}
          <div style={styles.reviewSection}>
            <h3 style={styles.reviewTitle}>Review Responses</h3>
            <div style={styles.reviewList}>
              {userAnswers.map((ans, idx) => (
                <div key={idx} style={styles.reviewCard} className="glass-card">
                  <div style={styles.reviewHeader}>
                    <span style={styles.reviewNum}>Q{idx + 1}</span>
                    <span style={{
                      ...styles.reviewStatus,
                      color: ans.isCorrect ? 'hsl(var(--success))' : 'hsl(var(--error))',
                      background: ans.isCorrect ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                      borderColor: ans.isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    }}>
                      {ans.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  <h4 style={styles.reviewQuestion}>{ans.question}</h4>
                  <div style={styles.reviewSelections}>
                    <p style={styles.selectionLine}>
                      <strong>Your Answer:</strong> <span style={{ color: ans.isCorrect ? 'hsl(var(--success))' : 'hsl(var(--error))' }}>{ans.selected}</span>
                    </p>
                    {!ans.isCorrect && (
                      <p style={styles.selectionLine}>
                        <strong>Correct Answer:</strong> <span style={{ color: 'hsl(var(--success))' }}>{ans.correct}</span>
                      </p>
                    )}
                  </div>
                  <div style={styles.reviewExplanation}>
                    <p><strong>Rationale:</strong> {ans.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
  setupSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  controlsCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: 'hsl(var(--text-muted))',
    fontWeight: '500'
  },
  select: {
    maxWidth: '400px'
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  tabBtn: {
    padding: '10px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid hsl(var(--border-glass))',
    color: '#fff',
    fontWeight: '500',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  displaySection: {
    minHeight: '260px',
    display: 'flex',
    flexDirection: 'column'
  },
  quizStartCard: {
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    flex: 1
  },
  quizDetailsText: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-muted))',
    maxWidth: '360px',
    lineHeight: '1.5'
  },
  startBtn: {
    padding: '12px 24px',
    fontSize: '0.95rem'
  },
  divider: {
    color: 'hsl(var(--text-dark))',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '10px 0'
  },
  regenerateBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem'
  },
  infoState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flex: 1
  },
  infoIcon: {
    color: 'hsl(var(--text-dark))',
    opacity: 0.5,
    marginBottom: '8px'
  },
  generateBtn: {
    padding: '12px 24px',
    fontSize: '0.95rem',
    marginTop: '10px'
  },
  generatingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  generatingTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'hsl(var(--accent-cyan))'
  },
  generatingSub: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    maxWidth: '300px'
  },
  spinnerLg: {
    width: '32px',
    height: '32px',
    borderWidth: '3px'
  },
  centerLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px'
  },
  warnText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: 'hsl(var(--error))',
    marginTop: '10px'
  },
  playerCard: {
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'rgba(20,20,28,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  playerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  playerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#a78bfa',
    textTransform: 'uppercase'
  },
  questionIndex: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))'
  },
  progressTracker: {
    height: '4px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    background: 'hsl(var(--primary))',
    transition: 'width 0.35s ease'
  },
  questionSection: {
    minHeight: '60px'
  },
  questionText: {
    fontSize: '1.35rem',
    lineHeight: '1.4',
    fontFamily: 'var(--font-title)',
    fontWeight: '500'
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  optionBtn: {
    width: '100%',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid hsl(var(--border-glass))',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    outline: 'none'
  },
  optionLetter: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid hsl(var(--border-glass))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'hsl(var(--text-muted))'
  },
  optionSelected: {
    borderColor: 'hsl(var(--primary))',
    background: 'hsl(var(--primary-glow))'
  },
  optionCorrect: {
    borderColor: 'hsl(var(--success))',
    background: 'hsl(var(--success-glow))'
  },
  optionIncorrect: {
    borderColor: 'hsl(var(--error))',
    background: 'hsl(var(--error-glow))'
  },
  optionDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  explanationBox: {
    background: 'rgba(124,58,237,0.03)',
    border: '1px dashed rgba(124,58,237,0.25)',
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px'
  },
  explanationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#a78bfa'
  },
  explanationText: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.5'
  },
  nextBtn: {
    alignSelf: 'flex-end',
    padding: '8px 18px',
    fontSize: '0.85rem'
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  scoreSummaryCard: {
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  resultsTitle: {
    fontSize: '1.8rem',
    fontFamily: 'var(--font-title)'
  },
  resultsBadge: {
    display: 'inline-flex',
    alignItems: 'baseline',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid hsl(var(--border-glass))',
    padding: '12px 30px',
    borderRadius: '24px'
  },
  scoreBig: {
    fontSize: '3rem',
    fontWeight: '800',
    color: '#a78bfa',
    fontFamily: 'var(--font-title)'
  },
  totalBig: {
    fontSize: '1.5rem',
    color: 'hsl(var(--text-muted))',
    marginLeft: '6px'
  },
  performanceRating: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
    maxWidth: '340px',
    lineHeight: '1.4'
  },
  resultsActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px'
  },
  resultsActionBtn: {
    padding: '10px 20px',
    fontSize: '0.9rem'
  },
  reviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  reviewTitle: {
    fontSize: '1.3rem'
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  reviewCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reviewNum: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'hsl(var(--text-dark))'
  },
  reviewStatus: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid'
  },
  reviewQuestion: {
    fontSize: '1.1rem',
    fontWeight: '500',
    color: '#fff'
  },
  reviewSelections: {
    fontSize: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  selectionLine: {
    margin: 0
  },
  reviewExplanation: {
    background: 'rgba(255,255,255,0.02)',
    padding: '14px 18px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    borderLeft: '3px solid hsl(var(--border-glass))'
  }
};
