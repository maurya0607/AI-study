import React, { useState, useEffect, useRef } from 'react';
import supabase from '../services/supabaseClient';
import { solveDoubt as apiSolveDoubt } from '../services/aiService';
import { MessageSquare, Send, Sparkles, User, FileText, ChevronRight, HelpCircle, Trash2 } from 'lucide-react';

export default function Doubts({ user, activeDocId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(activeDocId || '');
  const [selectedDocText, setSelectedDocText] = useState('');
  const [loading, setLoading] = useState(false);

  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      const doc = documents.find(d => d.id === selectedDocId);
      if (doc) {
        setSelectedDocText(doc.extracted_text || '');

        setMessages([
          {
            id: 'init',
            sender: 'ai',
            text: `Hi there! I am your AI teaching assistant. I've indexed **${doc.file_name}**. Ask me any question about its formulas, concepts, or details.`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } else {
      setSelectedDocText('');
      setMessages([
        {
          id: 'init',
          sender: 'ai',
          text: "Hi! Select a document from the left to start a context-scoped chat session, or ask me general study questions.",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [selectedDocId, documents]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('documents').select('*');
      if (error) throw error;
      setDocuments(data || []);
      
      if (activeDocId) {
        setSelectedDocId(activeDocId);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this study material? All notes, quizzes, and flashcards will also be deleted.')) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
      setDocuments(documents.filter(d => d.id !== docId));
      if (selectedDocId === docId) {
        setSelectedDocId('');
      }
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || sending) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: inputVal.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputVal('');
    setSending(true);

    try {

      const result = await apiSolveDoubt(user.id, selectedDocText, userMessage.text);
      
      const providerLabel = result.usedProvider === 'gemini' ? '✨ Gemini' 
        : result.usedProvider === 'groq' ? '⚡ Groq' 
        : result.usedProvider === 'mock' ? '🔧 Mock' 
        : '';

      const aiMessage = {
        id: result.id || crypto.randomUUID(),
        sender: 'ai',
        text: result.answer,
        provider: providerLabel,
        timestamp: result.created_at || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Failed to get answer:', err);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: `⚠️ **Failed to connect to AI server**: ${err.message}. Please verify the backend is running and env keys are loaded.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setSending(false);
    }
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
      if (line.startsWith('> ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        let content = line.substring(2).trim();
        if (content.startsWith('[!NOTE]')) {
          html.push(`<blockquote><strong>Note:</strong> ${parseInline(content.replace('[!NOTE]', ''))}</blockquote>`);
        } else if (content.startsWith('[!TIP]')) {
          html.push(`<blockquote><strong>Tip:</strong> ${parseInline(content.replace('[!TIP]', ''))}</blockquote>`);
        } else {
          html.push(`<blockquote>${parseInline(content)}</blockquote>`);
        }
        continue;
      }
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push(`<li>${parseInline(line.trim().substring(2))}</li>`);
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
    if (inList) html.push('</ul>');
    return html.join('');
  };

  return (
    <div style={styles.container} className="animate-fade-in doubts-container">
      <div style={styles.layout} className="doubts-layout">
        {}
        <div style={styles.sidebar} className="glass-card doubts-sidebar">
          <h3 style={styles.sidebarTitle}>Context Documents</h3>
          
          <button
            onClick={() => setSelectedDocId('')}
            style={{
              ...styles.sidebarItem,
              background: selectedDocId === '' ? 'rgba(124, 58, 237, 0.15)' : 'none',
              borderColor: selectedDocId === '' ? 'hsl(var(--primary))' : 'transparent',
              color: selectedDocId === '' ? '#d8b4fe' : 'inherit'
            }}
          >
            <HelpCircle size={16} />
            <span style={styles.sidebarItemName}>General Assistant</span>
          </button>
          
          <div style={styles.sidebarDivider}></div>

          {loading ? (
            <div style={styles.sidebarLoading}><div className="loading-spinner"></div></div>
          ) : documents.length > 0 ? (
            <div style={styles.sidebarList}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  style={{
                    ...styles.sidebarItem,
                    background: selectedDocId === doc.id ? 'rgba(124, 58, 237, 0.15)' : 'none',
                    borderColor: selectedDocId === doc.id ? 'hsl(var(--primary))' : 'transparent',
                    color: selectedDocId === doc.id ? '#d8b4fe' : 'inherit'
                  }}
                >
                  <FileText size={16} />
                  <span style={styles.sidebarItemName} title={doc.file_name}>{doc.file_name}</span>
                  <button 
                    onClick={(e) => handleDelete(e, doc.id)}
                    style={styles.deleteSidebarBtn}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.sidebarEmpty}>
              <p>No materials uploaded.</p>
            </div>
          )}
        </div>

        {}
        <div style={styles.chatWindow} className="glass-card doubts-chat-window">
          {}
          <div style={styles.chatHeader}>
            <div style={styles.chatHeaderDetails}>
              <MessageSquare size={20} color="#a78bfa" />
              <div>
                <h3 style={styles.chatHeaderTitle}>Doubt Solver</h3>
                <span style={styles.chatHeaderStatus}>
                  Context: {selectedDocId ? documents.find(d => d.id === selectedDocId)?.file_name : 'General Assistant'}
                </span>
              </div>
            </div>
          </div>

          {}
          <div style={styles.feed}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.sender === 'ai' && (
                  <div style={styles.aiAvatar}>
                    <Sparkles size={14} color="#fff" />
                  </div>
                )}
                
                <div
                  style={{
                    ...styles.bubble,
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.03)',
                    border: msg.sender === 'user' ? 'none' : '1px solid hsl(var(--border-glass))',
                    borderRadius: msg.sender === 'user' 
                      ? '16px 16px 0px 16px' 
                      : '16px 16px 16px 0px',
                  }}
                >
                  {msg.sender === 'user' ? (
                    <p style={styles.userText}>{msg.text}</p>
                  ) : (
                    <div 
                      className="markdown-body"
                      style={styles.aiText}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                    />
                  )}
                  <span style={styles.timeString}>
                    {msg.provider && (
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        padding: '1px 7px',
                        borderRadius: '8px',
                        marginRight: '6px',
                        background: msg.provider.includes('Gemini') 
                          ? 'rgba(59, 130, 246, 0.15)' 
                          : msg.provider.includes('Groq') 
                            ? 'rgba(249, 115, 22, 0.15)' 
                            : 'rgba(255,255,255,0.05)',
                        color: msg.provider.includes('Gemini') 
                          ? '#60a5fa' 
                          : msg.provider.includes('Groq') 
                            ? '#fb923c' 
                            : 'hsl(var(--text-dark))',
                        border: msg.provider.includes('Gemini')
                          ? '1px solid rgba(59, 130, 246, 0.25)'
                          : msg.provider.includes('Groq')
                            ? '1px solid rgba(249, 115, 22, 0.25)'
                            : '1px solid rgba(255,255,255,0.08)',
                      }}>
                        {msg.provider}
                      </span>
                    )}
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div style={styles.userAvatar}>
                    <User size={14} color="#fff" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div style={styles.messageRow}>
                <div style={styles.aiAvatar}>
                  <Sparkles size={14} color="#fff" />
                </div>
                <div style={{ ...styles.bubble, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border-glass))', borderRadius: '16px 16px 16px 0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="loading-spinner" style={styles.spinnerSm}></div>
                  <span style={styles.loadingText}>AI is thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {}
          <form onSubmit={handleSend} style={styles.chatForm}>
            <input
              type="text"
              placeholder="Ask a doubt about the selected material..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              style={styles.input}
              className="input-field"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || sending}
              style={styles.sendBtn}
              className={`btn btn-primary ${(!inputVal.trim() || sending) ? 'btn-disabled' : ''}`}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: 'calc(100vh - 140px)',
    display: 'flex',
    flexDirection: 'column'
  },
  layout: {
    display: 'flex',
    gap: '24px',
    height: '100%',
    flex: 1
  },
  sidebar: {
    width: '280px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto'
  },
  sidebarTitle: {
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'hsl(var(--text-dark))',
    marginBottom: '8px',
    fontWeight: '700'
  },
  sidebarDivider: {
    height: '1px',
    backgroundColor: 'hsl(var(--border-glass))',
    margin: '4px 0'
  },
  sidebarItem: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    overflow: 'hidden'
  },
  sidebarItemName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  deleteSidebarBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--error))',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'all 0.2s ease',
  },
  sidebarLoading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px'
  },
  sidebarEmpty: {
    padding: '10px',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-dark))',
    textAlign: 'center'
  },
  chatWindow: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid hsl(var(--border-glass))',
    background: 'rgba(255, 255, 255, 0.01)'
  },
  chatHeaderDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  chatHeaderTitle: {
    fontSize: '1.05rem',
    fontWeight: '600'
  },
  chatHeaderStatus: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))'
  },
  feed: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  messageRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    width: '100%'
  },
  aiAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-pink)) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  bubble: {
    maxWidth: '75%',
    padding: '14px 18px',
    position: 'relative'
  },
  userText: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#fff',
    whiteSpace: 'pre-wrap'
  },
  aiText: {
    fontSize: '0.95rem'
  },
  timeString: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'hsl(var(--text-dark))',
    marginTop: '6px',
    textAlign: 'right'
  },
  spinnerSm: {
    width: '14px',
    height: '14px',
    borderWidth: '2px'
  },
  loadingText: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))'
  },
  chatForm: {
    padding: '16px 20px',
    borderTop: '1px solid hsl(var(--border-glass))',
    display: 'flex',
    gap: '12px',
    background: 'rgba(255,255,255,0.01)'
  },
  input: {
    flex: 1
  },
  sendBtn: {
    width: '46px',
    height: '46px',
    padding: 0,
    borderRadius: 'var(--radius-sm)'
  }
};
