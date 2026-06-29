import React, { useState } from 'react';
import supabase, { isSupabaseConfigured } from '../services/supabaseClient';
import { Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (usePhone && !isRegistering) {
        if (!phone) return;
        await new Promise(r => setTimeout(r, 800)); // Simulate latency
        if (isSupabaseConfigured) {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
          setErrorMsg('An OTP code has been sent to your phone!');
        } else {
          // Local sandbox mode logic
          const mockUser = {
            id: 'phone-mock-' + crypto.randomUUID(),
            email: phone + '@phone.aistudy.com',
            name: 'Phone User (' + phone + ')',
            created_at: new Date().toISOString()
          };
          // Save to mock DB
          const users = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
          if (!users.find(u => u.email === mockUser.email)) {
            users.push(mockUser);
            localStorage.setItem('mock_db_users', JSON.stringify(users));
          }
          localStorage.setItem('mock_session_user', JSON.stringify(mockUser));
          onAuthSuccess(mockUser);
        }
      } else {
        if (!email || !password) return;
        if (isRegistering) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name: name || email.split('@')[0] }
            }
          });
          
          if (error) throw error;

          if (isSupabaseConfigured) {
            setErrorMsg('Registration successful! Please check your email to verify.');
          } else {
            const loginRes = await supabase.auth.signInWithPassword({ email, password });
            if (loginRes.error) throw loginRes.error;
            onAuthSuccess(loginRes.data.user);
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          onAuthSuccess(data.user);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } else {
        // Mock Google login
        await new Promise(r => setTimeout(r, 1000));
        const mockUser = {
          id: 'google-mock-' + crypto.randomUUID(),
          email: 'googleuser@aistudy.com',
          name: 'Google User',
          created_at: new Date().toISOString()
        };
        const users = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
        if (!users.find(u => u.email === mockUser.email)) {
          users.push(mockUser);
          localStorage.setItem('mock_db_users', JSON.stringify(users));
        }
        localStorage.setItem('mock_session_user', JSON.stringify(mockUser));
        onAuthSuccess(mockUser);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'guest@aistudy.com',
        password: 'guestpassword123'
      });
      if (error) throw error;
      onAuthSuccess(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes wave {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }
        .auth-input {
          background-color: #0c1427 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          outline: none !important;
          font-family: var(--font-body) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .auth-input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
          background-color: #0e1a34 !important;
        }
        .auth-submit-btn {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
          box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3) !important;
          border: none !important;
          transition: all 0.25s ease !important;
        }
        .auth-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
          box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.45) !important;
          transform: translateY(-1px);
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .auth-google-btn {
          background-color: #0c1427 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          transition: all 0.2s ease !important;
        }
        .auth-google-btn:hover:not(:disabled) {
          background-color: #0f1c36 !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-1px);
        }
        .auth-google-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .auth-link {
          color: #3b82f6 !important;
          font-weight: 500;
          transition: color 0.2s !important;
          cursor: pointer;
          border: none;
          background: none;
          padding: 0;
          font-family: inherit;
        }
        .auth-link:hover {
          color: #60a5fa !important;
          text-decoration: underline !important;
        }
      `}</style>

      {/* Ambient background glow */}
      <div style={styles.glowOrb1}></div>
      <div style={styles.glowOrb2}></div>

      <div style={styles.card} className="animate-fade-in">
        <div style={styles.header}>
          <div style={styles.welcomeText}>
            Hey! <span style={{ animation: 'wave 2.2s infinite', display: 'inline-block', transformOrigin: '70% 70%' }}>👋</span>
          </div>
          <h1 style={styles.title}>
            Welcome to <span style={styles.brandText}>AiStudy</span>
          </h1>
          <p style={styles.subtitle}>Simplify your login process with one-click Google access.</p>
        </div>

        {errorMsg && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{errorMsg}</p>
          </div>
        )}

        <div style={styles.formContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>{isRegistering ? 'Sign Up' : 'Login'}</span>
          </div>

          <form onSubmit={handleAuth} style={styles.form}>
            {isRegistering && (
              <div style={styles.inputContainer}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Full Name</label>
                </div>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                    className="auth-input"
                    required={isRegistering}
                  />
                </div>
              </div>
            )}

            {!isRegistering && usePhone ? (
              <div style={styles.inputContainer}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Phone Number</label>
                  <button
                    type="button"
                    onClick={() => setUsePhone(false)}
                    style={styles.toggleLink}
                    className="auth-link"
                  >
                    Use email address
                  </button>
                </div>
                <div style={styles.inputWrapper}>
                  <Phone size={18} style={styles.inputIcon} />
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={styles.input}
                    className="auth-input"
                    required={usePhone}
                  />
                </div>
              </div>
            ) : (
              <div style={styles.inputContainer}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Email Address</label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={() => setUsePhone(true)}
                      style={styles.toggleLink}
                      className="auth-link"
                    >
                      Use phone number
                    </button>
                  )}
                </div>
                <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    className="auth-input"
                    required={!usePhone || isRegistering}
                  />
                </div>
              </div>
            )}

            {(!usePhone || isRegistering) && (
              <div style={styles.inputContainer}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Password</label>
                </div>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    className="auth-input"
                    required={!usePhone || isRegistering}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={styles.submitBtn}
              className="auth-submit-btn"
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <span>{isRegistering ? 'Sign Up' : 'Login'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.googleBtn}
          className="auth-google-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.13h4.01c2.34-2.16 3.68-5.32 3.68-8.75z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.01-3.13c-1.11.75-2.53 1.19-3.92 1.19-3.02 0-5.58-2.04-6.49-4.78H1.36v3.25C3.34 21.56 7.42 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.51 14.37a7.22 7.22 0 0 1 0-4.74V6.38H1.36a11.96 11.96 0 0 0 0 11.24l4.15-3.25z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.42 0 3.34 2.44 1.36 6.38l4.15 3.25C6.42 6.79 8.98 4.75 12 4.75z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div style={styles.footer}>
          <span style={{ marginRight: '4px' }}>
            {isRegistering ? 'Already have an Account ?' : 'Do not have an Account ?'}
          </span>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}
            style={styles.footerLink}
            className="auth-link"
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <div style={styles.sandboxContainer}>
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            style={styles.guestBtn}
            className="auth-guest-btn"
          >
            🔑 Quick Sandbox Guest Login
          </button>
          <div style={styles.modeBadge}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isSupabaseConfigured ? '#10b981' : '#f59e0b',
              marginRight: '6px'
            }}></span>
            {isSupabaseConfigured ? 'Supabase Connected' : 'Local Sandbox Mode'}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 50%, #0a1329 0%, #040814 100%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
    fontFamily: 'var(--font-body)'
  },
  glowOrb1: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%)',
    top: '-10%',
    left: '-10%',
    filter: 'blur(60px)',
    pointerEvents: 'none'
  },
  glowOrb2: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0) 70%)',
    bottom: '-10%',
    right: '-10%',
    filter: 'blur(60px)',
    pointerEvents: 'none'
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    padding: '36px 30px',
    borderRadius: '16px',
    backgroundColor: '#09132a',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
    zIndex: 10
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    marginBottom: '26px'
  },
  welcomeText: {
    fontFamily: 'var(--font-title)',
    fontSize: '2rem',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.2',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: '2rem',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.2',
    marginBottom: '10px'
  },
  brandText: {
    color: '#3b82f6',
    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#768596',
    lineHeight: '1.4',
    margin: '0'
  },
  errorContainer: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px'
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.85rem',
    lineHeight: '1.4',
    margin: 0
  },
  formContainer: {
    width: '100%'
  },
  sectionHeader: {
    marginBottom: '14px'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'var(--font-title)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column'
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#768596',
    fontFamily: 'var(--font-title)'
  },
  toggleLink: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '0',
    fontFamily: 'var(--font-title)'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#768596',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 42px',
    borderRadius: '8px',
    fontSize: '0.95rem'
  },
  submitBtn: {
    marginTop: '6px',
    padding: '13px 20px',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    margin: '22px 0',
    color: '#556575',
    fontSize: '0.85rem'
  },
  dividerLine: {
    flex: 1,
    height: '0px',
    borderTop: '1px dashed rgba(255, 255, 255, 0.15)'
  },
  dividerText: {
    fontSize: '0.85rem',
    color: '#768596'
  },
  googleBtn: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '0.95rem',
    fontWeight: '500',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '24px',
    fontSize: '0.85rem',
    color: '#768596'
  },
  footerLink: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontWeight: '600',
    cursor: 'pointer',
    paddingLeft: '4px',
    fontSize: 'inherit'
  },
  sandboxContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '22px',
    paddingTop: '18px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    gap: '12px'
  },
  guestBtn: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: '#d1d5db',
    transition: 'all 0.2s'
  },
  modeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '0.75rem',
    color: '#768596'
  }
};
