import React, { useState, useEffect } from 'react';
import { fetchStalls, getAllFeedbacks } from '../api';
import { ClipboardEdit, LogIn, ArrowRight, ShieldCheck, Search, Star, MessageSquare, Award, Clock, BookOpen, UtensilsCrossed, X } from 'lucide-react';
import bgMain from '../Background_img/Screenshot 2026-03-28 165930.png';

export default function LandingPage({ navigate }) {
  const [stalls, setStalls] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStall, setSelectedStall] = useState(null);

  // Brand Colors
  const colors = {
    navy: '#0C2340', 
    navyLight: '#1A365D',
    gold: '#E5A823', 
    lightGray: '#F8FAFC', 
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    goldLight: '#FEF3C7',
    shadow: 'rgba(12, 35, 64, 0.06)'
  };

  const modernFont = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [stallsData, feedbacksData] = await Promise.all([
          fetchStalls(),
          getAllFeedbacks()
        ]);
        
        // Only show verified stalls
        setStalls(stallsData.filter(s => s.is_email_verified));
        // Only show unquarantined feedbacks
        setFeedbacks(feedbacksData.filter(f => !f.is_quarantined));
      } catch (err) {
        console.error("Failed to load landing page stats:", err);
        setError("Failed to fetch canteen data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Dynamically classify stalls by name keywords
  const getStallCategory = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea') || lower.includes('drink') || lower.includes('juice') || lower.includes('beverage')) {
      return 'Beverages';
    }
    if (lower.includes('bake') || lower.includes('waffle') || lower.includes('donut') || lower.includes('pastry') || lower.includes('dessert') || lower.includes('sweet') || lower.includes('ice') || lower.includes('snack') || lower.includes('fries')) {
      return 'Snacks & Desserts';
    }
    return 'Meals';
  };

  // Clean comment text from database brackets
  const cleanCommentText = (text) => {
    if (!text) return "";
    return text.replace(/\[Stall:.*?\]\s*\[Scores.*?\]\s*/g, '').trim();
  };

  // Parse rating metrics from feedbacks list
  const parseFeedbackScores = (feedbacksList) => {
    const categoryTotals = { Food: 0, Service: 0, Staff: 0, Clean: 0, Value: 0 };
    let count = 0;

    feedbacksList.forEach(f => {
      const match = f?.comment?.match(/\[Scores -> Food: (\d)\/5 \| Service: (\d)\/5 \| Staff: (\d)\/5 \| Clean: (\d)\/5 \| Value: (\d)\/5\]/);
      if (match) {
        categoryTotals.Food += parseInt(match[1]);
        categoryTotals.Service += parseInt(match[2]);
        categoryTotals.Staff += parseInt(match[3]);
        categoryTotals.Clean += parseInt(match[4]);
        categoryTotals.Value += parseInt(match[5]);
        count++;
      }
    });

    return {
      Food: count ? Number((categoryTotals.Food / count).toFixed(1)) : 0,
      Service: count ? Number((categoryTotals.Service / count).toFixed(1)) : 0,
      Staff: count ? Number((categoryTotals.Staff / count).toFixed(1)) : 0,
      Clean: count ? Number((categoryTotals.Clean / count).toFixed(1)) : 0,
      Value: count ? Number((categoryTotals.Value / count).toFixed(1)) : 0,
      count
    };
  };

  // Calculate overall canteen category averages
  const overallMetrics = parseFeedbackScores(feedbacks);

  // Compute average overall score for a specific stall
  const getStallAverage = (stallName) => {
    const stallFeedbacks = feedbacks.filter(f => f.comment?.includes(`[Stall: ${stallName}]`));
    if (stallFeedbacks.length === 0) return 0;
    const sum = stallFeedbacks.reduce((acc, f) => acc + f.rating, 0);
    return Number((sum / stallFeedbacks.length).toFixed(1));
  };

  // Filter Stalls based on Category and Search Query
  const filteredStalls = stalls.filter(stall => {
    const matchesCategory = selectedCategory === 'All' || getStallCategory(stall.name) === selectedCategory;
    const matchesSearch = stall.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Extract top 3 reviews (4-5 star ratings with comments)
  const topReviews = feedbacks
    .filter(f => f.rating >= 4 && cleanCommentText(f.comment).length > 10)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  // Retrieve details for a selected stall modal
  const getStallDetailsData = (stallName) => {
    const stallFeedbacks = feedbacks.filter(f => f.comment?.includes(`[Stall: ${stallName}]`));
    const scores = parseFeedbackScores(stallFeedbacks);
    const comments = stallFeedbacks
      .map(f => ({
        author: f.customer_name || 'Anonymous Student',
        text: cleanCommentText(f.comment),
        rating: f.rating,
        date: f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'
      }))
      .filter(c => c.text.length > 0)
      .slice(0, 5); // top 5 comments

    return { scores, comments, feedbacksCount: stallFeedbacks.length };
  };

  const modalDetails = selectedStall ? getStallDetailsData(selectedStall.name) : null;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.white, 
      fontFamily: modernFont, 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* ─── CURVED DECORATIVE GOLD WAVES (Top-Left & Bottom-Right) ─── */}
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, width: '380px', height: '180px', zIndex: 0, pointerEvents: 'none', opacity: 0.9 }} 
        viewBox="0 0 380 180" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 0 H380 C280 100 130 160 0 130 V0Z" fill={colors.gold} />
      </svg>

      <svg 
        style={{ position: 'absolute', bottom: 0, right: 0, width: '420px', height: '220px', zIndex: 0, pointerEvents: 'none', opacity: 0.9 }} 
        viewBox="0 0 420 220" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M420 220 H0 C100 160 260 100 420 0 V220Z" fill={colors.gold} />
      </svg>

      {/* ─── STYLES & MEDIA QUERIES ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap');
        
        .header-pad { padding: 18px 80px; }
        .logo-img { height: 48px; }
        .univ-text { font-size: 20px; display: block; }
        .hero-banner { display: flex; align-items: center; justify-content: space-between; gap: 64px; max-width: 1200px; margin: 0 auto; padding: 100px 40px; box-sizing: border-box; position: relative; z-index: 1; }
        .hero-left { flex: 0.95; text-align: left; }
        .hero-right { flex: 1.05; display: flex; justify-content: center; align-items: center; }
        .hero-h2 { font-size: 44px; line-height: 1.1; }
        .hero-p { font-size: 16px; }
        .main-container { max-width: 1200px; margin: 0 auto 120px; width: 100%; padding: 0 40px; box-sizing: border-box; position: relative; z-index: 1; }
        
        /* Floating illustration elements */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        
        /* Fade up on load */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeup { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .card-premium { 
          background-color: ${colors.white}; 
          border-radius: 16px; 
          box-shadow: 0 10px 40px -10px ${colors.shadow}; 
          border: 1px solid ${colors.border}; 
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-premium:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 20px 40px -15px rgba(12, 35, 64, 0.1);
          border-color: rgba(12, 35, 64, 0.1);
        }
        
        .pill-btn {
          background-color: ${colors.white};
          color: ${colors.textMuted};
          border: 1px solid ${colors.border};
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pill-btn.active {
          background-color: ${colors.gold};
          color: ${colors.white};
          border-color: ${colors.gold};
          box-shadow: 0 4px 12px rgba(229, 168, 35, 0.25);
        }
        .pill-btn:hover:not(.active) {
          background-color: #F1F5F9;
          color: ${colors.navy};
          border-color: #CBD5E1;
        }

        .btn-rectangular {
          border-radius: 6px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .btn-rectangular:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(12, 35, 64, 0.15);
          opacity: 0.95;
        }

        @media (max-width: 1024px) {
          .header-pad { padding: 18px 40px !important; }
          .hero-banner { flex-direction: column; padding: 60px 40px !important; gap: 48px !important; }
          .hero-left { width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; }
          .hero-right { width: 100%; max-width: 500px; }
          .hero-p { max-width: 550px; }
          .main-container { padding: 0 40px !important; }
        }

        @media (max-width: 640px) {
          .header-pad { padding: 16px 20px !important; justify-content: center !important; }
          .logo-img { height: 40px !important; }
          .univ-text { font-size: 16px !important; }
          .staff-btn-container { display: none !important; }
          .hero-banner { padding: 40px 20px !important; }
          .hero-h2 { font-size: 34px !important; }
          .main-container { padding: 0 20px !important; margin-bottom: 60px !important; }
        }
      `}</style>

      {/* ─── STICKY HEADER ─── */}
      <header className="header-pad" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${colors.border}`, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
          <img src="/ua-logo.png" alt="UA Logo" className="logo-img" />
          <span className="univ-text" style={{ color: colors.navy, fontWeight: 800, letterSpacing: '-0.02em' }}>
            University of the Assumption
          </span>
        </div>

        <div className="staff-btn-container" style={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
          <button 
            onClick={() => navigate('admin-login')}
            className="btn-rectangular"
            style={{ 
              backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 22px', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
              fontSize: '12px', fontFamily: 'inherit'
            }}
          >
            <LogIn size={14} /> Staff Login
          </button>
        </div>
      </header>

      {/* ─── HERO BANNER (Left: Content, Right: Laptop Mock-up Showcase) ─── */}
      <div className="hero-banner animate-fadeup">
        
        {/* Left Side: Bold Two-Colored Typography & Action Buttons */}
        <div className="hero-left">
          <span style={{ fontSize: '11px', fontWeight: 800, color: colors.gold, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>
            SECURE PORTAL
          </span>
          <h2 className="hero-h2" style={{ fontWeight: 900, margin: '0 0 24px 0', letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            <span style={{ color: colors.navy, display: 'block', fontSize: '38px' }}>Canteen</span>
            <span style={{ color: colors.gold, display: 'block', fontSize: '52px' }}>Evaluation</span>
            <span style={{ color: colors.navy, display: 'block', fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>System</span>
          </h2>
          <p className="hero-p" style={{ fontWeight: 400, lineHeight: 1.65, margin: '0 0 36px 0', color: colors.textMuted, maxWidth: '480px' }}>
            A secure platform to share your dining experience. All submissions are protected by Ed25519 cryptography.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', width: '100%', justifyContent: 'inherit' }}>
            <button 
              onClick={() => navigate('student-login')}
              className="btn-rectangular"
              style={{ 
                backgroundColor: colors.gold, color: colors.white, border: 'none', padding: '16px 36px', 
                fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(229, 168, 35, 0.2)'
              }}
            >
              Start Evaluation <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => navigate('verify_receipt')}
              className="btn-rectangular"
              style={{ 
                backgroundColor: colors.white, color: colors.navy, border: `2px solid ${colors.navy}`, padding: '14px 34px', 
                fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontFamily: 'inherit'
              }}
            >
              <ShieldCheck size={16} /> Verify Receipt
            </button>
          </div>
        </div>

        {/* Right Side: Laptop Screen Showcase with Floating Elements */}
        <div className="hero-right">
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
            
            {/* CSS-simulated Laptop Screen Mock-up */}
            <div className="animate-float" style={{ position: 'relative', zIndex: 2 }}>
              
              {/* Laptop Screen Frame */}
              <div style={{ 
                backgroundColor: colors.white, 
                borderRadius: '16px 16px 0 0', 
                border: `8px solid ${colors.navy}`, 
                borderBottom: 'none',
                boxShadow: '0 25px 50px -12px rgba(12, 35, 64, 0.15)',
                overflow: 'hidden',
                height: '270px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src={bgMain} alt="App Screenshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              {/* Laptop Keyboard Base */}
              <div style={{ 
                backgroundColor: '#CBD5E1', 
                height: '14px', 
                borderRadius: '0 0 16px 16px',
                borderBottom: '4px solid #94A3B8',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
              }}></div>

            </div>

            {/* SaaS-style Decorative Floating Badge */}
            <div className="animate-float" style={{ 
              position: 'absolute', top: '-24px', left: '20px', 
              backgroundColor: colors.gold, color: colors.white, 
              padding: '8px 16px', borderRadius: '30px', 
              fontSize: '12px', fontWeight: 700, 
              boxShadow: '0 8px 20px rgba(229, 168, 35, 0.25)', 
              zIndex: 3, display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <ShieldCheck size={14} /> Cryptographic Seal Active
            </div>

            {/* Floating rating star elements */}
            <div className="animate-float" style={{ position: 'absolute', top: '20px', right: '-16px', zIndex: 1, animationDelay: '1s' }}>
              <Star size={26} fill={colors.gold} color={colors.gold} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="animate-float" style={{ position: 'absolute', bottom: '30px', left: '-20px', zIndex: 1, animationDelay: '2s' }}>
              <Star size={18} fill={colors.gold} color={colors.gold} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="animate-float" style={{ position: 'absolute', bottom: '60px', right: '-24px', zIndex: 1, animationDelay: '1.5s' }}>
              <MessageSquare size={22} color={colors.gold} fill={colors.goldLight} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }} />
            </div>

          </div>
        </div>

      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-container animate-fadeup">
        
        {/* Error warning box */}
        {error && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '14px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '32px', border: '1px solid #FCA5A5', zIndex: 1 }}>
            {error}
          </div>
        )}

        {/* TOP LAYOUT: Feedback info & Overall Scorecard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '60px' }}>
          
          {/* Action details card */}
          <div className="card-premium" style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: '#F1F5F9', padding: '16px', borderRadius: '50%', color: colors.navy, marginBottom: '20px' }}>
              <ClipboardEdit size={28} />
            </div>
            <h3 style={{ margin: 0, color: colors.navy, fontWeight: 800, fontSize: '18px', letterSpacing: '-0.01em', marginBottom: '10px' }}>
              Submit Your Feedback
            </h3>
            <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.6, marginBottom: '0', maxWidth: '300px' }}>
              Rate your meal and help us improve campus dining. Your review is digitally signed for authenticity.
            </p>
          </div>

          {/* Canteen category scorecard widget */}
          <div className="card-premium" style={{ padding: '36px 32px' }}>
            <h3 style={{ margin: 0, color: colors.navy, fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1.5px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '20px' }}>
              <UtensilsCrossed size={18} color={colors.gold} /> Canteen Scorecard
            </h3>
            
            {feedbacks.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '170px', color: colors.textMuted, fontSize: '14px' }}>
                No student reviews collected yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Food Quality', key: 'Food' },
                  { label: 'Service Efficiency', key: 'Service' },
                  { label: 'Staff Friendliness', key: 'Staff' },
                  { label: 'Cleanliness', key: 'Clean' },
                  { label: 'Value for Money', key: 'Value' }
                ].map((item) => {
                  const score = overallMetrics[item.key] || 0;
                  return (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '2px', color: colors.gold }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={13} fill={Math.round(score) >= star ? colors.gold : 'transparent'} />
                          ))}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: colors.navy, width: '28px', textAlign: 'right' }}>{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ─── DASHBOARD METRICS ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '80px' }}>
          <div className="card-premium" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '50%', color: '#3B82F6' }}><MessageSquare size={20} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors.navy, lineHeight: 1 }}>{feedbacks.length}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px', fontWeight: 600 }}>Student Reviews</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#FEF3C7', padding: '12px', borderRadius: '50%', color: colors.gold }}><Award size={20} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors.navy, lineHeight: 1 }}>{stalls.length}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px', fontWeight: 600 }}>Active Food Stalls</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '50%', color: '#10B981' }}><ShieldCheck size={20} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors.success, lineHeight: 1 }}>100%</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px', fontWeight: 600 }}>Crypto Secured</div>
            </div>
          </div>
        </div>

        {/* ─── DYNAMIC FOOD STALLS GRID ─── */}
        <section style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '32px', borderBottom: `1.5px solid ${colors.border}`, paddingBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: colors.navy, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Explore Our Food Stalls</h2>
              <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Click on any stall to see detailed performance scores and student reviews.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '580px', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.white, borderRadius: '6px', padding: '0 16px', height: '40px', border: `1px solid ${colors.border}`, flex: 1, minWidth: '200px', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                <Search size={15} color={colors.textMuted} style={{ marginRight: '8px' }} />
                <input type="text" placeholder="Search stall name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: colors.text }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All', 'Meals', 'Beverages', 'Snacks & Desserts'].map((cat) => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: colors.textMuted }}>Loading canteen stalls...</div>
          ) : filteredStalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, color: colors.textMuted }}>
              No food stalls found matching your criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '28px' }}>
              {filteredStalls.map((stall) => {
                const avgScore = getStallAverage(stall.name);
                return (
                  <div 
                    key={stall.id} 
                    className="card-premium" 
                    onClick={() => setSelectedStall(stall)}
                    style={{ 
                      overflow: 'hidden', cursor: 'pointer'
                    }}
                  >
                    <div style={{ height: '160px', backgroundColor: colors.navy, position: 'relative' }}>
                      {stall.image ? (
                        <img src={stall.image} alt={stall.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}><UtensilsCrossed size={40} /></div>
                      )}
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(12, 35, 64, 0.85)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: `1px solid rgba(255,255,255,0.1)` }}>
                        <Star size={12} fill={colors.gold} color={colors.gold} />
                        <span style={{ color: colors.white, fontSize: '11px', fontWeight: 700 }}>{avgScore > 0 ? avgScore : 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold, fontWeight: 800 }}>{getStallCategory(stall.name)}</span>
                      <h4 style={{ margin: '4px 0 0 0', color: colors.navy, fontWeight: 800, fontSize: '16px' }}>{stall.name}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── "HOW IT WORKS" SECURE VISUAL TIMELINE ─── */}
        <section style={{ 
          marginBottom: '80px', 
          backgroundColor: colors.navy, 
          color: colors.white, 
          padding: '56px 40px', 
          borderRadius: '16px', 
          borderLeft: `6px solid ${colors.gold}`,
          boxShadow: '0 20px 45px -10px rgba(12, 35, 64, 0.25)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>How Canteen Evaluation is Kept Secure</h2>
            <p style={{ color: '#94A3B8', fontSize: '15px', margin: 0 }}>Every rating is cryptographically signed inside your browser to prevent administrative tempering.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px' }}>
            {[
              { step: '1', title: 'Secure Login', desc: 'Students authenticate using their official University of the Assumption credentials to access the submission portal.', icon: BookOpen },
              { step: '2', title: 'Rate & Sign', desc: 'Enter evaluation ratings. The browser generates a unique Ed25519 private key to digitally sign the feedback payload.', icon: ClipboardEdit },
              { step: '3', title: 'Verify Receipt', desc: 'Each student receives a receipt signature. Anyone can audit the database using the public key signature to guarantee integrity.', icon: ShieldCheck }
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.step} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '28px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                    <div style={{ backgroundColor: colors.goldLight, color: colors.navy, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }}>{item.step}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconComp size={16} color={colors.gold} />
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: colors.white }}>{item.title}</h4>
                    </div>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.62, margin: 0 }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── TOP REVIEWS FEED ─── */}
        {topReviews.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.navy, marginBottom: '28px', letterSpacing: '-0.02em', borderBottom: `1.5px solid ${colors.border}`, paddingBottom: '20px' }}>
              Top Student Reviews
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
              {topReviews.map((rev) => (
                <div key={rev.id} className="card-premium" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '2px', color: colors.gold }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={13} fill={rev.rating >= star ? colors.gold : 'transparent'} />
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: colors.text, fontStyle: 'italic' }}>
                      "{cleanCommentText(rev.comment)}"
                    </p>
                  </div>
                  <div style={{ marginTop: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '12px', fontSize: '13px', fontWeight: 600, color: colors.navy }}>
                    {rev.customer_name || 'Anonymous Student'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ─── STALL DETAILS MODAL overlay ─── */}
      {selectedStall && modalDetails && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', maxWidth: '580px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeUp 0.3s ease', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ backgroundColor: colors.navy, color: colors.white, padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${colors.gold}` }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold, fontWeight: 700 }}>{getStallCategory(selectedStall.name)}</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: colors.white }}>{selectedStall.name}</h3>
              </div>
              <button onClick={() => setSelectedStall(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.white }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}>
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              
              {/* Category scores */}
              <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 800, color: colors.navy, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Rating Breakdown</h4>
              {modalDetails.feedbacksCount === 0 ? (
                <div style={{ backgroundColor: colors.bg, padding: '20px', borderRadius: '8px', textAlign: 'center', color: colors.textMuted, fontSize: '13px', marginBottom: '24px' }}>
                  No rating breakdown available yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '32px' }}>
                  {[
                    { label: 'Food Quality', key: 'Food' },
                    { label: 'Service Efficiency', key: 'Service' },
                    { label: 'Staff Friendliness', key: 'Staff' },
                    { label: 'Cleanliness', key: 'Clean' },
                    { label: 'Value for Money', key: 'Value' }
                  ].map((item) => {
                    const score = modalDetails.scores[item.key] || 0;
                    return (
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, padding: '10px 14px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: colors.text }}>{item.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.navy }}>{score}/5</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Feed of comments */}
              <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 800, color: colors.navy, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recent Comments</h4>
              {modalDetails.comments.length === 0 ? (
                <div style={{ backgroundColor: colors.bg, padding: '20px', borderRadius: '8px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
                  No student comments submitted yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {modalDetails.comments.map((comment, index) => (
                    <div key={index} style={{ borderBottom: index < modalDetails.comments.length - 1 ? `1px solid ${colors.border}` : 'none', paddingBottom: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: colors.text, fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{comment.text}"
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted }}>
                        <span>{comment.author}</span>
                        <span>{comment.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: '20px 32px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FAFAFA' }}>
              <button onClick={() => setSelectedStall(null)} className="btn-rectangular" style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 22px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer style={{ 
        backgroundColor: colors.navy, 
        color: colors.white, 
        padding: '56px 20px', 
        textAlign: 'center', 
        fontSize: '14px', 
        marginTop: 'auto', 
        borderTop: `4px solid ${colors.gold}`,
        position: 'relative',
        zIndex: 1
      }}>
        <p style={{ margin: 0, fontWeight: 500 }}>© 2026 University of the Assumption. All Rights Reserved.</p>
        <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '12px' }}>Cryptographically Secured EdDSA System</p>
      </footer>

    </div>
  );
}