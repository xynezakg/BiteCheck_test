import React, { useState } from "react";
import { loginUser } from "../api";

export default function AdminLogin({ navigate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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



          <button type="submit" className="btn btn-dark" style={{ marginTop: '20px', marginBottom: '15px', width: '100%' }} disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <button type="button" className="btn btn-ghost" onClick={() => navigate('landing')} disabled={loading}>
          Back to Home
        </button>
      </div>


    </div>
  );
}