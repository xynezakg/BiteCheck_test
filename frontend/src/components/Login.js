import React, { useState, useEffect } from 'react';
import { loginWithGoogle } from '../api';
import { ShieldCheck, ArrowLeft, Loader2, X, AlertTriangle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import bgMain from '../Background_img/wmremove-transformed.png';

export default function Login({ navigate }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [showToaModal, setShowToaModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [academicLevel, setAcademicLevel] = useState('');
  const [modalError, setModalError] = useState('');

  const handleAcceptToa = async () => {
    if (pendingCredential) {
      if (!academicLevel) {
        setModalError('Please select your academic level.');
        return;
      }
      setModalError('');
      setShowToaModal(false);
      setShowPrivacyModal(false);
      setError('');
      await handleGoogleCredentialResponse({ credential: pendingCredential }, true, academicLevel);
    } else {
      setShowToaModal(false);
      setShowPrivacyModal(false);
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Configuration Error: REACT_APP_GOOGLE_CLIENT_ID is not defined in your environment.");
      return;
    }

    // Dynamic Google OAuth Identity Services Loader
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse
          });

          const btnContainer = document.getElementById('googleSignInBtn');
          if (btnContainer) {
            window.google.accounts.id.renderButton(
              btnContainer,
              { theme: 'outline', size: 'large', width: '300', text: 'continue_with' }
            );
          }
        } catch (e) {
          console.error("Google GSI initialization error:", e);
          setError("Failed to initialize Google Sign-In.");
        }
      }
    };
    script.onerror = () => {
      setError("Failed to load Google Sign-In library.");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleCredentialResponse = async (response, forceAccept = false, chosenLevel = null) => {
    if (loading) return;
    const token = response.credential;
    setError('');
    setLoading(true);

    try {
      const data = await loginWithGoogle(token, forceAccept, chosenLevel);

      if (data.toaRequired) {
        setPendingCredential(token);
        setAcademicLevel('');
        setModalError('');
        setShowToaModal(true);
        setLoading(false);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        localStorage.setItem('ua_token', data.token);
        localStorage.setItem('ua_user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('ua_token', data.token);
        sessionStorage.setItem('ua_user', JSON.stringify(data.user));
      }

      if (data.user.role === 'admin') {
        navigate('admin');
      } else {
        navigate('feedback');
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleNativeGoogleLogin = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      await GoogleAuth.initialize();
      const result = await GoogleAuth.signIn({ prompt: 'select_account' });
      if (result && result.authentication && result.authentication.idToken) {
        const idToken = result.authentication.idToken;
        await handleGoogleCredentialResponse({ credential: idToken });
      } else {
        setError('Failed to retrieve authentication token from Google.');
        setLoading(false);
      }
    } catch (err) {
      console.error("Native Google Login failed:", err);
      if (err.message && (err.message.toLowerCase().includes('cancel') || err.message.toLowerCase().includes('user cancelled'))) {
        setError('Google sign-in was cancelled.');
      } else {
        setError(err.message || 'Native Google authentication failed.');
      }
      setLoading(false);
    }
  };

  const colors = {
    navy: '#0C2340',
    gold: '#E5A823',
    red: '#C8102E',
    bg: '#F8FAFC',
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0'
  };

  return (
    <div className="lp-split" style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ─── RESPONSIVE CSS & GEIST FONT ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        
        /* Disable text selection and carets on static layout elements */
        h1, h2, h3, p, span, strong, div:not(#googleSignInBtn) {
          user-select: none;
          -webkit-user-select: none;
          cursor: default;
        }
        
        /* Ensure interactive elements keep correct cursors */
        button, a, svg, path {
          cursor: pointer;
        }
        
        /* ── DESKTOP DEFAULT (split side-by-side) ── */
        .lp-split { flex-direction: row; }
        .lp-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px; position: relative; }
        .lp-form-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 60px 40px; background: #F8FAFC; }
        .lp-form-inner { 
          width: 100%; 
          max-width: 500px; 
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .lp-back-btn { position: absolute; bottom: 40px; left: 60px; }
        .lp-brand { position: absolute; top: 40px; left: 60px; display: flex; align-items: center; gap: 16px; }
        .lp-logo { width: 54px; }
        .lp-hero-title { font-size: 52px; }
        .lp-hero-desc { font-size: 17px; }
        .lp-univ-title { font-size: 15px; }
        .lp-univ-sub { font-size: 12px; }
        .mobile-form-heading { display: none; }
        .desktop-form-heading { display: block; }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* ── TABLET (769px – 900px) ── */
        @media (min-width: 769px) and (max-width: 900px) {
          .lp-split { flex-direction: column; }
          .lp-hero { padding: 80px 24px 48px 24px; align-items: center; text-align: center; }
          .lp-form-panel { padding: 40px 24px 60px 24px; border-top-left-radius: 28px; border-top-right-radius: 28px; align-items: center; }
          .lp-back-btn { position: absolute; top: 20px; left: 20px; bottom: auto; }
          .lp-brand { position: relative; top: 0; left: 0; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 24px; text-align: center; }
          .lp-hero-title { font-size: 36px; }
          .lp-hero-desc { font-size: 15px; }
        }
        
        /* ── MOBILE (≤ 768px) ── */
        @media (max-width: 768px) {
          .lp-split {
            flex-direction: column;
            min-height: 100vh;
            height: 100vh;
            overflow: hidden;
          }
          .lp-hero {
            flex: none;
            height: 38vh;
            min-height: 240px;
            max-height: 320px;
            padding: 0 28px;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            display: flex;
            flex-direction: column;
          }
          .lp-back-btn {
            position: absolute;
            top: 18px;
            left: 18px;
            bottom: auto;
            color: rgba(255,255,255,0.6) !important;
            font-size: 13px !important;
            gap: 6px !important;
          }
          .lp-brand {
            position: relative;
            top: auto;
            left: auto;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            text-align: center;
          }
          .lp-logo {
            width: 56px;
            height: 56px;
            object-fit: contain;
          }
          .lp-univ-title {
            font-size: 11px;
            letter-spacing: 0.12em;
            font-weight: 700;
          }
          .lp-univ-sub {
            font-size: 9px;
            letter-spacing: 0.15em;
            margin-top: 1px;
          }
          .lp-hero-title {
            font-size: 28px;
            margin-bottom: 8px !important;
            font-weight: 800;
            letter-spacing: -0.02em;
          }
          .lp-hero-title span {
            color: #E5A823;
          }
          .lp-hero-desc {
            display: block !important;
            font-size: 14px;
            color: rgba(255,255,255,0.75) !important;
            max-width: 320px;
            line-height: 1.5;
            margin: 0 auto;
            font-weight: 400;
          }
          
          .lp-form-panel {
            flex: 1;
            background: #FFFFFF;
            border-top-left-radius: 28px;
            border-top-right-radius: 28px;
            border-top: 1px solid rgba(12, 35, 64, 0.08);
            border-left: 1px solid rgba(12, 35, 64, 0.05);
            border-right: 1px solid rgba(12, 35, 64, 0.05);
            padding: 32px 24px;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            position: relative;
            z-index: 2;
            margin-top: -24px;
            box-shadow: 0 -6px 24px rgba(12, 35, 64, 0.06);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
          }
          .lp-form-inner {
            width: 100%;
            max-width: 100%;
            margin-top: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .mobile-form-heading {
            display: block !important;
            margin-bottom: 24px;
            text-align: center;
          }
          .mobile-form-heading h2 {
            font-size: 28px;
            font-weight: 800;
            color: #0C2340;
            margin: 0 0 10px 0;
            letter-spacing: -0.03em;
            line-height: 1.15;
          }
          .mobile-form-heading h2 span {
            color: #E5A823;
          }
          .mobile-form-heading p {
            font-size: 14.5px;
            color: #64748B;
            margin: 0 auto;
            line-height: 1.5;
            font-weight: 400;
            max-width: 290px;
          }
          .desktop-form-heading {
            display: none !important;
          }
        }
        
        /* ── VERY SMALL PHONES (≤ 390px) ── */
        @media (max-width: 390px) {
          .lp-hero {
            min-height: 200px;
            height: 34vh;
            padding: 0 20px;
          }
          .lp-form-panel {
            padding: 24px 16px;
          }
          .lp-hero-title {
            font-size: 24px;
          }
          .lp-logo {
            width: 48px;
            height: 48px;
          }
          .lp-hero-desc {
            font-size: 13px;
          }
          .mobile-form-heading h2 {
            font-size: 24px;
          }
        }
      `}</style>

      {/* ── LEFT: HERO SECTION ── */}
      <div className="lp-hero" style={{
        backgroundImage: `linear-gradient(rgba(12, 35, 64, 0.85), rgba(12, 35, 64, 0.92)), url(${bgMain})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: colors.white
      }}>
        {/* Return Home Button */}
        <button
          className="lp-back-btn"
          onClick={() => navigate('landing')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            transition: 'color 0.2s', fontFamily: 'inherit'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        >
          <ArrowLeft size={18} /> Return Home
        </button>

        {/* Branding */}
        <div className="lp-brand">
          <img src="/ua-logo.png" alt="UA Logo" className="lp-logo" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lp-univ-title" style={{ fontWeight: 700, letterSpacing: '0.08em', color: colors.white, lineHeight: 1.2 }}>
              UNIVERSITY OF THE ASSUMPTION
            </span>
            <span className="lp-univ-sub" style={{ fontWeight: 600, color: colors.gold, letterSpacing: '0.15em', marginTop: '2px' }}>
              SECURE PORTAL
            </span>
          </div>
        </div>

        {/* Center content */}
        <div style={{ maxWidth: '480px', marginTop: '10px' }} className="desktop-form-heading">
          <h1 className="lp-hero-title" style={{ fontWeight: 700, margin: '0 0 16px 0', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            Secure Identity<br />
            <span style={{ color: colors.gold }}>Verification</span>
          </h1>
          <p className="lp-hero-desc" style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            Log in with your official University of the Assumption credentials to securely sign and submit encrypted data.
          </p>
        </div>
      </div>

      {/* ── RIGHT: FORM PANEL ── */}
      <div className="lp-form-panel">
        <div className="lp-form-inner">

          {/* ── MOBILE heading ── */}
          <div className="mobile-form-heading">
            <h2>Welcome to <span>BiteCheck</span></h2>
            <p>Use your official University of the Assumption Google account to continue.</p>
          </div>

          {/* ── DESKTOP form header ── */}
          <div className="desktop-form-heading" style={{ marginBottom: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Welcome to <span style={{ color: colors.gold }}>BiteCheck</span>
            </h2>
            <p style={{ fontSize: '15px', color: colors.textMuted, margin: 0, lineHeight: 1.5, maxWidth: '340px' }}>
              Use your official University of the Assumption Google account to continue.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2', color: '#EF4444',
              padding: '14px 18px', borderRadius: '10px', fontSize: '14px',
              fontWeight: 500, marginBottom: '24px', border: '1px solid #FCA5A5',
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', maxWidth: '300px', boxSizing: 'border-box'
            }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Button / Spinner */}
          {loading && !Capacitor.isNativePlatform() && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', margin: '30px 0' }}>
              <Loader2 size={36} color={colors.navy} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: 500 }}>Signing you in...</span>
            </div>
          )}

          <div style={{
            display: (loading && !Capacitor.isNativePlatform()) ? 'none' : 'flex',
            flexDirection: 'column',
            gap: '16px',
            margin: '10px 0',
            width: '100%',
            maxWidth: '300px',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* 2. Web Google Button Container (always in DOM, visible) */}
            {!Capacitor.isNativePlatform() && (
              <div 
                id="googleSignInBtn" 
                style={{ 
                  width: '100%', 
                  minHeight: '52px', 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              ></div>
            )}

            {/* 3. Native Google Button (always visible, handles error dynamically) */}
            {Capacitor.isNativePlatform() && (
              <button
                type="button"
                onClick={handleNativeGoogleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: '52px',
                  borderRadius: '10px',
                  border: `1.5px solid ${colors.border}`,
                  backgroundColor: colors.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: colors.text,
                  cursor: loading ? 'default' : 'pointer',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.bg;
                    e.currentTarget.style.borderColor = colors.navy;
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colors.white;
                    e.currentTarget.style.borderColor = colors.border;
                  }
                }}
              >
                {loading ? (
                  <Loader2 size={20} color={colors.navy} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M12 5.04c1.67 0 3.19.57 4.38 1.69l3.27-3.27C17.67 1.54 14.99 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.27 7.55 8.91 5.04 12 5.04z" /><path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.49z" /><path fill="#FBBC05" d="M5.36 14.5c-.24-.71-.38-1.47-.38-2.5s.14-1.79.38-2.5L1.5 6.5C.54 8.42 0 10.15 0 12s.54 3.58 1.5 5.5l3.86-3z" /><path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.9 1.09-3.09 0-5.73-2.51-6.64-5.46l-3.86 3C3.4 20.35 7.35 23 12 23z" /></svg>
                )}
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>
            )}
          </div>

          {/* TOA Text Disclaimer (Centered below the Google buttons bar) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '16px 0 0 0',
            width: '100%',
            maxWidth: '300px',
            boxSizing: 'border-box'
          }}>
            <span 
              style={{ 
                fontSize: '12.5px', 
                color: colors.textMuted, 
                userSelect: 'none',
                letterSpacing: 'normal',
                fontWeight: 500,
                textAlign: 'center'
              }}
            >
              By continuing, you agree to the <span onClick={() => setShowToaModal(true)} style={{ color: colors.navy, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Terms of Agreement</span>.
            </span>
          </div>

          {/* Security Information rows */}
          <div style={{
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: `1.5px solid ${colors.border}`,
            width: '100%',
            maxWidth: '300px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: colors.textMuted, lineHeight: '1.4' }}>
              <ShieldCheck size={18} color={colors.navy} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Only authorized <strong>@ua.edu.ph</strong> accounts can access the system.</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─── TOA / TERMS OF AGREEMENT MODAL ─── */}
      {showToaModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(6, 19, 36, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '16px',
            width: '100%', maxWidth: '500px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden', border: `1px solid ${colors.border}`
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: colors.navy }}>Terms of Agreement</h3>
              <button onClick={() => setShowToaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '13.5px', lineHeight: 1.6, color: colors.text, textAlign: 'left' }}>
              {pendingCredential && (
                <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: `1.5px solid ${colors.border}` }}>
                  <h4 style={{ margin: '0 0 8px 0', color: colors.navy, fontSize: '14px', fontWeight: 700 }}>Select Academic Level</h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: colors.textMuted }}>Please specify your level to complete registration:</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['College', 'SHS', 'JHS'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => { setAcademicLevel(level); setModalError(''); }}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1.5px solid ${academicLevel === level ? colors.navy : colors.border}`,
                          backgroundColor: academicLevel === level ? colors.navy : colors.white,
                          color: academicLevel === level ? colors.white : colors.text,
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        {level === 'JHS' ? 'JHS / High School' : level}
                      </button>
                    ))}
                  </div>
                  {modalError && (
                    <div style={{ color: '#EF4444', fontSize: '12.5px', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>{modalError}</span>
                    </div>
                  )}
                </div>
              )}

              <p style={{ marginTop: 0 }}><strong>Effective Date: July 19, 2026</strong></p>
              <p>Welcome to BiteCheck! Before logging in with Google, you must agree to these Terms of Agreement:</p>
              <h4 style={{ color: colors.navy, margin: '16px 0 6px', fontSize: '14.5px', fontWeight: 700 }}>1. Authorized Access</h4>
              <p>You agree that you are accessing this portal using your official University of the Assumption account (<code>@ua.edu.ph</code>) and that all feedback you submit is authentic.</p>
              <h4 style={{ color: colors.navy, margin: '16px 0 6px', fontSize: '14.5px', fontWeight: 700 }}>2. Safe & Constructive Content</h4>
              <p>Reviews must remain constructive. Refrain from profane, defamatory, harassing, or commercial content. Violating reviews are subject to administration quarantine.</p>
              <h4 style={{ color: colors.navy, margin: '16px 0 6px', fontSize: '14.5px', fontWeight: 700 }}>3. Cryptographic Receipt validation</h4>
              <p>BiteCheck reviews generate verification signature hashes. These signatures are publicly auditable and linked to evaluation records to maintain tamper protection.</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', backgroundColor: colors.bg }}>
              <button 
                type="button" 
                onClick={handleAcceptToa}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: colors.navy, color: colors.white, fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                }}
              >
                Accept and Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRIVACY POLICY MODAL ─── */}
      {showPrivacyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(6, 19, 36, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '16px',
            width: '100%', maxWidth: '500px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden', border: `1px solid ${colors.border}`
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: colors.navy }}>Privacy Policy</h3>
              <button onClick={() => setShowPrivacyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '13.5px', lineHeight: 1.6, color: colors.text, textAlign: 'left' }}>
              <p style={{ marginTop: 0 }}><strong>Effective Date: July 19, 2026</strong></p>
              <p>Your privacy is important to us. Here is how BiteCheck manages your user information:</p>
              <h4 style={{ color: colors.navy, margin: '16px 0 6px', fontSize: '14.5px', fontWeight: 700 }}>1. Data Verification</h4>
              <p>We verify student logins via official University Google Accounts. We do NOT access your passwords, personal photos, or files.</p>
              <h4 style={{ color: colors.navy, margin: '16px 0 6px', fontSize: '14.5px', fontWeight: 700 }}>2. Feedback & Signatures</h4>
              <p>Review metrics and comments are logged inside a secure database, protected by source-level cryptographic signing verification receipts.</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', backgroundColor: colors.bg }}>
              <button 
                type="button" 
                onClick={handleAcceptToa}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: colors.navy, color: colors.white, fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                }}
              >
                Accept and Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
