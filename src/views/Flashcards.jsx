import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../services/supabaseClient';
import { generateFlashcards as apiGenerateFlashcards } from '../services/aiService';
import {
  Layers, ChevronLeft, ChevronRight, RotateCcw, Shuffle,
  Sparkles, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function Flashcards({ user, activeDocId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(activeDocId || '');
  const [selectedDocText, setSelectedDocText] = useState('');
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mastered, setMastered] = useState({});

  useEffect(() => { loadDocuments(); }, []);

  useEffect(() => {
    if (selectedDocId) {
      const doc = documents.find(d => d.id === selectedDocId);
      setSelectedDocText(doc?.extracted_text || '');
      loadFlashcardsForDoc(selectedDocId);
    } else {
      setCards([]);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setMastered({});
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

  const loadFlashcardsForDoc = async (docId) => {
    setLoading(true);
    setCards([]);
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setCards(data[0].cards || []);
      }
    } catch (err) {
      console.error('Error fetching flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDocId || !selectedDocText) return;
    setGenerating(true);
    setCards([]);
    try {
      const result = await apiGenerateFlashcards(selectedDocId, selectedDocText);
      setCards(result.cards || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      setMastered({});
    } catch (err) {
      console.error('Flashcards generation failed:', err);
      alert('Flashcards generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.max(0, i - 1)), 150);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.min(cards.length - 1, i + 1)), 150);
  };

  const toggleMastered = () => {
    setMastered(m => ({ ...m, [currentIndex]: !m[currentIndex] }));
  };

  const masteredCount = Object.values(mastered).filter(Boolean).length;
  const card = cards[currentIndex];

  return (
    <div style={styles.container} className="animate-fade-in">
      {}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Revision Flashcards</h1>
          <p style={styles.subtitle}>Active recall practice — flip, navigate, and track mastery.</p>
        </div>
      </div>

      {}
      <div style={styles.controlsCard} className="glass-card">
        <div style={styles.controlRow}>
          <div style={styles.controlGroup}>
            <label className="input-label">Select Study Material</label>
            <select
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              className="input-field"
              style={styles.select}
            >
              <option value="">-- Choose a document --</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.file_name}</option>
              ))}
            </select>
          </div>

          {cards.length > 0 && (
            <div style={styles.deckActions}>
              <button onClick={handleShuffle} className="btn btn-secondary" style={styles.actionBtn}>
                <Shuffle size={15} /> Shuffle Deck
              </button>
              <button onClick={handleGenerate} className="btn btn-secondary" style={styles.actionBtn}>
                <RotateCcw size={15} /> Regenerate
              </button>
            </div>
          )}
        </div>

        {cards.length > 0 && (
          <div style={styles.progressBar}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${(masteredCount / cards.length) * 100}%` }} />
            </div>
            <span style={styles.progressText}>
              {masteredCount} / {cards.length} Mastered
            </span>
          </div>
        )}
      </div>

      {}
      {!selectedDocId ? (
        <div style={styles.emptyState} className="glass-card">
          <FileText size={52} style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>Select a Document</h3>
          <p style={styles.emptySubtitle}>Choose a study material to view or generate flashcards.</p>
        </div>
      ) : loading ? (
        <div style={styles.centerLoading}>
          <div className="loading-spinner" style={styles.spinnerLg} />
        </div>
      ) : generating ? (
        <div style={styles.emptyState} className="glass-card">
          <div className="loading-spinner" style={styles.spinnerLg} />
          <h3 className="animate-pulse-glow" style={styles.generatingTitle}>
            Generating Flashcards with AI...
          </h3>
          <p style={styles.emptySubtitle}>Building 10 revision cards from your study material</p>
        </div>
      ) : cards.length === 0 ? (
        <div style={styles.emptyState} className="glass-card">
          <Sparkles size={52} style={{ color: 'hsl(var(--accent-purple))', marginBottom: '16px' }} />
          <h3 style={styles.emptyTitle}>No Flashcards Yet</h3>
          <p style={styles.emptySubtitle}>Generate AI-powered revision cards for active recall practice.</p>
          <button
            onClick={handleGenerate}
            className="btn btn-primary"
            style={styles.generateBtn}
            disabled={!selectedDocText}
          >
            <Layers size={16} /> Generate Flashcards
          </button>
          {!selectedDocText && (
            <p style={styles.warnText}><AlertCircle size={13} /> Document text is empty — cannot generate cards.</p>
          )}
        </div>
      ) : (
        <div style={styles.deckLayout}>
          {}
          <div style={styles.navRow}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="btn btn-secondary"
              style={{ ...styles.navBtn, opacity: currentIndex === 0 ? 0.35 : 1 }}
            >
              <ChevronLeft size={18} />
            </button>

            <span style={styles.cardCounter}>
              Card <strong style={{ color: '#a78bfa' }}>{currentIndex + 1}</strong> of {cards.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="btn btn-secondary"
              style={{ ...styles.navBtn, opacity: currentIndex === cards.length - 1 ? 0.35 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Card Frame */}
          <div style={styles.cardScene} className="flashcard-scene" onClick={() => setIsFlipped(f => !f)}>
            <div style={{
              ...styles.cardInner,
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}>
              {/* Question Side */}
              <div 
                className="flashcard-face"
                style={{
                  ...styles.cardFace,
                  ...styles.cardFront,
                  background: mastered[currentIndex]
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.06) 100%)',
                  borderColor: mastered[currentIndex] ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.25)',
                }}
              >
                <span style={styles.cardSideLabel}>QUESTION</span>
                <p style={styles.cardText} className="flashcard-text">{card?.front}</p>
                <span style={styles.flipHint}>Click to reveal answer ↻</span>
              </div>

              {/* Answer Side */}
              <div 
                className="flashcard-face"
                style={{
                  ...styles.cardFace,
                  ...styles.cardBack,
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(139,92,246,0.08) 100%)',
                  borderColor: 'rgba(236,72,153,0.25)',
                }}
              >
                <span style={styles.cardSideLabel}>ANSWER</span>
                <p style={styles.cardText} className="flashcard-text">{card?.back}</p>
                <span style={styles.flipHint}>Click to see question ↻</span>
              </div>
            </div>
          </div>

          {}
          <div style={styles.actionRow}>
            <button
              onClick={toggleMastered}
              className={mastered[currentIndex] ? 'btn btn-secondary' : 'btn btn-primary'}
              style={styles.masteredBtn}
            >
              <CheckCircle2 size={16} />
              {mastered[currentIndex] ? 'Unmark Mastered' : 'Mark as Mastered'}
            </button>
          </div>

          {}
          <div style={styles.dotRow}>
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setIsFlipped(false); }}
                style={{
                  ...styles.dot,
                  backgroundColor: i === currentIndex
                    ? '#a78bfa'
                    : mastered[i]
                    ? 'hsl(var(--success))'
                    : 'rgba(255,255,255,0.12)',
                  transform: i === currentIndex ? 'scale(1.4)' : 'scale(1)',
                }}
                title={`Card ${i + 1}`}
              />
            ))}
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
    gap: '28px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-muted))',
  },
  controlsCard: {
    padding: '22px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: '220px',
    maxWidth: '420px',
  },
  select: {
    width: '100%',
  },
  deckActions: {
    display: 'flex',
    gap: '10px',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '10px 16px',
    fontSize: '0.85rem',
    gap: '6px',
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  progressTrack: {
    flex: 1,
    height: '5px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, hsl(var(--success)) 0%, #34d399 100%)',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  progressText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'hsl(var(--success))',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  emptyState: {
    padding: '70px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIcon: {
    color: 'hsl(var(--text-dark))',
    opacity: 0.5,
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: '0.875rem',
    color: 'hsl(var(--text-muted))',
    maxWidth: '300px',
    lineHeight: '1.5',
  },
  generateBtn: {
    padding: '12px 24px',
    fontSize: '0.95rem',
    marginTop: '8px',
    gap: '8px',
  },
  warnText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
    color: 'hsl(var(--error))',
    marginTop: '6px',
  },
  generatingTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#a78bfa',
    marginTop: '8px',
  },
  centerLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
  },
  spinnerLg: {
    width: '36px',
    height: '36px',
    borderWidth: '3px',
  },
  deckLayout: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  navBtn: {
    padding: '10px 14px',
    borderRadius: '10px',
    transition: 'all 0.2s ease',
  },
  cardCounter: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-muted))',
    minWidth: '120px',
    textAlign: 'center',
  },

  cardScene: {
    width: '100%',
    maxWidth: '680px',
    height: '340px',
    perspective: '1200px',
    cursor: 'pointer',
  },
  cardInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardFace: {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '20px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 48px',
    textAlign: 'center',
    gap: '16px',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 20px 60px -15px rgba(0,0,0,0.6)',
    userSelect: 'none',
  },
  cardFront: {},
  cardBack: {
    transform: 'rotateY(180deg)',
  },
  cardSideLabel: {
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#fff',
    lineHeight: '1.55',
    fontFamily: 'var(--font-title)',
  },
  flipHint: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,0.25)',
    marginTop: '4px',
  },

  actionRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  masteredBtn: {
    padding: '11px 26px',
    fontSize: '0.9rem',
    gap: '8px',
    borderRadius: '10px',
    transition: 'all 0.25s ease',
  },
  dotRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '500px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s ease',
  },
};
