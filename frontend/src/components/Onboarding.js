import React, { useState } from 'react';
import { ArrowRight, Sparkles, Utensils, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const [slide, setSlide] = useState(0);

  const colors = {
    navy: '#0C2340',
    gold: '#E5A823',
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
    bg: '#F8FAFC'
  };

  const handleNext = () => {
    if (slide < 2) {
      setSlide(slide + 1);
    } else {
      localStorage.setItem('ua_onboarded', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('ua_onboarded', 'true');
    onComplete();
  };

  const slides = [
    {
      icon: <Sparkles size={48} color={colors.gold} />,
      title: "Welcome to BiteCheck",
      description: "The official Canteen Evaluation System of the University of the Assumption. Your opinion drives our canteen standards.",
      image: "/ua-logo.png"
    },
    {
      icon: <Utensils size={48} color={colors.gold} />,
      title: "How BiteCheck Works",
      steps: [
        "1. Scan a Stall's counter QR Code (or select manually)",
        "2. Rate criteria like Food quality, Service, and Staff friendliness",
        "3. Leave an optional photo or review comment"
      ]
    },
    {
      icon: <ShieldCheck size={48} color={colors.gold} />,
      title: "Your Voice, Secured",
      description: "Every evaluation is mathematically sealed inside the database using client-side cryptographic keys. Your responses are secure, integrity-protected, and trusted by the UA Administration.",
      badge: "Cryptographically Secured"
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.navy,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="card animate-in" style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: colors.white,
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '520px',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        
        {/* Skip button (top right) */}
        {slide < 2 && (
          <button
            onClick={handleSkip}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Skip
          </button>
        )}

        {/* Top Icon / Image */}
        <div style={{ marginTop: '20px' }}>
          {slide === 0 ? (
            <img
              src={slides[0].image}
              alt="University Logo"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                marginBottom: '24px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)'
              }}
            />
          ) : (
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '24px',
              backgroundColor: '#FFFBEB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px'
            }}>
              {slides[slide].icon}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: colors.navy,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em'
          }}>
            {slides[slide].title}
          </h2>

          {slide === 1 ? (
            <div style={{
              textAlign: 'left',
              backgroundColor: colors.bg,
              padding: '20px',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {slides[1].steps.map((step, idx) => (
                <div key={idx} style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: colors.text,
                  lineHeight: '1.4'
                }}>
                  {step}
                </div>
              ))}
            </div>
          ) : (
            <p style={{
              fontSize: '14px',
              color: colors.textMuted,
              lineHeight: '1.6',
              margin: '0 auto',
              maxWidth: '340px'
            }}>
              {slides[slide].description}
            </p>
          )}

          {slide === 2 && (
            <div style={{
              marginTop: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '6px 12px',
              borderRadius: '20px',
              color: '#059669',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              alignSelf: 'center'
            }}>
              <CheckCircle2 size={12} /> {slides[2].badge}
            </div>
          )}
        </div>

        {/* Navigation Indicator & Buttons */}
        <div style={{ width: '100%', marginTop: '32px' }}>
          {/* Slider Dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}>
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                style={{
                  width: idx === slide ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === slide ? colors.gold : colors.border,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={handleNext}
            style={{
              width: '100%',
              padding: '16px 24px',
              backgroundColor: colors.navy,
              color: colors.white,
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.2s',
              fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(12, 35, 64, 0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {slide === 2 ? 'Get Started' : 'Continue'}
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}