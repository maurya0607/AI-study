import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { generateNotes as apiGenerateNotes } from '../services/aiService';
import { BookOpen, FileText, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';

export default function Notes({ user, activeDocId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(activeDocId || '');
  const [selectedDocText, setSelectedDocText] = useState('');
  const [activeStyle, setActiveStyle] = useState('detailed');
  const [notesRecord, setNotesRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      loadNotesForDoc(selectedDocId, activeStyle);
      
      const doc = documents.find(d => d.id === selectedDocId);
      if (doc) {
        setSelectedDocText(doc.extracted_text || '');
      }
    } else {
      setNotesRecord(null);
    }
  }, [selectedDocId, activeStyle, documents]);

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

  const loadNotesForDoc = async (docId, style) => {
    setLoading(true);
    setNotesRecord(null);
    try {

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {

        setNotesRecord(data[0]);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDocId || !selectedDocText) return;
    
    setGenerating(true);
    setNotesRecord(null);
    try {
      const result = await apiGenerateNotes(selectedDocId, selectedDocText, activeStyle);
      setNotesRecord(result);
    } catch (err) {
      console.error('Failed to generate notes:', err);
      alert('Notes generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!notesRecord?.generated_notes) return;
    navigator.clipboard.writeText(notesRecord.generated_notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (mdText) => {
    if (!mdText) return '';
    
    const lines = mdText.split('\n');
    let inList = false;
    let inCode = false;
    let codeBuffer = [];
    const html = [];
    
    const parseInline = (text) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        if (inCode) {
          html.push(`<pre><code>${codeBuffer.join('\n')}</code></pre>`);
          codeBuffer = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }
      
      if (inCode) {
        codeBuffer.push(line);
        continue;
      }

      if (line.startsWith('# ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<h1>${parseInline(line.substring(2))}</h1>`);
        continue;
      }
      if (line.startsWith('## ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<h2>${parseInline(line.substring(3))}</h2>`);
        continue;
      }
      if (line.startsWith('### ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<h3>${parseInline(line.substring(4))}</h3>`);
        continue;
      }

      if (line.trim() === '---') {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push('<hr />');
        continue;
      }

      if (line.startsWith('> ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        let content = line.substring(2).trim();
        
        if (content.startsWith('[!NOTE]')) {
          html.push(`<blockquote><strong>Note:</strong> ${parseInline(content.replace('[!NOTE]', ''))}</blockquote>`);
        } else if (content.startsWith('[!TIP]')) {
          html.push(`<blockquote><strong>Tip:</strong> ${parseInline(content.replace('[!TIP]', ''))}</blockquote>`);
        } else if (content.startsWith('[!WARNING]')) {
          html.push(`<blockquote><strong>Warning:</strong> ${parseInline(content.replace('[!WARNING]', ''))}</blockquote>`);
        } else {
          html.push(`<blockquote>${parseInline(content)}</blockquote>`);
        }
        continue;
      }

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        const bulletContent = line.trim().substring(2);
        html.push(`<li>${parseInline(bulletContent)}</li>`);
        continue;
      }

      if (inList && line.trim() === '') {
        html.push('</ul>');
        inList = false;
        continue;
      }

      if (line.trim() !== '') {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<p>${parseInline(line)}</p>`);
      }
    }
    
    if (inList) {
      html.push('</ul>');
    }
    
    return html.join('');
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AI Notes Generator</h1>
          <p style={styles.subtitle}>Transform documents into structured outlines and exam digests.</p>
        </div>
      </div>

      {}
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
          <label className="input-label" style={styles.label}>Study Notes Format</label>
          <div style={styles.tabsContainer}>
            {['detailed', 'summary', 'exam', 'bullet'].map((styleName) => (
              <button
                key={styleName}
                onClick={() => setActiveStyle(styleName)}
                style={{
                  ...styles.tabBtn,
                  background: activeStyle === styleName ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: activeStyle === styleName ? 'hsl(var(--primary))' : 'hsl(var(--border-glass))',
                  color: activeStyle === styleName ? '#fff' : 'hsl(var(--text-main))'
                }}
              >
                {styleName.charAt(0).toUpperCase() + styleName.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {}
      <div style={styles.displaySection}>
        {!selectedDocId ? (
          <div style={styles.infoState} className="glass-card">
            <FileText size={48} style={styles.infoIcon} />
            <h3>Select a Document</h3>
            <p>Choose an uploaded study material from the dropdown above to view or generate study notes.</p>
          </div>
        ) : loading ? (
          <div style={styles.centerLoading}><div className="loading-spinner"></div></div>
        ) : notesRecord ? (
          <div style={styles.notesContainer} className="glass-card">
            <div style={styles.notesHeader}>
              <div style={styles.notesTitleSection}>
                <BookOpen size={20} color="#a78bfa" />
                <span style={styles.notesSubtitle}>{activeStyle.toUpperCase()} NOTES</span>
              </div>
              <button onClick={handleCopy} style={styles.copyBtn} className="btn btn-secondary">
                {copied ? <Check size={16} color="hsl(var(--success))" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>
            <div 
              className="markdown-body" 
              style={styles.markdownBody}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(notesRecord.generated_notes) }}
            />
          </div>
        ) : (
          <div style={styles.infoState} className="glass-card">
            {generating ? (
              <div style={styles.generatingState}>
                <div className="loading-spinner" style={styles.spinnerLg}></div>
                <h3 className="animate-pulse-glow" style={styles.generatingTitle}>
                  Generating {activeStyle} notes with AI...
                </h3>
                <p style={styles.generatingSub}>Reading text context, structuring concepts, and formatting Markdown</p>
              </div>
            ) : (
              <>
                <Sparkles size={48} style={{ color: 'hsl(var(--accent-purple))', marginBottom: '16px' }} />
                <h3>Generate Notes for this Material</h3>
                <p>No study notes have been generated for this file using the "{activeStyle}" format yet.</p>
                <button 
                  onClick={handleGenerate} 
                  style={styles.generateBtn}
                  className="btn btn-primary"
                  disabled={!selectedDocText}
                >
                  ✨ Generate {activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)} Notes
                </button>
                {!selectedDocText && (
                  <p style={styles.warnText}>
                    <AlertCircle size={14} /> Warning: Selected document text is empty. Notes cannot be generated.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
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
    color: 'hsl(var(--text-main))',
    fontWeight: '500',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  displaySection: {
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column'
  },
  notesContainer: {
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'rgba(20,20,28,0.4)'
  },
  notesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid hsl(var(--border-glass))',
    paddingBottom: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '14px'
  },
  notesTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  notesSubtitle: {
    fontSize: '0.8rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#a78bfa'
  },
  copyBtn: {
    padding: '8px 14px',
    fontSize: '0.8rem',
    gap: '6px',
    borderRadius: 'var(--radius-sm)'
  },
  markdownBody: {
    padding: '10px 0'
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
    color: '#a78bfa'
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
};
