import React, { useState, useEffect } from 'react';
import { loginUser, registerUser, forgotPassword, loginWithGoogle, completeGoogleOnboarding } from '../api';
import { Lock, User, ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff, GraduationCap } from 'lucide-react';
import bgMain from '../Background_img/wmremove-transformed.png';

export default function Login({ navigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [failureModal, setFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  
  // Form State
  const [uaId, setUaId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [academicLevel, setAcademicLevel] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [email, setEmail] = useState('');

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Google OAuth Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState('');
  const [onboardingUaId, setOnboardingUaId] = useState('');
  const [onboardingAcademicLevel, setOnboardingAcademicLevel] = useState('College');
  const [onboardingError, setOnboardingError] = useState('');

  useEffect(() => {
    // Dynamic Google OAuth Identity Services Loader
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '1043329061033-t91b1l4l8k31t59l8k31t59l8k31t59l.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse
        });
        
        // Render button if element is mounted
        const btnContainer = document.getElementById('googleSignInBtn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', width: '380' }
          );
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script from DOM on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin]); // Re-run when view mode toggles to ensure DOM target exists

  const handleGoogleCredentialResponse = async (response) => {
    const token = response.credential;
    setGoogleIdToken(token);
    setError('');
    setLoading(true);

    try {
      const data = await loginWithGoogle(token);
      
      if (data.requiresOnboarding) {
        setShowOnboarding(true);
        setLoading(false);
      } else {
        localStorage.setItem('ua_token', data.token);
        localStorage.setItem('ua_user', JSON.stringify(data.user));

        if (data.user.role === 'admin') {
          navigate('admin');
        } else {
          navigate('feedback');
        }
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setOnboardingError('');
    setLoading(true);

    try {
      const data = await completeGoogleOnboarding({
        idToken: googleIdToken,
        ua_id: onboardingUaId,
        academic_level: onboardingAcademicLevel
      });

      localStorage.setItem('ua_token', data.token);
      localStorage.setItem('ua_user', JSON.stringify(data.user));
      setShowOnboarding(false);
      navigate('feedback');
    } catch (err) {
      setOnboardingError(err.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };
  const [forgotError, setForgotError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await loginUser({ ua_id_or_email: uaId, password });
        localStorage.setItem('ua_token', data.token);
        localStorage.setItem('ua_user', JSON.stringify(data.user));

        if (data.user.role === 'admin') {
          navigate('admin');
        } else {
          navigate('feedback');
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (role !== 'admin') {
          if (!email || !/^[a-zA-Z0-9._%+-]+@ua\.edu.ph$/i.test(email)) {
            setError('Valid UA email address ending in @ua.edu.ph is required.');
            setLoading(false);
            return;
          }
        }

        if (role === 'student' && !academicLevel) {
          setError('Please select your academic level to continue.');
          setLoading(false);
          return;
        }

        if (!agreeTerms) {
          setError('You must agree to the Terms and Conditions to register.');
          setLoading(false);
          return;
        }

        await registerUser({
          ua_id: uaId,
          full_name: fullName,
          role,
          password,
          academic_level: role === 'student' ? academicLevel : null,
          email: role === 'admin' ? null : email
        });

        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setUaId('');
        setEmail('');
        setFullName('');
        setRole('student');
        setAcademicLevel('');
        setAgreeTerms(false);
        setSuccessModal(true);
      }
    } catch (err) {
      if (isLogin) {
        setError(err.message);
      } else {
        setFailureMessage(err.message);
        setFailureModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      await forgotPassword(forgotEmail);
      setForgotSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotSuccess(false);
        setForgotEmail('');
      }, 3000);
    } catch (err) {
      setForgotError(err.message || 'Failed to send password reset request');
    } finally {
      setForgotLoading(false);
    }
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
        
        /* ── DESKTOP DEFAULT (split side-by-side) ── */
        .lp-split { flex-direction: row; }
        .lp-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px; position: relative; }
        .lp-form-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 60px 40px; background: #F8FAFC; }
        .lp-form-inner { width: 100%; max-width: 500px; }
        .lp-back-btn { position: absolute; bottom: 40px; left: 60px; }
        .lp-brand { position: absolute; top: 40px; left: 60px; display: flex; align-items: center; gap: 16px; }
        .lp-logo { width: 54px; }
        .lp-hero-title { font-size: 52px; }
        .lp-hero-desc { font-size: 17px; }
        .lp-univ-title { font-size: 15px; }
        .lp-univ-sub { font-size: 12px; }
        .mobile-auth-badge { display: none; }
        .mobile-form-heading { display: none; }
        .desktop-form-heading { display: block; }
        
        .minimal-input {
          outline: none;
          transition: all 0.2s ease-in-out !important;
        }
        .minimal-input:focus {
          border-color: #0C2340 !important;
          box-shadow: 0 0 0 4px rgba(12, 35, 64, 0.08) !important;
        }
        
        /* ── FORM GRID ── */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .form-grid .col-span-2 {
          grid-column: 1 / -1;
        }
        .level-chips {
          display: flex;
          flex-direction: row;
          gap: 10px;
          flex-wrap: wrap;
        }
        .level-chip {
          flex: 1;
          min-width: 80px;
          padding: 12px 16px !important;
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
        
        /* ── MOBILE (≤ 768px) ── REDESIGNED PREMIUM MOBILE LAYOUT ── */
        @media (max-width: 768px) {
          .lp-split {
            flex-direction: column;
            min-height: 100vh;
            height: 100vh;
            overflow: hidden;
          }
          /* ── HERO SECTION (35-40% of viewport) ── */
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
          
          /* ── LOGIN CONTAINER (60-65% of viewport) ── */
          .lp-form-panel {
            flex: 1;
            background: #FFFFFF;
            border-top-left-radius: 28px;
            border-top-right-radius: 28px;
            border-top: 1px solid rgba(12, 35, 64, 0.08);
            border-left: 1px solid rgba(12, 35, 64, 0.05);
            border-right: 1px solid rgba(12, 35, 64, 0.05);
            padding: 28px 28px 32px 28px;
            align-items: flex-start;
            justify-content: flex-start;
            overflow-y: auto;
            position: relative;
            z-index: 2;
            margin-top: -24px;
            box-shadow: 0 -6px 24px rgba(12, 35, 64, 0.06);
            display: flex;
            flex-direction: column;
          }
          .lp-form-inner {
            width: 100%;
            max-width: 100%;
            margin-top: 4px;
          }
          
          /* ── MOBILE FORM HEADING ── */
          .mobile-form-heading {
            display: block !important;
            margin-bottom: 24px;
            text-align: left;
          }
          .mobile-form-heading h2 {
            font-size: 30px;
            font-weight: 800;
            color: #0C2340;
            margin: 0 0 6px 0;
            letter-spacing: -0.03em;
            line-height: 1.1;
          }
          .mobile-form-heading h2 span {
            color: #E5A823;
          }
          .mobile-form-heading p {
            font-size: 15px;
            color: #64748B;
            margin: 0;
            line-height: 1.5;
            font-weight: 400;
          }
          .desktop-form-heading {
            display: none !important;
          }
          
          /* ── AUTH BADGE ── */
          .mobile-auth-badge {
            display: inline-flex !important;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: #F1F5F9;
            border: 1px solid #E2E8F0;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            color: #0C2340;
            letter-spacing: 0.03em;
            margin-bottom: 16px;
            text-transform: uppercase;
          }
          
          /* ── INPUTS ── */
          .minimal-input {
            height: 56px !important;
            font-size: 16px !important;
            padding: 0 18px 0 44px !important;
            box-sizing: border-box !important;
            border-radius: 12px !important;
            border: 1.5px solid #E2E8F0 !important;
            background: #FFFFFF !important;
            color: #1E293B !important;
            font-family: inherit !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
          }
          .minimal-input:focus {
            border-color: #0C2340 !important;
            box-shadow: 0 0 0 4px rgba(12, 35, 64, 0.08) !important;
          }
          .minimal-input::placeholder {
            color: #94A3B8;
            font-weight: 400;
          }
          
          /* ── FORM SPACING ── */
          .lp-form-inner form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          
          /* ── BUTTON ── */
          .lp-form-inner form button[type="submit"] {
            height: 56px !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            border-radius: 12px !important;
            margin-top: 4px !important;
            box-shadow: 0 4px 16px rgba(12, 35, 64, 0.2) !important;
            transition: all 0.2s ease !important;
          }
          .lp-form-inner form button[type="submit"]:active {
            transform: scale(0.98);
          }
          
          /* ── TOGGLE LINKS ── */
          .toggle-auth-link {
            font-size: 14px !important;
          }
          
          /* ── FORGOT PASSWORD ── */
          .forgot-password-link {
            font-size: 13px !important;
            margin-top: -6px !important;
            margin-bottom: 2px !important;
          }
          
          /* ── REGISTRATION FIELDS ── */
          .reg-field {
            margin-bottom: 2px;
          }
          .reg-field .minimal-input {
            padding-left: 18px !important;
          }
          
          /* ── RADIO OPTIONS ── */
          .radio-option {
            padding: 12px 16px !important;
            border-radius: 12px !important;
          }
          .radio-option label {
            font-size: 14px !important;
          }
          .radio-option .sub-text {
            font-size: 12px !important;
          }
          
          /* ── TERMS CHECKBOX ── */
          .terms-checkbox {
            margin-top: 4px !important;
            gap: 12px !important;
          }
          .terms-checkbox label {
            font-size: 13px !important;
            line-height: 1.4 !important;
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
            padding: 24px 20px 28px 20px;
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
            font-size: 26px;
          }
          .minimal-input {
            height: 52px !important;
            font-size: 15px !important;
            padding: 0 16px 0 40px !important;
          }
          .lp-form-inner form button[type="submit"] {
            height: 52px !important;
            font-size: 15px !important;
          }
        }
        
        /* ── SMALL PHONES (391-480px) ── */
        @media (min-width: 391px) and (max-width: 480px) {
          .lp-hero {
            padding: 0 24px;
          }
          .lp-form-panel {
            padding: 26px 24px 30px 24px;
          }
        }
        
        /* ── MOBILE FORM GRID OVERRIDE ── */
        .form-grid {
          display: flex !important;
          flex-direction: column !important;
          gap: 18px !important;
        }
        .form-grid .col-span-2 {
          grid-column: unset !important;
        }
        .level-chips {
          gap: 8px !important;
        }
        .level-chip {
          flex: 1 !important;
          min-width: 60px !important;
          padding: 10px 12px !important;
        }
      `}</style>

      {/* ── LEFT: HERO SECTION ── */}
      <div className="lp-hero" style={{
        backgroundImage: `linear-gradient(rgba(12, 35, 64, 0.85), rgba(12, 35, 64, 0.92)), url(${bgMain})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: colors.white
      }}>
        {/* Back Button */}
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
            Secure Identity<br/>
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
            <div className="mobile-auth-badge">
              <ShieldCheck size={14} color={colors.gold} style={{ marginRight: '6px' }} />
              SECURE PORTAL
            </div>
            <h2>
              {isLogin ? (
                <>Welcome <span>Back</span></>
              ) : (
                <>Create Your <span>Account</span></>
              )}
            </h2>
            <p>
              {isLogin
                ? 'Sign in with your official University credentials.'
                : 'Register a new identity with your official UA credentials.'}
            </p>
          </div>

          {/* ── DESKTOP form header ── */}
          <div className="desktop-form-heading" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              {isLogin ? (
                <>Welcome <span style={{ color: colors.gold }}>Back</span></>
              ) : (
                <>Create Your <span style={{ color: colors.gold }}>Identity</span></>
              )}
            </h2>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
              {isLogin
                ? 'Sign in with your official University credentials.'
                : 'Register a new identity with your official UA credentials.'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2', color: '#EF4444',
              padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
              fontWeight: 500, marginBottom: '16px', border: '1px solid #FCA5A5',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={!isLogin ? 'form-grid' : ''} style={isLogin ? { display: 'flex', flexDirection: 'column', gap: '14px' } : {}}>
            {/* Student ID / Email */}
            <div className={!isLogin ? 'col-span-2' : ''} style={{ position: 'relative' }}>
              <User size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
              <input
                required
                type={isLogin ? 'text' : 'number'}
                placeholder={isLogin ? 'Student ID or UA Email' : 'UA ID Number'}
                value={uaId}
                onChange={e => setUaId(e.target.value)}
                className="minimal-input"
                style={{ width: '100%', padding: '14px 16px 14px 46px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box', height: '52px' }}
              />
            </div>

            {/* Registration Fields */}
            {!isLogin && (
              <>
                {/* UA Email */}
                {role !== 'admin' && (
                  <div className="col-span-2" style={{ position: 'relative' }}>
                    <input
                      required type="email" placeholder="UA Email (student@ua.edu.ph)"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="minimal-input"
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box', height: '52px' }}
                    />
                  </div>
                )}
                
                {/* Full Name */}
                <div className="col-span-2">
                  <input
                    required type="text" placeholder="Full Name"
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    className="minimal-input"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box', height: '52px' }}
                  />
                </div>

                {/* Academic Level */}
                {role === 'student' && (
                  <div className="col-span-2">
                    <p style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, margin: '0 0 10px 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Academic Level</p>
                    <div className="level-chips">
                      {[
                        { value: 'JHS', label: 'JHS' },
                        { value: 'SHS', label: 'SHS' },
                        { value: 'College', label: 'College' },
                      ].map(opt => {
                        const isSelected = academicLevel === opt.value;
                        return (
                          <label key={opt.value} htmlFor={`level-${opt.value}`} className="level-chip" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                            border: `2px solid ${isSelected ? colors.navy : colors.border}`,
                            background: isSelected ? '#EFF3F8' : colors.white,
                            transition: 'all 0.15s', textAlign: 'center', fontWeight: 600, fontSize: '14px',
                            color: isSelected ? colors.navy : colors.text
                          }}>
                            <input type="radio" id={`level-${opt.value}`} name="academicLevel" value={opt.value}
                              checked={isSelected} onChange={() => setAcademicLevel(opt.value)}
                              style={{ accentColor: colors.navy, width: '14px', height: '14px', flexShrink: 0, margin: 0 }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Password Field */}
            <div style={{ position: 'relative' }}>
              <Lock size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
              <input required type={showPassword ? 'text' : 'password'} placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="minimal-input"
                style={{ width: '100%', padding: '14px 46px 14px 46px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box', height: '52px' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: colors.textMuted, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = colors.navy}
                onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password (Registration) */}
            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <Lock size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                <input required type={showPassword ? 'text' : 'password'} placeholder="Confirm Password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="minimal-input"
                  style={{ width: '100%', padding: '14px 46px 14px 46px', borderRadius: '10px', border: confirmPassword && password !== confirmPassword ? '1.5px solid #EF4444' : `1.5px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box', height: '52px' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: colors.textMuted, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = colors.navy}
                  onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {/* Forgot Password */}
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                <button type="button" onClick={() => setShowForgotModal(true)}
                  style={{ background: 'none', border: 'none', padding: 0, color: colors.gold, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Password mismatch error */}
            {!isLogin && confirmPassword && password !== confirmPassword && (
              <div className="col-span-2">
                <span style={{ fontSize: '13px', color: '#EF4444', display: 'block' }}>Passwords do not match</span>
              </div>
            )}

            {/* Terms */}
            {!isLogin && (
              <div className="col-span-2 terms-checkbox" style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                <input required type="checkbox" id="agreeTerms" checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px', flexShrink: 0, accentColor: colors.navy }}
                />
                <label htmlFor="agreeTerms" style={{ fontSize: '13px', fontWeight: 500, color: colors.text, cursor: 'pointer', userSelect: 'none', lineHeight: '1.4', margin: 0 }}>
                  I agree to the{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)}
                    style={{ background: 'none', border: 'none', padding: 0, color: colors.gold, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                  >
                    Terms and Conditions
                  </button>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button disabled={loading} type="submit"
              className={!isLogin ? 'col-span-2' : ''}
              style={{ width: '100%', padding: '16px 24px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(12, 35, 64, 0.2)', height: '52px' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {isLogin && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
              </div>
              <div id="googleSignInBtn" style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center' }} />
            </>
          )}

          {/* Toggle Sign In / Create Account */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: colors.textMuted, fontSize: '14px' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ background: 'none', border: 'none', padding: 0, color: colors.gold, fontWeight: 700, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              {isLogin ? 'Create an Account' : 'Sign In'}
            </button>
          </div>

        </div>
      </div>

      {/* ── SUCCESS MODAL ── */}
      {successModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'inherit' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '40px', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>✓</div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, marginBottom: '12px' }}>Verification Email Sent!</h3>
            <p style={{ fontSize: '15px', color: colors.textMuted, marginBottom: '28px', lineHeight: '1.6' }}>Your account has been registered successfully. A verification link has been sent to your @ua.edu.ph email address. Please verify your email before logging in.</p>
            <button onClick={() => setSuccessModal(false)}
              style={{ width: '100%', padding: '14px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >OK</button>
          </div>
        </div>
      )}

      {/* ── FAILURE MODAL ── */}
      {failureModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'inherit' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '40px', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>✕</div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.red, marginBottom: '12px' }}>Account Creation Failed</h3>
            <p style={{ fontSize: '15px', color: colors.textMuted, marginBottom: '28px', lineHeight: '1.6' }}>{failureMessage || 'An error occurred while creating your account. Please try again.'}</p>
            <button onClick={() => setFailureModal(false)}
              style={{ width: '100%', padding: '14px', backgroundColor: colors.red, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Try Again</button>
          </div>
        </div>
      )}

      {/* ── TERMS MODAL ── */}
      {showTermsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, fontFamily: 'inherit', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={24} color={colors.gold} /> Terms and Conditions
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left', border: `1px solid ${colors.border}`, padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: colors.text }}>
              <p style={{ marginTop: 0, marginBottom: '12px', fontWeight: 600, color: colors.navy }}>Introduction &amp; Acceptance of Terms:</p>
              <p style={{ marginBottom: '16px' }}>By accessing or using our platform, you agree to be bound by these Terms and Conditions. If you do not agree, you must immediately cease using our services.</p>
              <p style={{ marginBottom: '12px', fontWeight: 600, color: colors.navy }}>Modifications:</p>
              <p style={{ marginBottom: '16px' }}>We reserve the right to modify these terms at any time; continued use constitutes acceptance of the updated terms.</p>
              <p style={{ marginBottom: '12px', fontWeight: 600, color: colors.navy }}>Cryptographic Signatures:</p>
              <p style={{ marginBottom: '16px' }}>Every feedback submission is cryptographically signed using Ed25519 technology in the student's browser. This process creates a secure, tamper-proof digital signature verifying feedback authenticity.</p>
              <p style={{ marginBottom: '12px', fontWeight: 600, color: colors.navy }}>Data Integrity:</p>
              <p style={{ marginBottom: '16px' }}>Users agree not to attempt to manipulate, inject, or tamper with the cryptographic seals or feedback verification data.</p>
              <p style={{ marginBottom: '12px', fontWeight: 600, color: colors.navy }}>Privacy Policy:</p>
              <p style={{ marginBottom: 0 }}>Your identity is secure and protected according to the university guidelines.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => { setAgreeTerms(false); setShowTermsModal(false); }}
                style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: colors.navy, border: `1.5px solid ${colors.navy}`, borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >Decline</button>
              <button type="button" onClick={() => { setAgreeTerms(true); setShowTermsModal(false); }}
                style={{ flex: 1, padding: '12px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >I Agree</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, fontFamily: 'inherit', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '40px', maxWidth: '440px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, marginBottom: '12px' }}>Reset Password</h3>
            <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px', lineHeight: '1.6' }}>
              Enter your official @ua.edu.ph email address to receive a secure password reset link.
            </p>
            {forgotSuccess ? (
              <div style={{ backgroundColor: '#ECFDF5', color: '#10B981', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid #A7F3D0' }}>
                Password reset link sent! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                {forgotError && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid #FCA5A5' }}>
                    {forgotError}
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
                  <input required type="email" placeholder="student@ua.edu.ph"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className="minimal-input"
                    style={{ width: '100%', padding: '15px 18px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotEmail(''); }}
                    style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: colors.navy, border: `1.5px solid ${colors.navy}`, borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >Cancel</button>
                  <button type="submit" disabled={forgotLoading}
                    style={{ flex: 1, padding: '12px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >{forgotLoading ? 'Sending...' : 'Send Link'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── GOOGLE ONBOARDING MODAL ── */}
      {showOnboarding && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002, fontFamily: 'inherit', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '40px', maxWidth: '440px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: colors.gold }}>
              <GraduationCap size={44} />
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, marginBottom: '12px' }}>Complete Registration</h3>
            <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px', lineHeight: '1.6' }}>
              First-time logging in with Google? Please provide your Student ID to link your account.
            </p>

            <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              {onboardingError && (
                <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid #FCA5A5' }}>
                  {onboardingError}
                </div>
              )}
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>STUDENT ID NUMBER</label>
                <input required type="text" placeholder="10-digit Student ID (e.g. 2026123456)"
                  value={onboardingUaId} onChange={e => setOnboardingUaId(e.target.value)}
                  style={{ width: '100%', padding: '15px 18px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>ACADEMIC LEVEL</label>
                <select 
                  value={onboardingAcademicLevel} 
                  onChange={e => setOnboardingAcademicLevel(e.target.value)}
                  style={{ width: '100%', padding: '15px 18px', borderRadius: '10px', border: `1.5px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', backgroundColor: colors.white, boxSizing: 'border-box' }}
                >
                  <option value="JHS">Junior High School</option>
                  <option value="SHS">Senior High School</option>
                  <option value="College">College</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => { setShowOnboarding(false); setOnboardingError(''); setOnboardingUaId(''); }}
                  style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: colors.navy, border: `1.5px solid ${colors.navy}`, borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                >Cancel</button>
                <button type="submit" disabled={loading}
                  style={{ flex: 1, padding: '12px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}
                >{loading ? 'Saving...' : 'Register ID'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
