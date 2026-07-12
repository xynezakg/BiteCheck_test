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
    gold: '#E5A823', 
    lightGray: '#F8FAFC', 
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    goldLight: '#FEF3C7'
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
    <div style={{ minHeight: '100vh', backgroundColor: colors.lightGray, fontFamily: modernFont, display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── STYLES & FONTS ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        
        .header-pad { padding: 16px 40px; }
        .logo-img { height: 52px; }
        .univ-text { font-size: 22px; display: block; }
        .hero-banner { height: 340px; padding: 70px 20px; }
        .hero-h2 { font-size: 42px; }
        .hero-p { font-size: 18px; }
        .main-container { max-width: 1200px; margin: -50px auto 80px; width: 100%; padding: 0 20px; box-sizing: border-box; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(12, 35, 64, 0.08); }
        .pill-btn:hover { background-color: #E2E8F0; }
        .timeline-card:hover { transform: translateY(-2px); }

        @media (max-width: 768px) {
          .header-pad { padding: 16px 24px !important; }
          .logo-img { height: 44px !important; }
          .univ-text { font-size: 18px !important; }
          .hero-banner { padding: 60px 20px 80px 20px !important; height: auto !important; }
          .hero-h2 { font-size: 34px !important; }
          .hero-p { font-size: 16px !important; }
          .main-container { margin-top: -40px !important; }
        }

        @media (max-width: 480px) {
          .header-pad { padding: 12px 16px !important; justify-content: center !important; }
          .logo-img { height: 38px !important; }
          .univ-text { font-size: 16px !important; } 
          .staff-btn-container { display: none !important; }
          .hero-h2 { font-size: 28px !important; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <header className="header-pad" style={{ 
        backgroundColor: colors.white, 
        borderBottom: `4px solid ${colors.gold}`, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 24px rgba(12, 35, 64, 0.08)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/ua-logo.png" alt="UA Logo" className="logo-img" />
          <span className="univ-text" style={{ color: colors.navy, fontWeight: 800, letterSpacing: '-0.01em' }}>
            University of the Assumption
          </span>
        </div>

        <div className="staff-btn-container" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('admin-login')}
            style={{ 
              backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 16px', 
              borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
              fontWeight: 600, fontSize: '14px', transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(12, 35, 64, 0.2)',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#17365C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.navy}
          >
            <LogIn size={16} /> Staff Login
          </button>
        </div>
      </header>

      {/* ─── HERO BANNER ─── */}
      <div className="hero-banner" style={{ 
        backgroundImage: `url("${bgMain}")`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        position: 'relative' 
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.85)' }}></div>
        <div style={{ position: 'relative', zIndex: 1, color: colors.white, textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="hero-h2" style={{ fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
            Canteen Evaluation System
          </h2>
          <p className="hero-p" style={{ fontWeight: 400, lineHeight: 1.6, margin: 0, color: '#CBD5E1' }}>
            A secure platform to share your dining experience. All submissions are protected by Ed25519 cryptography.
          </p>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-container">
        
        {/* TOP LAYOUT: Feedback Trigger & Canteen Scorecard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          
          {/* Primary Action Card */}
          <div style={{ 
            backgroundColor: colors.white, borderRadius: '16px', 
            boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: `1px solid ${colors.border}`, 
            padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center'
          }}>
            <div style={{ backgroundColor: '#F1F5F9', padding: '18px', borderRadius: '50%', color: colors.navy, marginBottom: '20px' }}>
              <ClipboardEdit size={32} />
            </div>
            
            <h3 style={{ margin: 0, color: colors.navy, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px', fontSize: '24px' }}>
              Submit Your Feedback
            </h3>
            
            <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.6, marginBottom: '28px', maxWidth: '360px' }}>
              Rate your meal and help us improve campus dining. Your review is digitally signed for authenticity.
            </p>
            
            <button 
              onClick={() => navigate('student-login')}
              style={{ 
                backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '16px 28px', 
                fontSize: '15px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', width: '100%', 
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 4px 12px rgba(12, 35, 64, 0.15)', fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'none'; }}
            >
              Start Evaluation <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => navigate('verify_receipt')}
              style={{ 
                background: 'none', border: 'none', color: colors.navy, fontSize: '13px', fontWeight: 600, 
                cursor: 'pointer', marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.8,
                transition: 'opacity 0.2s', fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.8}
            >
              <ShieldCheck size={16} /> Verify your receipt signature
            </button>
          </div>

          {/* Canteen Overall Scorecard */}
          <div style={{ 
            backgroundColor: colors.white, borderRadius: '16px', 
            boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: `1px solid ${colors.border}`, 
            padding: '32px'
          }}>
            <h3 style={{ margin: 0, color: colors.navy, fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '20px' }}>
              <UtensilsCrossed size={20} color={colors.gold} /> Canteen Scorecard
            </h3>
            
            {feedbacks.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: colors.textMuted, fontSize: '14px' }}>
                No student reviews collected yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                            <Star key={star} size={14} fill={Math.round(score) >= star ? colors.gold : 'transparent'} />
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

        {/* ─── DYNAMIC STATS DASHBOARD ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '64px' }}>
          <div className="timeline-card" style={{ backgroundColor: colors.white, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '50%', color: '#3B82F6' }}><MessageSquare size={22} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors.navy, lineHeight: 1 }}>{feedbacks.length}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px', fontWeight: 500 }}>Student Reviews</div>
            </div>
          </div>
          <div className="timeline-card" style={{ backgroundColor: colors.white, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#FEF3C7', padding: '12px', borderRadius: '50%', color: colors.gold }}><Award size={22} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors.navy, lineHeight: 1 }}>{stalls.length}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px', fontWeight: 500 }}>Active Food Stalls</div>
            </div>
          </div>
          <div className="timeline-card" style={{ backgroundColor: colors.white, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '50%', color: '#10B981' }}><ShieldCheck size={22} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: colors.success, lineHeight: 1 }}>100%</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px', fontWeight: 500 }}>Crypto Secured</div>
            </div>
          </div>
        </div>

        {/* ─── DYNAMIC FOOD STALLS GRID ─── */}
        <section style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '32px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.navy, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Explore Our Food Stalls</h2>
              <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Click on any stall to see detailed performance scores and student reviews.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '580px', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.white, borderRadius: '8px', padding: '0 12px', height: '40px', border: `1px solid ${colors.border}`, flex: 1, minWidth: '200px' }}>
                <Search size={16} color={colors.textMuted} style={{ marginRight: '8px' }} />
                <input type="text" placeholder="Search stall name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: colors.text }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All', 'Meals', 'Beverages', 'Snacks & Desserts'].map((cat) => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    style={{ 
                      border: `1px solid ${selectedCategory === cat ? colors.navy : colors.border}`, 
                      backgroundColor: selectedCategory === cat ? colors.navy : colors.white, 
                      color: selectedCategory === cat ? colors.white : colors.textMuted, 
                      padding: '8px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
                    }}
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
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}`, color: colors.textMuted }}>
              No food stalls found matching your criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
              {filteredStalls.map((stall) => {
                const avgScore = getStallAverage(stall.name);
                return (
                  <div 
                    key={stall.id} 
                    className="card-hover" 
                    onClick={() => setSelectedStall(stall)}
                    style={{ 
                      backgroundColor: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}`, 
                      overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s' 
                    }}
                  >
                    <div style={{ height: '150px', backgroundColor: colors.navy, position: 'relative' }}>
                      {stall.image ? (
                        <img src={stall.image} alt={stall.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}><UtensilsCrossed size={48} /></div>
                      )}
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(12, 35, 64, 0.85)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: `1px solid rgba(255,255,255,0.1)` }}>
                        <Star size={13} fill={colors.gold} color={colors.gold} />
                        <span style={{ color: colors.white, fontSize: '12px', fontWeight: 700 }}>{avgScore > 0 ? avgScore : 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold, fontWeight: 700 }}>{getStallCategory(stall.name)}</span>
                      <h4 style={{ margin: '4px 0 0 0', color: colors.navy, fontWeight: 800, fontSize: '16px' }}>{stall.name}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── "HOW IT WORKS" TIMELINE ─── */}
        <section style={{ marginBottom: '64px', backgroundColor: colors.navy, color: colors.white, padding: '48px 32px', borderRadius: '16px', borderLeft: `6px solid ${colors.gold}` }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>How Canteen Evaluation is Kept Secure</h2>
            <p style={{ color: '#94A3B8', fontSize: '15px', margin: 0 }}>Every rating is cryptographically signed inside your browser to prevent administrative tempering.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { step: '1', title: 'Secure Login', desc: 'Students authenticate using their official University of the Assumption credentials to access the submission portal.', icon: BookOpen },
              { step: '2', title: 'Rate & Sign', desc: 'Enter evaluation ratings. The browser generates a unique Ed25519 private key to digitally sign the feedback payload.', icon: ClipboardEdit },
              { step: '3', title: 'Verify Receipt', desc: 'Each student receives a receipt signature. Anyone can audit the database using the public key signature to guarantee integrity.', icon: ShieldCheck }
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.step} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ backgroundColor: colors.goldLight, color: colors.navy, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>{item.step}</div>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: colors.white }}>{item.title}</h4>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── TOP CUSTOMER REVIEWS ─── */}
        {topReviews.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.navy, marginBottom: '24px', letterSpacing: '-0.02em', borderBottom: `2px solid ${colors.border}`, paddingBottom: '16px' }}>
              Top Student Reviews
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {topReviews.map((rev) => (
                <div key={rev.id} style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '2px', color: colors.gold }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={14} fill={rev.rating >= star ? colors.gold : 'transparent'} />
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

      {/* ─── STALL DETAILS MODAL ─── */}
      {selectedStall && modalDetails && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', maxWidth: '580px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeUp 0.3s ease', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: colors.navy, color: colors.white, padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${colors.gold}` }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold, fontWeight: 700 }}>{getStallCategory(selectedStall.name)}</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: colors.white }}>{selectedStall.name}</h3>
              </div>
              <button onClick={() => setSelectedStall(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.white }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              
              {/* Category Breakdown */}
              <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 700, color: colors.navy, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Rating Breakdown</h4>
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
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, padding: '10px 12px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: colors.text }}>{item.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.navy }}>{score}/5</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Latest Comments */}
              <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 700, color: colors.navy, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recent Comments</h4>
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

            {/* Modal Footer */}
            <div style={{ padding: '20px 32px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FAFAFA' }}>
              <button onClick={() => setSelectedStall(null)} style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'} onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}>
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer style={{ backgroundColor: colors.navy, color: colors.white, padding: '40px 20px', textAlign: 'center', fontSize: '14px', marginTop: 'auto' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>© 2026 University of the Assumption. All Rights Reserved.</p>
        <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '13px' }}>Cryptographically Secured EdDSA System</p>
      </footer>

    </div>
  );
}