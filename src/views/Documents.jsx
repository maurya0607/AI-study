import React, { useState, useEffect, useRef } from 'react';
import supabase from '../services/supabaseClient';
import { extractPdf, generateNotes, generateQuiz, generateFlashcards, generatePlan } from '../services/aiService';
import {
  UploadCloud, FileText, Trash2, BookOpen, Brain,
  MessageSquare, AlertCircle, CheckCircle2, Layers, Calendar, Sparkles
} from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'notes',      label: 'Generating AI Notes',       icon: <BookOpen size={16} /> },
  { key: 'quiz',       label: 'Building Practice Quiz',     icon: <Brain size={16} /> },
  { key: 'flashcards', label: 'Creating Flashcards',        icon: <Layers size={16} /> },
  { key: 'plan',       label: 'Crafting Study Plan',        icon: <Calendar size={16} /> },
];

export default function Documents({ user, setView, setActiveDocId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState({ stage: 'idle', progress: 0, error: '' });
  const [pipelineStatus, setPipelineStatus] = useState({}); // { notes: 'pending'|'running'|'done'|'error', ... }
  const fileInputRef = useRef(null);

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      console.log('Fetching documents from Supabase...');
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, created_at, user_id')
        .order('created_at', { ascending: false });
      
      console.log('Documents fetch result:', data, error);
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      alert('Failed to load library: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFile(files[0]);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) uploadFile(files[0]);
  };

  const uploadFile = async (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadState({ stage: 'idle', progress: 0, error: 'Only PDF files are supported currently.' });
      return;
    }

    setUploadState({ stage: 'uploading', progress: 15, error: '' });
    setPipelineStatus({});

    try {

      let fileUrl = `mock://storage/study-materials/${user.id}/${file.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('study-materials')
        .upload(`${user.id}/${Date.now()}_${file.name}`, file);
      if (!uploadErr && uploadData) fileUrl = uploadData.path;

      setUploadState({ stage: 'extracting', progress: 35, error: '' });
      const extractResult = await extractPdf(file);

      setUploadState({ stage: 'saving', progress: 55, error: '' });
      const { data: docData, error: dbErr } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          extracted_text: extractResult.text
        })
        .select()
        .single();
      if (dbErr) throw dbErr;

      const docId = docData.id;
      const docText = extractResult.text;
      const docTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

      setUploadState({ stage: 'generating', progress: 65, error: '' });
      setPipelineStatus({ notes: 'running', quiz: 'pending', flashcards: 'pending', plan: 'pending' });

      const runStep = async (key, fn) => {
        setPipelineStatus(prev => ({ ...prev, [key]: 'running' }));
        try {
          await fn();
          setPipelineStatus(prev => ({ ...prev, [key]: 'done' }));
        } catch (e) {
          console.warn(`Pipeline step "${key}" failed:`, e.message);
          setPipelineStatus(prev => ({ ...prev, [key]: 'error' }));
        }
      };

      await Promise.all([
        runStep('notes',      () => generateNotes(docId, docText, 'detailed')),
        runStep('quiz',       () => generateQuiz(docId, docText, 'MCQ')),
        runStep('flashcards', () => generateFlashcards(docId, docText)),
        runStep('plan',       () => generatePlan(user.id, {
          subjects: [docTitle],
          studyHours: 3,
          learningGoals: `Master the content of ${docTitle}`
        })),
      ]);

      setUploadState({ stage: 'completed', progress: 100, error: '' });
      setTimeout(() => {
        setUploadState({ stage: 'idle', progress: 0, error: '' });
        setPipelineStatus({});
        setActiveDocId(docId);
        loadDocuments();
      }, 2400);

    } catch (err) {
      console.error('Upload flow failed:', err);
      setUploadState({ stage: 'idle', progress: 0, error: err.message || 'File upload pipeline failed.' });
      setPipelineStatus({});
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this study material? All notes, quizzes, and flashcards will also be deleted.')) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
    }
  };

  const handleAction = (docId, targetView) => {
    setActiveDocId(docId);
    setView(targetView);
  };

  const isGenerating = uploadState.stage === 'generating';

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Study Materials</h1>
          <p style={styles.subtitle}>Upload a PDF — AI instantly generates Notes, Quiz, Flashcards & Study Plan.</p>
        </div>
      </div>

      {}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => uploadState.stage === 'idle' && fileInputRef.current?.click()}
        style={{
          ...styles.uploadBox,
          borderColor: uploadState.stage !== 'idle' ? 'hsl(var(--primary))' : 'hsl(var(--border-glass))',
          cursor: uploadState.stage !== 'idle' ? 'default' : 'pointer',
        }}
        className="glass-card"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".pdf"
        />

        {uploadState.stage === 'idle' && (
          <div style={styles.uploadIdle}>
            <UploadCloud size={48} style={styles.uploadIcon} />
            <h3 style={styles.uploadTitle}>Drag & Drop your PDF here</h3>
            <p style={styles.uploadSubtitle}>or click to browse from files (Max 50MB)</p>
            <div style={styles.featurePills}>
              <span style={styles.pill}><BookOpen size={12} /> AI Notes</span>
              <span style={styles.pill}><Brain size={12} /> Practice Quiz</span>
              <span style={styles.pill}><Layers size={12} /> Flashcards</span>
              <span style={styles.pill}><Calendar size={12} /> Study Plan</span>
            </div>
            {uploadState.error && (
              <div style={styles.errorText}>
                <AlertCircle size={14} /> {uploadState.error}
              </div>
            )}
          </div>
        )}

        {(uploadState.stage === 'uploading' || uploadState.stage === 'extracting' || uploadState.stage === 'saving') && (
          <div style={styles.uploadActive}>
            <div className="loading-spinner" style={styles.spinnerLg} />
            <h3 style={styles.uploadTitle}>
              {uploadState.stage === 'uploading' && 'Uploading document to storage...'}
              {uploadState.stage === 'extracting' && 'Parsing PDF & extracting text...'}
              {uploadState.stage === 'saving' && 'Indexing document in database...'}
            </h3>
            <div style={styles.progressContainer}>
              <div style={{ ...styles.progressBar, width: `${uploadState.progress}%` }} />
            </div>
            <p style={styles.uploadSubtitle}>{uploadState.progress}% Complete</p>
          </div>
        )}

        {isGenerating && (
          <div style={styles.pipelineWrapper}>
            <Sparkles size={28} color="#a78bfa" />
            <h3 style={styles.uploadTitle} className="animate-pulse-glow">
              AI is generating your study materials...
            </h3>
            <div style={styles.pipelineGrid} className="upload-pipeline-grid">
              {PIPELINE_STEPS.map(step => {
                const status = pipelineStatus[step.key] || 'pending';
                return (
                  <div key={step.key} style={{
                    ...styles.pipelineStep,
                    borderColor: status === 'done' ? 'rgba(16,185,129,0.4)'
                      : status === 'running' ? 'rgba(124,58,237,0.5)'
                      : status === 'error' ? 'rgba(239,68,68,0.35)'
                      : 'rgba(255,255,255,0.06)',
                    background: status === 'done' ? 'rgba(16,185,129,0.07)'
                      : status === 'running' ? 'rgba(124,58,237,0.08)'
                      : 'rgba(255,255,255,0.02)',
                  }}>
                    <span style={styles.pipelineIcon}>{step.icon}</span>
                    <span style={{
                      ...styles.pipelineLabel,
                      color: status === 'done' ? 'hsl(var(--success))'
                        : status === 'running' ? '#a78bfa'
                        : status === 'error' ? 'hsl(var(--error))'
                        : 'hsl(var(--text-dark))',
                    }}>
                      {step.label}
                    </span>
                    <span style={styles.pipelineStatusIcon}>
                      {status === 'done' && <CheckCircle2 size={15} color="hsl(var(--success))" />}
                      {status === 'running' && <div className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />}
                      {status === 'error' && <AlertCircle size={15} color="hsl(var(--error))" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {uploadState.stage === 'completed' && (
          <div style={styles.uploadCompleted}>
            <CheckCircle2 size={52} color="hsl(var(--success))" />
            <h3 style={styles.uploadTitle}>All Study Materials Generated!</h3>
            <p style={styles.uploadSubtitle}>Notes, Quiz, Flashcards & Study Plan are ready.</p>
          </div>
        )}
      </div>

      {}
      <div style={styles.listSection}>
        <h2 style={styles.sectionTitle}>Your Library</h2>
        {loading ? (
          <div style={styles.centerLoading}><div className="loading-spinner" /></div>
        ) : documents.length > 0 ? (
          <div style={styles.grid}>
            {documents.map(doc => (
              <div key={doc.id} style={styles.docCard} className="glass-card">
                <div style={styles.docCardHeader}>
                  <div style={styles.docIconWrapper}>
                    <FileText size={24} color="#a78bfa" />
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={styles.deleteBtn}
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={styles.docCardBody}>
                  <h3 style={styles.docCardTitle} title={doc.file_name}>{doc.file_name}</h3>
                  <p style={styles.docCardDate}>Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>

                <div style={styles.docCardActions} className="doc-card-actions">
                  <button onClick={() => handleAction(doc.id, 'notes')} style={styles.actionBtn} className="btn btn-secondary">
                    <BookOpen size={13} /> Notes
                  </button>
                  <button onClick={() => handleAction(doc.id, 'quizzes')} style={styles.actionBtn} className="btn btn-secondary">
                    <Brain size={13} /> Quiz
                  </button>
                  <button onClick={() => handleAction(doc.id, 'flashcards')} style={styles.actionBtn} className="btn btn-secondary">
                    <Layers size={13} /> Cards
                  </button>
                  <button onClick={() => handleAction(doc.id, 'doubts')} style={styles.actionBtn} className="btn btn-secondary">
                    <MessageSquare size={13} /> Doubt
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyContainer} className="glass-card">
            <UploadCloud size={52} style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>Your library is empty</h3>
            <p style={styles.emptySubtitle}>Drag & drop a PDF above to auto-generate notes, quizzes, flashcards & a study plan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '1.8rem', marginBottom: '6px' },
  subtitle: { fontSize: '0.95rem', color: 'hsl(var(--text-muted))' },

  uploadBox: {
    padding: '40px',
    borderRadius: 'var(--radius-lg)',
    borderStyle: 'dashed',
    borderWidth: '2px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '220px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    transition: 'all 0.35s ease',
  },

  uploadIdle: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  uploadIcon: { color: 'hsl(var(--text-dark))', opacity: 0.8 },
  uploadTitle: { fontSize: '1.15rem', fontWeight: '600' },
  uploadSubtitle: { fontSize: '0.85rem', color: 'hsl(var(--text-muted))' },
  featurePills: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
    color: '#c4b5fd', padding: '4px 10px', borderRadius: '20px',
    fontSize: '0.75rem', fontWeight: '500',
  },
  errorText: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
    color: '#ef4444', padding: '6px 12px', borderRadius: '20px',
    fontSize: '0.8rem', marginTop: '8px',
  },

  uploadActive: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '320px' },
  spinnerLg: { width: '32px', height: '32px', borderWidth: '3px' },
  progressContainer: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' },
  progressBar: { height: '100%', background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, #ec4899 100%)', transition: 'width 0.2s ease-in-out' },

  pipelineWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '520px' },
  pipelineGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%' },
  pipelineStep: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px', borderRadius: '10px',
    border: '1px solid', transition: 'all 0.3s ease',
  },
  pipelineIcon: { fontSize: '1.1rem', flexShrink: 0 },
  pipelineLabel: { flex: 1, fontSize: '0.82rem', fontWeight: '600', textAlign: 'left' },
  pipelineStatusIcon: { flexShrink: 0, display: 'flex', alignItems: 'center' },

  uploadCompleted: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },

  listSection: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { fontSize: '1.3rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  docCard: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  docCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  docIconWrapper: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    background: 'none', border: 'none', color: 'hsl(var(--text-dark))',
    cursor: 'pointer', padding: '6px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all var(--transition-fast)',
  },
  docCardBody: { flex: 1 },
  docCardTitle: {
    fontSize: '1rem', fontWeight: '600', color: 'hsl(var(--text-main))',
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    lineHeight: '1.4', marginBottom: '6px',
  },
  docCardDate: { fontSize: '0.75rem', color: 'hsl(var(--text-dark))' },
  docCardActions: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  actionBtn: { padding: '8px 4px', fontSize: '0.72rem', borderRadius: '6px', gap: '3px' },
  centerLoading: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px' },
  emptyContainer: {
    padding: '60px 20px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
  },
  emptyIcon: { color: 'hsl(var(--text-dark))', opacity: 0.5 },
  emptyTitle: { fontSize: '1.1rem', fontWeight: '600' },
  emptySubtitle: { fontSize: '0.85rem', color: 'hsl(var(--text-muted))', maxWidth: '340px', lineHeight: '1.5' },
};
