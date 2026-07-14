import React, { useState, useEffect } from 'react';
import { 
  ClipboardEdit, 
  ArrowRight, 
  ShieldCheck, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Smartphone, 
  Store, 
  Lock, 
  CheckCircle2, 
  Award, 
  Database,
  Key,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  Star
} from 'lucide-react';
import { getAllFeedbacks } from '../api';

// Main campus background image
import bgMain from '../Background_img/Screenshot 2026-03-28 165930.png';

export default function LandingPage({ navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  
  // Dynamic feedbacks state
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

     const [activeSection, setActiveSection] = useState('home');

     // Monitor scroll for glass header transition
     useEffect(() => {
       const handleScroll = () => {
         if (window.scrollY > 20) {
           setScrolled(true);
         } else {
           setScrolled(false);
         }
       };
       window.addEventListener('scroll', handleScroll);
       return () => window.removeEventListener('scroll', handleScroll);
     }, []);

     // Monitor intersection of sections to highlight header links
     useEffect(() => {
       const sections = ['home', 'about', 'reviews', 'features', 'how-it-works', 'mobile', 'faq'];
       const observerOptions = {
         root: null,
         rootMargin: '-50% 0px -50% 0px',
         threshold: 0
       };

       const observer = new IntersectionObserver((entries) => {
         entries.forEach((entry) => {
           if (entry.isIntersecting) {
             setActiveSection(entry.target.id);
           }
         });
       }, observerOptions);

       sections.forEach((id) => {
         const element = document.getElementById(id);
         if (element) observer.observe(element);
       });

       return () => {
         sections.forEach((id) => {
           const element = document.getElementById(id);
           if (element) observer.unobserve(element);
         });
       };
     }, []);

  // Fetch feedbacks on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getAllFeedbacks();
        if (Array.isArray(data)) {
          // Filter: rating >= 4, and not quarantined
          const filtered = data.filter(f => f.rating >= 4 && !f.is_quarantined);
          setFeedbacks(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch canteen feedbacks:", err);
      } finally {
        setLoadingFeedbacks(false);
      }
    };
    fetchReviews();
  }, []);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Helper to extract stall name and clean the comment text
  const parseComment = (comment) => {
    const stallMatch = comment?.match(/\[Stall: (.*?)\]/);
    const stallName = stallMatch ? stallMatch[1] : null;
    const cleanText = (comment || '').replace(/\[Stall:.*?\]\s*\[Scores.*?\]\s*/g, '').trim();
    return { stallName, cleanText };
  };

  return (
    <div className="lp-wrapper">
      {/* ─── STYLING SYSTEM (VANILLA CSS) ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

        /* Color Tokens */
        :root {
          --navy: #0C2340;
          --navy-light: #1E3A60;
          --navy-dark: #061324;
          --gold: #E5A823;
          --gold-light: #F7C85E;
          --gold-dark: #B88114;
          --white: #FFFFFF;
          --gray-50: #F8FAFC;
          --gray-100: #F1F5F9;
          --gray-200: #E2E8F0;
          --gray-300: #CBD5E1;
          --gray-600: #475569;
          --gray-700: #334155;
          --gray-900: #0F172A;
          --green-500: #22C55E;
          --green-600: #16A34A;
          --green-50: #F0FDF4;
        }

        .lp-wrapper {
          background-color: var(--gray-50);
          color: var(--gray-900);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* Typography */
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--navy);
        }

        /* Global Layout */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--gray-50);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--gray-300);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--gray-600);
        }

        /* Nav styles */
        .sticky-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sticky-header.scrolled {
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
          border-bottom: 1px solid var(--gray-200);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 80px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .nav-link-item {
          background: none;
          border: none;
          color: var(--gray-600);
          font-weight: 500;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 8px 4px;
          font-family: inherit;
          border-bottom: 2px solid transparent;
        }

        .nav-link-item:hover,
        .nav-link-item.active {
          color: var(--navy);
        }

        .nav-link-item.active {
          border-bottom-color: var(--gold);
        }

        .mobile-menu .nav-link-item {
          align-self: flex-start;
        }

        .auth-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 13px;
          border-radius: 6px;
        }

        .btn-primary {
          background-color: var(--navy);
          color: var(--white);
          border: 1px solid var(--navy);
          box-shadow: 0 2px 4px rgba(12, 35, 64, 0.1);
        }

        .btn-primary:hover {
          background-color: var(--navy-light);
          border-color: var(--navy-light);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background-color: transparent;
          color: var(--navy);
          border: 1px solid var(--gray-300);
        }

        .btn-secondary:hover {
          background-color: var(--gray-100);
          border-color: var(--gray-600);
        }

        .btn-gold {
          background-color: var(--gold);
          color: var(--navy);
          border: 1px solid var(--gold);
          box-shadow: 0 2px 4px rgba(229, 168, 35, 0.15);
        }

        .btn-gold:hover {
          background-color: var(--gold-light);
          border-color: var(--gold-light);
          transform: translateY(-1px);
        }

        .btn-ghost {
          background: none;
          border: none;
          color: var(--gray-600);
        }

        .btn-ghost:hover {
          color: var(--navy);
          background-color: var(--gray-100);
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.03); opacity: 0.22; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        /* Section Layouts */
        .section-padding {
          padding: 100px 0;
        }

        .section-header {
          text-align: center;
          max-width: 650px;
          margin: 0 auto 60px;
        }

        .section-tag {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--gold-dark);
          background-color: #FEF7E6;
          padding: 6px 14px;
          border-radius: 20px;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .section-desc {
          font-size: 16px;
          color: var(--gray-600);
          line-height: 1.6;
        }

        /* Mobile Nav Menu toggler */
        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--navy);
          cursor: pointer;
        }

        /* Responsive Navbar */
        @media (max-width: 900px) {
          .nav-links, .auth-actions {
            display: none;
          }
          .mobile-toggle {
            display: block;
          }
        }

        .mobile-menu {
          position: fixed;
          top: 80px;
          left: 0;
          right: 0;
          background: var(--white);
          border-bottom: 1px solid var(--gray-200);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 999;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }

        /* Hero CSS Mockup Browser and Device */
        .mock-browser {
          background-color: var(--white);
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(12, 35, 64, 0.12);
          border: 1px solid var(--gray-200);
          overflow: hidden;
          width: 100%;
          text-align: left;
        }

        .browser-header {
          background-color: var(--gray-100);
          padding: 12px 20px;
          border-bottom: 1px solid var(--gray-200);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .browser-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .browser-url {
          background-color: var(--white);
          border-radius: 6px;
          padding: 4px 16px;
          font-size: 12px;
          color: var(--gray-600);
          flex-grow: 1;
          margin-left: 20px;
          border: 1px solid var(--gray-200);
          font-family: monospace;
        }

        /* Responsive Grid helper */
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        @media (max-width: 900px) {
          .grid-2 {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        /* Features Cards Grid */
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .feat-card {
          background-color: var(--white);
          border-radius: 16px;
          padding: 32px;
          border: 1px solid var(--gray-200);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          transition: all 0.3s ease;
        }

        .feat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -10px rgba(12, 35, 64, 0.08);
          border-color: var(--gold-light);
        }

        .feat-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background-color: var(--gray-100);
          color: var(--navy);
          margin-bottom: 24px;
        }

        /* Timeline styles */
        .timeline-steps {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-top: 40px;
        }

        .timeline-steps::before {
          content: '';
          position: absolute;
          top: 30px;
          left: 50px;
          right: 50px;
          height: 2px;
          background-color: var(--gray-200);
          z-index: 1;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          z-index: 2;
          width: 18%;
        }

        .step-number {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: var(--white);
          border: 3px solid var(--navy);
          color: var(--navy);
          font-weight: 700;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.03);
        }

        .timeline-step:hover .step-number {
          background-color: var(--gold);
          border-color: var(--gold);
          color: var(--navy);
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .timeline-steps {
            flex-direction: column;
            gap: 40px;
            align-items: flex-start;
          }
          .timeline-steps::before {
            display: none;
          }
          .timeline-step {
            flex-direction: row;
            text-align: left;
            width: 100%;
            gap: 20px;
          }
          .step-number {
            margin-bottom: 0;
            flex-shrink: 0;
          }
        }

        /* Smartphone Container mockup */
        .smartphone-mockup {
          width: 290px;
          height: 590px;
          background-color: var(--navy-dark);
          border-radius: 38px;
          padding: 12px;
          border: 4px solid var(--gray-700);
          box-shadow: 0 25px 50px -12px rgba(12, 35, 64, 0.25);
          position: relative;
          margin: 0 auto;
        }

        .phone-screen {
          width: 100%;
          height: 100%;
          background-color: var(--white);
          border-radius: 28px;
          overflow: hidden;
          position: relative;
          border: 1px solid var(--gray-900);
          display: flex;
          flex-direction: column;
        }

        .phone-header-notch {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 18px;
          background-color: var(--navy-dark);
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          z-index: 100;
        }

        /* Accordion FAQ */
        .faq-item {
          background-color: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: 12px;
          margin-bottom: 16px;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .faq-item:hover {
          border-color: var(--gray-300);
        }

        .faq-question {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          background: none;
          border: none;
          text-align: left;
          font-weight: 600;
          font-size: 16px;
          color: var(--navy);
          cursor: pointer;
          font-family: inherit;
        }

        .faq-answer {
          padding: 0 24px 24px;
          color: var(--gray-600);
          font-size: 15px;
          line-height: 1.6;
        }

        /* Reviews Feed styles */
        .reviews-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-top: 30px;
        }

        .review-card {
          background-color: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: left;
        }

        .review-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(12, 35, 64, 0.05);
        }

        .rating-stars {
          display: flex;
          gap: 2px;
          color: var(--gold);
          margin-bottom: 12px;
        }

        .review-comment {
          font-size: 14px;
          color: var(--gray-700);
          line-height: 1.6;
          font-style: italic;
          margin-bottom: 16px;
          flex-grow: 1;
        }

        .review-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--gray-600);
          border-top: 1px solid var(--gray-100);
          padding-top: 12px;
          margin-top: auto;
        }

        .review-stall-badge {
          background-color: #F1F5F9;
          color: var(--navy);
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 10px;
          border: 1px solid var(--gray-200);
        }

        /* Mock Stall Directory Items */
        .mock-stall-card {
          background-color: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

      `}</style>

      {/* ─── STICKY HEADER ─── */}
      <header className={`sticky-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header-content">
          {/* Logo */}
          <div className="logo-section" onClick={() => scrollToSection('home')}>
            <img 
              src="/ua-logo.png" 
              alt="UA Logo" 
              style={{ height: '42px', width: '42px', borderRadius: '50%' }}
            />
            <div>
              <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>
                BiteCheck
              </span>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--gray-600)', letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 600 }}>
                University of the Assumption
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="nav-links">
            <button className={`nav-link-item ${activeSection === 'home' ? 'active' : ''}`} onClick={() => scrollToSection('home')}>Home</button>
            <button className={`nav-link-item ${activeSection === 'about' ? 'active' : ''}`} onClick={() => scrollToSection('about')}>About</button>
            <button className={`nav-link-item ${activeSection === 'reviews' ? 'active' : ''}`} onClick={() => scrollToSection('reviews')}>Reviews</button>
            <button className={`nav-link-item ${activeSection === 'features' ? 'active' : ''}`} onClick={() => scrollToSection('features')}>Features</button>
            <button className={`nav-link-item ${activeSection === 'how-it-works' ? 'active' : ''}`} onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button className={`nav-link-item ${activeSection === 'mobile' ? 'active' : ''}`} onClick={() => scrollToSection('mobile')}>Mobile App</button>
            <button className={`nav-link-item ${activeSection === 'faq' ? 'active' : ''}`} onClick={() => scrollToSection('faq')}>FAQ</button>
          </nav>

          {/* Authentication Actions */}
          <div className="auth-actions">
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => navigate('student-login')}
            >
              Get Started <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile Toggle Button */}
          <button 
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <button className={`nav-link-item ${activeSection === 'home' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('home')}>Home</button>
          <button className={`nav-link-item ${activeSection === 'about' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('about')}>About</button>
          <button className={`nav-link-item ${activeSection === 'reviews' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('reviews')}>Reviews</button>
          <button className={`nav-link-item ${activeSection === 'features' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('features')}>Features</button>
          <button className={`nav-link-item ${activeSection === 'how-it-works' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('how-it-works')}>How It Works</button>
          <button className={`nav-link-item ${activeSection === 'mobile' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('mobile')}>Mobile App</button>
          <button className={`nav-link-item ${activeSection === 'faq' ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => scrollToSection('faq')}>FAQ</button>
          <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)' }} />
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }} 
            onClick={() => navigate('student-login')}
          >
            Start Evaluation <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* ─── HERO SECTION ─── */}
      <section id="home" className="section-padding" style={{ 
        paddingTop: '160px',
        background: `linear-gradient(135deg, rgba(12, 35, 64, 0.95), rgba(6, 19, 36, 0.97)), url("${bgMain}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'var(--white)',
        position: 'relative'
      }}>
        {/* Subtle accent blur glow */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          backgroundColor: 'var(--gold)',
          filter: 'blur(100px)',
          opacity: 0.15,
          zIndex: 0
        }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="grid-2">
            
            {/* Left Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '30px', backgroundColor: 'rgba(229, 168, 35, 0.12)', border: '1px solid rgba(229, 168, 35, 0.25)', width: 'fit-content' }}>
                <CheckCircle2 size={14} color="var(--gold)" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  UA Student Canteen Portal
                </span>
              </div>
              
              <h1 style={{ color: 'var(--white)', fontSize: 'clamp(36px, 5vw, 52px)', lineHeight: 1.1, margin: 0, fontWeight: 800, letterSpacing: '-0.03em' }}>
                Share Your Dining Experience at the <span style={{ color: 'var(--gold)' }}>UA Canteen</span>
              </h1>
              
              <p style={{ color: 'var(--gray-300)', fontSize: '17px', lineHeight: 1.6, margin: 0 }}>
                Browse University canteen food stalls, read real-time evaluations from fellow students, and submit your ratings. Help improve campus dining quality through direct and verified feedback.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-gold" onClick={() => navigate('student-login')} style={{ padding: '14px 28px', fontSize: '15px' }}>
                  Start Canteen Feedback <ArrowRight size={18} />
                </button>
                <button className="btn btn-secondary" onClick={() => scrollToSection('about')} style={{ color: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)', padding: '14px 28px', fontSize: '15px' }}>
                  Browse Details
                </button>
              </div>

              {/* Secure system stats badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', width: 'fit-content' }}>
                <ShieldCheck size={18} color="var(--gold)" />
                <span style={{ fontSize: '13px', color: 'var(--gray-300)' }}>
                  Tamper-evident verification receipts issued for all submissions.
                </span>
              </div>
            </div>

            {/* Right: Mock Canteen Stall Directory Visual */}
            <div className="animate-float" style={{ width: '100%' }}>
              <div className="mock-browser">
                <div className="browser-header">
                  <div className="browser-dot" style={{ backgroundColor: '#EF4444' }} />
                  <div className="browser-dot" style={{ backgroundColor: '#F59E0B' }} />
                  <div className="browser-dot" style={{ backgroundColor: '#10B981' }} />
                  <div className="browser-url">https://bitecheck.ua.edu.ph/stalls</div>
                </div>
                
                {/* Mock Stalls Directory Layout */}
                <div style={{ backgroundColor: 'var(--gray-50)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '340px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>Canteen Stalls Directory</span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-600)' }}>Select a stall to evaluate</span>
                  </div>

                  {/* Stall 1 */}
                  <div className="mock-stall-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', backgroundColor: '#FEF7E6', color: 'var(--gold-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>B</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>Bossing's Snack Corner</div>
                        <div style={{ fontSize: '10px', color: 'var(--gray-600)' }}>College Canteen • Food & Drinks</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gold-dark)', fontWeight: 600 }}>4.8 ★</span>
                      <button onClick={() => navigate('student-login')} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '11px' }}>Select</button>
                    </div>
                  </div>

                  {/* Stall 2 */}
                  <div className="mock-stall-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', backgroundColor: '#F1F5F9', color: 'var(--navy)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>D</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>Dad Bobs</div>
                        <div style={{ fontSize: '10px', color: 'var(--gray-600)' }}>College Canteen • Heavy Meals</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gold-dark)', fontWeight: 600 }}>4.2 ★</span>
                      <button onClick={() => navigate('student-login')} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '11px' }}>Select</button>
                    </div>
                  </div>

                  {/* Stall 3 */}
                  <div className="mock-stall-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', backgroundColor: '#EEF2F6', color: 'var(--navy-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>H</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>Delfal's Food Hub</div>
                        <div style={{ fontSize: '10px', color: 'var(--gray-600)' }}>High School Canteen • Snacking</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gold-dark)', fontWeight: 600 }}>4.5 ★</span>
                      <button onClick={() => navigate('student-login')} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '11px' }}>Select</button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── ABOUT SECTION ─── */}
      <section id="about" className="section-padding" style={{ backgroundColor: 'var(--white)' }}>
        <div className="container">
          <div className="grid-2">
            
            {/* Left Column: Image / Graphical representation */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              {/* Outer decorative box */}
              <div style={{ 
                position: 'absolute', 
                top: '-20px', 
                left: '-20px', 
                width: '100%', 
                height: '100%', 
                border: '4px solid var(--gold)', 
                borderRadius: '16px',
                zIndex: 0
              }} />
              <img 
                src={bgMain} 
                alt="University Canteen" 
                style={{ 
                  width: '100%', 
                  borderRadius: '16px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                  objectFit: 'cover', 
                  height: '350px',
                  zIndex: 1 
                }} 
              />
            </div>

            {/* Right Column: Narrative */}
            <div>
              <span className="section-tag">About BiteCheck</span>
              <h2 className="section-title">Centralizing Canteen Evaluations for the UA Community</h2>
              <p className="section-desc" style={{ marginBottom: '20px' }}>
                Canteen dining is an essential part of daily life at the University of the Assumption. To ensure that students, faculty, and staff receive nutritious, sanitary, and reasonably priced meals, BiteCheck provides a direct digital link to canteen management.
              </p>
              <p className="section-desc" style={{ marginBottom: '24px' }}>
                By logging into BiteCheck, students can rate individual food stalls on specific categories, write detailed opinions, and upload photos. This evaluation data is compiled transparently to help campus food vendors identify their strengths and immediately work on areas that need quality adjustment.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--gold-dark)', marginTop: '2px' }}><Award size={18} /></div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Student Voice First</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)' }}>Every evaluation submitted is an direct vote to improve stall food quality.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--gold-dark)', marginTop: '2px' }}><TrendingUp size={18} /></div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Transparent Ratings</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)' }}>Canteen vendors receive regular performance metrics to refine their menus.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── DYNAMIC REVIEWS FEED SECTION ─── */}
      <section id="reviews" className="section-padding" style={{ backgroundColor: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-header">
            <span className="section-tag">Student Voices</span>
            <h2 className="section-title">What Students are Saying</h2>
            <p className="section-desc">
              Highly rated evaluations submitted directly by students and staff dining at University of the Assumption canteen stalls.
            </p>
          </div>

          {loadingFeedbacks ? (
            <div style={{ padding: '60px 0', color: 'var(--gray-600)', fontSize: '15px' }}>
              <div className="animate-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--gray-200)', borderTopColor: 'var(--navy)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              Loading live student reviews...
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={{ backgroundColor: 'var(--white)', padding: '50px 24px', borderRadius: '16px', border: '1px solid var(--gray-200)', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
              <MessageSquare size={36} color="var(--gray-600)" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
              <h4 style={{ fontSize: '16px', color: 'var(--navy)', margin: '0 0 4px 0' }}>No Reviews Recorded Yet</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: '0 0 20px 0' }}>Be the first to share your dining experience and submit canteen feedback!</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('student-login')}>
                Evaluate Now
              </button>
            </div>
          ) : (
            <div className="reviews-grid">
              {feedbacks.slice(0, 6).map((item) => {
                const { stallName, cleanText } = parseComment(item.comment);
                return (
                  <div key={item.id} className="review-card">
                    <div>
                      {/* Rating Stars */}
                      <div className="rating-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            fill={i < item.rating ? "var(--gold)" : "none"} 
                            stroke="var(--gold)" 
                            style={{ opacity: i < item.rating ? 1 : 0.2 }}
                          />
                        ))}
                      </div>

                      {/* Comment */}
                      <p className="review-comment">
                        "{cleanText || "No written review comments left."}"
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="review-meta">
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--navy)', display: 'block' }}>
                          {item.customer_name || 'Anonymous Student'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--gray-600)' }}>
                          {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {stallName && (
                        <span className="review-stall-badge">
                          {stallName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="section-padding" style={{ backgroundColor: 'var(--white)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Key Features</span>
            <h2 className="section-title">Designed for Campus Dining Needs</h2>
            <p className="section-desc">
              BiteCheck is structured specifically to make the canteen feedback collection process simple, reliable, and secure.
            </p>
          </div>

          <div className="grid-3">
            
            {/* Card 1 */}
            <div className="feat-card">
              <div className="feat-icon-box">
                <Store size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Stalls Directory</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
                Browse active food stalls across both the College and High School canteens, checking their services and menus before submitting feedback.
              </p>
            </div>

            {/* Card 2 */}
            <div className="feat-card">
              <div className="feat-icon-box">
                <ClipboardEdit size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Student Feedbacks</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
                Submit evaluation scores under categories like hygiene, value, service, and food quality, with option to attach photos of your meal.
              </p>
            </div>

            {/* Card 3 */}
            <div className="feat-card">
              <div className="feat-icon-box">
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Receipt Verification</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
                Every feedback generates a secure cryptographic receipt. Verify your receipt's digital signature to prove your feedback remains unaltered.
              </p>
            </div>

            {/* Card 4 */}
            <div className="feat-card">
              <div className="feat-icon-box">
                <Lock size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Simple Student Login</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
                Access the evaluation portal securely using your official 10-digit University of the Assumption student credentials or email.
              </p>
            </div>

            {/* Card 5 */}
            <div className="feat-card">
              <div className="feat-icon-box">
                <TrendingUp size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Canteen Quality Tracking</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
                Feedback helps coordinators isolate poorly performing stalls, giving canteen owners direct data to improve menu options.
              </p>
            </div>

            {/* Card 6 */}
            <div className="feat-card">
              <div className="feat-icon-box">
                <Database size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Trust & Data Safety</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
                Underlying cryptographic structures verify database integrity, protecting reviews from database breaches or manipulation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="section-padding" style={{ backgroundColor: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">How It Works</span>
            <h2 className="section-title">Submit Canteen Feedback in Minutes</h2>
            <p className="section-desc">
              Understand the quick process to submit your authenticated canteen evaluation.
            </p>
          </div>

          <div className="timeline-steps">
            
            <div className="timeline-step">
              <div className="step-number">1</div>
              <div>
                <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>Student Login</h4>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                  Access the app securely using your 10-digit UA student ID.
                </p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-number">2</div>
              <div>
                <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>Select Canteen Stall</h4>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                  Choose which food vendor you want to evaluate.
                </p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-number">3</div>
              <div>
                <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>Rate & Comment</h4>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                  Submit category scores, upload food photos, and write reviews.
                </p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-number">4</div>
              <div>
                <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>Receive Receipt</h4>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                  Save your secure verification receipt for feedback validation.
                </p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-number">5</div>
              <div>
                <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>Service Improvement</h4>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                  Evaluations help vendors refine menus and sanitation quality.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── MOBILE APPLICATION SECTION ─── */}
      <section id="mobile" className="section-padding" style={{ backgroundColor: 'var(--white)' }}>
        <div className="container">
          <div className="grid-2">
            
            {/* Left Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <span className="section-tag">Mobile Experience</span>
              <h2 className="section-title">Take BiteCheck Anywhere</h2>
              <p className="section-desc">
                Download the BiteCheck mobile app and conveniently submit canteen evaluations anytime, anywhere within the University of the Assumption campus directly from your smartphone.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '8px 0' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '15px', color: 'var(--gray-700)' }}>
                  <CheckCircle2 size={16} color="var(--navy)" />
                  <span>Quickly browse available canteen stalls</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '15px', color: 'var(--gray-700)' }}>
                  <CheckCircle2 size={16} color="var(--navy)" />
                  <span>Submit ratings and feedback on the go</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '15px', color: 'var(--gray-700)' }}>
                  <CheckCircle2 size={16} color="var(--navy)" />
                  <span>Attach and upload photos directly from your camera</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '15px', color: 'var(--gray-700)' }}>
                  <CheckCircle2 size={16} color="var(--navy)" />
                  <span>View your previous digital signature receipts</span>
                </div>
              </div>

              {/* Download CTA / Badge info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>Experience BiteCheck on Mobile</span>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Mock Play Store badge */}
                  <div style={{ 
                    backgroundColor: 'black', 
                    color: 'white', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    border: '1px solid #333',
                    fontSize: '11px',
                    fontFamily: 'sans-serif',
                    width: 'fit-content'
                  }}>
                    <Smartphone size={24} color="var(--gold)" />
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#aaa' }}>Get it on</div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Google Play</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                    Google Play Release (Coming Soon)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Realistic Phone Mockup */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="smartphone-mockup">
                <div className="phone-header-notch" />
                <div className="phone-screen">
                  
                  {/* Phone App Header */}
                  <div style={{ backgroundColor: 'var(--navy)', color: 'var(--white)', padding: '24px 16px 12px', display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '8px' }}>
                    <img src="/ua-logo.png" alt="UA" style={{ height: '22px', width: '22px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)' }}>BiteCheck Mobile</span>
                  </div>

                  {/* App Screen Content */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--gray-50)' }}>
                    
                    {/* Progress tracker */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--navy)', fontWeight: 600 }}>
                      <span>STALL SELECT</span>
                      <span style={{ color: 'var(--gold-dark)' }}>● RATE</span>
                      <span style={{ opacity: 0.5 }}>RECEIPT</span>
                    </div>

                    {/* Selected Stall Card */}
                    <div style={{ backgroundColor: 'var(--white)', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--gray-100)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--navy)', fontWeight: 700 }}>B</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>Bossing's Snack Corner</div>
                        <div style={{ fontSize: '9px', color: 'var(--gray-600)' }}>Food Stall #2 - College Canteen</div>
                      </div>
                    </div>

                    {/* Ratings sliders mock */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>Rate Stall:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '9px', color: 'var(--gray-600)' }}>
                        <div>Food Quality (5/5)</div>
                        <div style={{ height: '6px', backgroundColor: 'var(--gold)', borderRadius: '3px', width: '100%' }} />
                        <div>Cleanliness (4/5)</div>
                        <div style={{ height: '6px', backgroundColor: 'var(--gray-200)', borderRadius: '3px', width: '100%', position: 'relative' }}>
                          <div style={{ height: '6px', backgroundColor: 'var(--gold)', borderRadius: '3px', width: '80%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Comment mock */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--gray-700)', fontWeight: 600 }}>Your Comment</span>
                      <div style={{ padding: '8px', backgroundColor: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: '6px', fontSize: '10px', color: 'var(--navy)' }}>
                        "The chicken was really crispy!"
                      </div>
                    </div>

                    {/* Secure button */}
                    <button style={{ backgroundColor: 'var(--navy)', color: 'var(--white)', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: 'auto' }}>
                      <ShieldCheck size={14} color="var(--gold)" /> Sign & Submit
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── BENEFITS SECTION ─── */}
      <section className="section-padding" style={{ backgroundColor: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Value Proposition</span>
            <h2 className="section-title">Benefits of Sharing Canteen Reviews</h2>
            <p className="section-desc">
              Your honest reviews make a difference in building a better dining environment for the University of the Assumption.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            <div style={{ backgroundColor: 'var(--white)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Better Student Representation</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6 }}>Enables students to present their culinary suggestions and sanitation concerns to canteen organizers.</p>
            </div>

            <div style={{ backgroundColor: 'var(--white)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Improved Dining Services</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6 }}>Direct data highlights areas that need refinement, leading to higher food quality, faster queues, and better service.</p>
            </div>

            <div style={{ backgroundColor: 'var(--white)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Organized Evaluations</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6 }}>Consolidates evaluations digitally, replacing vulnerable paper forms with secure, persistent database records.</p>
            </div>

            <div style={{ backgroundColor: 'var(--white)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Transparent Feedback Process</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6 }}>Every submission is cryptographically signed at the source, preventing backend administrators from altering your reviews.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── TRUST & RECEIPT VERIFICATION SECTION (CONCISE) ─── */}
      <section className="section-padding" style={{ 
        background: 'var(--navy-dark)',
        color: 'var(--white)'
      }}>
        <div className="container">
          <div className="grid-2">
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span className="section-tag" style={{ backgroundColor: 'rgba(229, 168, 35, 0.12)', color: 'var(--gold)' }}>Trust & Security</span>
              <h2 className="section-title" style={{ color: 'var(--white)' }}>Verify Your Digital Feedback Receipt</h2>
              <p style={{ color: 'var(--gray-300)', fontSize: '15px', lineHeight: 1.6 }}>
                BiteCheck protects student feedback from unauthorized alteration. Every review generates a secure verification receipt containing an Ed25519 cryptographic signature. Anyone can audit the validity of their submission to ensure the database record remains intact.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--gray-300)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Key size={16} color="var(--gold)" />
                  <span><strong>Cryptographic Seals:</strong> Secures evaluation records from data tampering.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <ShieldAlert size={16} color="var(--gold)" />
                  <span><strong>Receipt Validation:</strong> Confirm your review matches database records perfectly.</span>
                </div>
              </div>
            </div>

            {/* Verification card action */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color: 'var(--white)', fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--gold)" /> Validation Tool
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-300)', marginBottom: '20px' }}>
                Paste the signature string from your downloaded receipt into the receipt verification page to audit its validation math.
              </p>
              <button 
                className="btn btn-gold" 
                style={{ width: '100%', padding: '12px' }}
                onClick={() => navigate('verify_receipt')}
              >
                Verify Receipt Now <ArrowUpRight size={16} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section id="faq" className="section-padding" style={{ backgroundColor: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-desc">
              Get quick answers to common questions about using BiteCheck at the University of the Assumption.
            </p>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            <div className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(0)}>
                <span>What is BiteCheck?</span>
                {activeFaq === 0 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {activeFaq === 0 && (
                <div className="faq-answer">
                  BiteCheck is the official canteen evaluation and feedback platform designed for the University of the Assumption. It enables students, faculty, and staff to securely rate canteen food stalls and provides administrators with real-time, tamper-evident analytics to improve service quality.
                </div>
              )}
            </div>

            <div className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(1)}>
                <span>Who can submit canteen evaluations?</span>
                {activeFaq === 1 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {activeFaq === 1 && (
                <div className="faq-answer">
                  All active University of the Assumption stakeholders—including Junior High School (JHS), Senior High School (SHS), and College students, as well as faculty and staff—can register and log in using their 10-digit UA ID to submit evaluations.
                </div>
              )}
            </div>

            <div className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(2)}>
                <span>How does BiteCheck secure evaluations?</span>
                {activeFaq === 2 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {activeFaq === 2 && (
                <div className="faq-answer">
                  Every submission is cryptographically sealed directly on the user's browser using the Ed25519 (EdDSA) signature algorithm. If anyone attempts to modify a rating or feedback text in the database, the signature becomes invalid, and the record is flagged and isolated automatically.
                </div>
              )}
            </div>

            <div className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(3)}>
                <span>Can I review or verify my past submissions?</span>
                {activeFaq === 3 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {activeFaq === 3 && (
                <div className="faq-answer">
                  Yes. After submitting feedback, the platform displays a "Receipt Signature". You can save this signature and paste it into the "Verify Receipt" tool to confirm that your feedback is properly recorded and has not been altered.
                </div>
              )}
            </div>

            <div className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(4)}>
                <span>How do canteen owners receive the results?</span>
                {activeFaq === 4 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {activeFaq === 4 && (
                <div className="faq-answer">
                  Administrators can generate analytical PDF reports consolidating student feedback for specific stalls. These reports can be emailed directly to the verified email addresses of stall owners to help them refine their menus and operations.
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ─── FINAL CTA SECTION ─── */}
      <section className="section-padding" style={{ 
        background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%)',
        color: 'var(--white)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative circles */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(229,168,35,0.03)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-50%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(229,168,35,0.03)', zIndex: 0 }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
          <span className="section-tag" style={{ backgroundColor: 'rgba(229,168,35,0.1)', color: 'var(--gold)' }}>Ready to Evaluate?</span>
          <h2 style={{ color: 'var(--white)', fontSize: '32px', marginBottom: '16px', fontWeight: 800 }}>
            Help Improve the University Canteen Experience Today
          </h2>
          <p style={{ color: 'var(--gray-300)', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
            Submit an evaluation for your favorite food stall and make your student voice count.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => navigate('student-login')} style={{ padding: '14px 28px', fontSize: '15px' }}>
              Start Canteen Feedback <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ 
        backgroundColor: 'var(--navy-dark)', 
        color: 'var(--gray-300)', 
        borderTop: '1px solid rgba(255,255,255,0.08)', 
        padding: '60px 0 30px' 
      }}>
        <div className="container">
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            {/* Branding Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/ua-logo.png" alt="UA" style={{ height: '36px', width: '36px', borderRadius: '50%' }} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--white)' }}>BiteCheck</span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--gray-300)', maxWidth: '320px' }}>
                Canteen Evaluation Platform for the University of the Assumption. Built to empower student voices and secure feedback.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ color: 'var(--white)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Navigation</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }} style={{ color: 'var(--gray-300)', textDecoration: 'none' }}>Home</a></li>
                <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }} style={{ color: 'var(--gray-300)', textDecoration: 'none' }}>About</a></li>
                <li><a href="#reviews" onClick={(e) => { e.preventDefault(); scrollToSection('reviews'); }} style={{ color: 'var(--gray-300)', textDecoration: 'none' }}>Reviews</a></li>
                <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} style={{ color: 'var(--gray-300)', textDecoration: 'none' }}>Features</a></li>
              </ul>
            </div>

            {/* Admin and support Links */}
            <div>
              <h4 style={{ color: 'var(--white)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>System Portal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><button onClick={() => navigate('student-login')} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: 'var(--gray-300)', cursor: 'pointer', fontFamily: 'inherit' }}>Student Login</button></li>
                <li><button onClick={() => navigate('verify_receipt')} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: 'var(--gray-300)', cursor: 'pointer', fontFamily: 'inherit' }}>Verify Receipt</button></li>
                <li><a href="https://github.com/xynezakg/BiteCheck_test" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-300)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>GitHub Repository <ArrowUpRight size={12} /></a></li>
              </ul>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '30px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '12px' }}>
            <span>© 2026 University of the Assumption. All Rights Reserved.</span>
            <span style={{ color: 'var(--gray-300)', display: 'flex', gap: '8px' }}>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </span>
          </div>

        </div>
      </footer>

    </div>
  );
}