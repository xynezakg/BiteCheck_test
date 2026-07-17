import React, { useState } from "react";
import { loginUser, forgotPassword } from "../api";

export default function AdminLogin({ navigate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser({ ua_id_or_email: username, password });
      
      // Verify role
      if (data.user.role !== "admin") {
        setError("Access denied. Only administrators can log in here.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("ua_token", data.token);
      sessionStorage.setItem("ua_user", JSON.stringify(data.user));
      navigate("admin-dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);

    try {
      await forgotPassword(forgotEmail);
      setForgotSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotSuccess(false);
        setForgotEmail("");
      }, 3000);
    } catch (err) {
      setForgotError(err.message || "Failed to send password reset request");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="portal-style-bg portal-style-bg-login" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '40px 30px' }}>

        {/* NEW UA LOGO */}
        <img
          src="/ua-logo.png"
          alt="University of the Assumption Logo"
          style={{
            width: '75px',
            height: '75px',
            borderRadius: '50%',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
          }}
        />

        <h2 className="serif" style={{ fontSize: '1.8rem' }}>Admin <span style={{ color: 'var(--accent-gold)' }}>Login</span></h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '30px', lineHeight: '1.4' }}>
          University of the Assumption<br />Canteen Evaluation System
        </p>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '20px', border: '1px solid #FCA5A5', textAlign: 'left' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <label>Username or Email</label>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="Enter username or email"
            autoComplete="username"
            required
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={loading}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn btn-dark" style={{ marginTop: '20px', marginBottom: '15px', width: '100%' }} disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <button type="button" className="btn btn-ghost" onClick={() => navigate('landing')} disabled={loading}>
          Back to Home
        </button>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
            width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0C2340', margin: '0 0 8px 0' }}>Reset Password</h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Enter your registered email address to receive a secure password reset link.
            </p>

            {forgotSuccess ? (
              <div style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>
                ✓ Reset link has been sent to your email!
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                {forgotError && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid #FCA5A5' }}>
                    {forgotError}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
                  <input
                    required
                    type="email"
                    placeholder="Enter registered email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '8px',
                      border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotEmail(''); }}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0',
                      backgroundColor: '#ffffff', color: '#1E293B', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                      backgroundColor: '#0C2340', color: '#ffffff', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1
                    }}
                  >
                    {forgotLoading ? "Sending..." : "Send Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}