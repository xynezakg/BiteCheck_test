import React, { useState, useRef, useEffect } from "react";
import { submitFeedback, fetchStalls, fetchActiveCriteria } from "../api";
import { Star, CheckCircle2, Loader2, Lock, ShieldCheck, UploadCloud, Image as ImageIcon, X, Copy, LogOut, UserCheck, Store, ArrowRight, ArrowLeft, Utensils, UtensilsCrossed, Camera, QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Client-Side Cryptography
import naclUtil from 'tweetnacl-util';
import { sanitizeComment } from '../utils/profanityFilter';
import { generateKeyPair, signData } from '../utils/crypto';

// Background image
import bgMain from '../Background_img/wmremove-transformed.png';

export default function FeedbackForm({ navigate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ comment: "" });
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [selectedStall, setSelectedStall] = useState("");
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  const [availableStalls, setAvailableStalls] = useState([]);
  const [loadingStalls, setLoadingStalls] = useState(true);

  // Draft banner notification
  const [draftBanner, setDraftBanner] = useState(false);

  const [ratings, setRatings] = useState({});
  const [criteriaList, setCriteriaList] = useState([]);
  const [hoverRating, setHoverRating] = useState({ category: '', val: 0 });

  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [signMessage, setSignMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [receiptData, setReceiptData] = useState(null);
  const [copied, setCopied] = useState(false);

  const [user, setUser] = useState(null);

  // Camera Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Scanner cleanup error:", err));
      }
    };
  }, []);

  const startScanner = async () => {
    setScannerError(null);
    setShowScanner(true);
    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
          scannerRef.current = null;
        }
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error("Camera access error:", err);
        setScannerError("Could not access camera. Ensure camera permissions are allowed.");
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error("Failed to stop scanner:", e);
      }
    }
    setShowScanner(false);
    setScannerError(null);
  };

  const handleScanSuccess = async (decodedText) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setShowScanner(false);

    try {
      const url = new URL(decodedText);
      const autoStall = url.searchParams.get("stall");
      if (autoStall) {
        const matched = availableStalls.find(s => s.name.toLowerCase() === autoStall.toLowerCase());
        if (matched) {
          setSelectedStall(matched.name);
          setSelectedCanteen(matched.canteen_group || "College");
          setStep(2);
        } else {
          setSelectedStall("General Feedback");
          setSelectedCanteen("College");
          setStep(2);
        }
      } else {
        alert("Scan failed: QR code does not contain a canteen stall query parameter.");
      }
    } catch (err) {
      const matched = availableStalls.find(s => s.name.toLowerCase() === decodedText.toLowerCase());
      if (matched) {
        setSelectedStall(matched.name);
        setSelectedCanteen(matched.canteen_group || "College");
        setStep(2);
      } else {
        alert(`Unrecognized QR code: "${decodedText}"`);
      }
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('ua_user') || sessionStorage.getItem('ua_user');
    const storedToken = localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('login');
      return;
    }

    const loadStalls = async () => {
      try {
        setLoadingStalls(true);
        const data = await fetchStalls();
        if (data && Array.isArray(data)) {
          // Only show stalls with a verified email
          const verifiedStalls = data.filter(stall => stall.is_email_verified === true);
          setAvailableStalls(verifiedStalls);

          // QR AUTO-ROUTING LOGIC
          const params = new URLSearchParams(window.location.search);
          const autoStall = params.get('stall');

          if (autoStall) {
            const matched = verifiedStalls.find(s => s.name.toLowerCase() === autoStall.toLowerCase());
            if (matched) {
              setSelectedStall(matched.name);
              setSelectedCanteen(matched.canteen_group || "College");
              setStep(2); // 🔥 Instantly skip step 1 for QR code users to maximize UX speed!
            } else {
              setSelectedStall("General Feedback");
              setSelectedCanteen("College");
            }
          } else if (verifiedStalls.length === 0) {
            setSelectedStall("General Feedback");
            setSelectedCanteen("College");
          }
        }
      } catch (err) {
        console.error("Failed to fetch stalls from DB:", err);
        setAvailableStalls([]);
        setSelectedStall("General Feedback");
      } finally {
        setLoadingStalls(false);
      }
    };


    const checkDraft = () => {
      const savedDraft = localStorage.getItem('ua_feedback_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const params = new URLSearchParams(window.location.search);
          if (!params.get('stall')) {
            if (draft.selectedStall) setSelectedStall(draft.selectedStall);
            if (draft.ratings) {
              setRatings(prev => {
                const newRatings = { ...prev };
                Object.keys(draft.ratings).forEach(k => {
                  if (newRatings[k] !== undefined) {
                    newRatings[k] = draft.ratings[k];
                  }
                });
                return newRatings;
              });
            }
            if (draft.comment) setForm({ comment: draft.comment });
            if (draft.isAnonymous !== undefined) setIsAnonymous(draft.isAnonymous);
            if (draft.step) setStep(draft.step);
            setDraftBanner(true);
            setTimeout(() => setDraftBanner(false), 4000);
          }
        } catch (e) {
          console.error("Failed to restore draft", e);
        }
      }
    };

    const loadCriteria = async () => {
      try {
        const data = await fetchActiveCriteria();
        if (data && Array.isArray(data)) {
          setCriteriaList(data);
          setRatings(prev => {
            const newRatings = {};
            data.forEach(c => {
              newRatings[c] = prev[c] !== undefined ? prev[c] : 5;
            });
            return newRatings;
          });
        }
      } catch (err) {
        console.error("Failed to fetch criteria:", err);
      }
    };

    loadCriteria().then(loadStalls).then(checkDraft);
  }, [navigate]);


  // Auto-save draft on changes
  useEffect(() => {
    if (selectedStall || form.comment || step > 1) {
      localStorage.setItem('ua_feedback_draft', JSON.stringify({
        selectedStall,
        ratings,
        comment: form.comment,
        isAnonymous,
        step
      }));
    }
  }, [selectedStall, ratings, form.comment, isAnonymous, step]);

  const colors = {
    navy: '#0C2340',
    gold: '#E5A823',
    bg: '#F1F5F9',
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    red: '#C8102E'
  };

  const modernFont = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const getRatingLabel = (val) => {
    switch (val) {
      case 1: return "Terrible";
      case 2: return "Needs Improvement";
      case 3: return "Average";
      case 4: return "Very Good";
      case 5: return "Excellent!";
      default: return "";
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleRatingChange = (category, value) => setRatings(prev => ({ ...prev, [category]: value }));

  const totalScore = criteriaList.reduce((sum, category) => sum + (ratings[category] || 5), 0);
  const overallRating = criteriaList.length > 0 ? Math.round(totalScore / criteriaList.length) : 5;

  // Prevents white screen on logout
  const handleLogout = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      }
    } catch (err) {
      console.error("Google signOut error:", err);
    }
    localStorage.removeItem('ua_token');
    localStorage.removeItem('ua_user');
    sessionStorage.removeItem('ua_token');
    sessionStorage.removeItem('ua_user');
    window.location.href = '/';
  };

  const handleReturnHome = () => {
    setStep(1);
    setStatus("idle");
    setSelectedStall("");
    setSelectedCanteen(null);
    setRatings({});
    setForm({ comment: "" });
    setImagePreview(null);
    setReceiptData(null);
    setCopied(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const MAX_WIDTH = 800;
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setImagePreview(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateSha256 = async (message) => {
    if (!message) return "";
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.error("SHA-256 calculation error:", e);
      return "";
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // 1. Strict Symbol Validation: Block <, >, [ or ] in user comment input
    const rawComment = form.comment || "";
    if (/<|>|\[|\]/.test(rawComment)) {
      showModal("Validation Error", "Special symbols '<', '>', '[', and ']' are restricted in comments to ensure security.", "error");
      return;
    }

    setStep(4); // Move progress bar to final step
    setStatus("signing");
    setSignMessage("Initializing Ed25519 Curve...");

    const sanitizedUserComment = sanitizeComment(form.comment);
    const scoresStr = criteriaList.map(c => `${c}: ${ratings[c] || 5}/5`).join(' | ');
    const payloadText = `[Stall: ${selectedStall}] [Scores -> ${scoresStr}]\n\n${sanitizedUserComment}`;

    setSignMessage("Hashing attachment file...");
    const imageHash = imagePreview ? await calculateSha256(imagePreview) : "";

    const displayName = isAnonymous ? "Anonymous Student" : user.full_name;

    // Include the image hash inside the signature calculation
    const payloadToSign = {
      customer_name: displayName,
      rating: overallRating,
      comment: payloadText,
      attachment_hash: imageHash
    };

    try {
      setSignMessage("Generating random Ed25519 keypair on device...");
      await new Promise(resolve => setTimeout(resolve, 400));

      const { publicKey, secretKey } = generateKeyPair();
      const publicKeyBase64 = naclUtil.encodeBase64(publicKey);

      setSignMessage(`Signing payload as ${displayName}...`);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Sign the smaller payload
      const clientSignature = signData(secretKey, payloadToSign);

      setSignMessage("Transmitting signature & public key to server...");
      await new Promise(resolve => setTimeout(resolve, 400));

      // Construct the full payload containing everything (including the massive image)
      const fullPayload = {
        rating: overallRating,
        comment: payloadText,
        attachment: imagePreview,
        signature: clientSignature,
        public_key: publicKeyBase64,
        is_anonymous: isAnonymous,
        attachment_hash: imageHash
      };

      await submitFeedback(fullPayload);
      localStorage.removeItem('ua_feedback_draft');

      setReceiptData({
        signature: clientSignature,
        public_key: publicKeyBase64
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message);
      setStep(3); // Send them back to Review if there's an error
    }
  };

  const copyToClipboard = () => {
    if (receiptData?.signature) {
      navigator.clipboard.writeText(receiptData.signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const hasRestrictedSymbols = /<|>|\[|\]/.test(form.comment || "");

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, fontFamily: modernFont, position: 'relative' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        
        .top-nav { display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 1200px; margin-bottom: 40px; }
        .hero-title { font-size: 38px; }
        .hero-desc { font-size: 16px; }
        .card-inner { padding: 40px; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
        .action-buttons { display: flex; gap: 16px; justify-content: space-between; }
        .stall-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
        
        .desktop-only { display: inline; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .card-inner { padding: 24px; }
          .form-grid { grid-template-columns: 1fr; gap: 24px; }
          /* Make Action Buttons side-by-side & identical size on Mobile */
          .action-buttons { flex-direction: row !important; gap: 12px !important; margin-top: 24px !important; }
          .action-buttons button { width: 50% !important; max-width: 100% !important; flex: 1 !important; padding: 14px 8px !important; font-size: 14px !important; justify-content: center !important; }
        }

        @media (max-width: 480px) {
          .top-nav { margin-bottom: 24px; }
          .desktop-only { display: none !important; }
          .mobile-only { display: inline !important; }
          .hero-title { font-size: 30px; margin-top: 10px; }
          .hero-desc { font-size: 14px; }
          .card-inner { padding: 20px 16px; }
          .stall-grid { grid-template-columns: 1fr 1fr; }
        }

        /* --- PREMIUM CANTEEN SELECTOR DASHBOARD --- */
        .canteen-card {
          width: 290px;
          padding: 24px 20px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(12, 35, 64, 0.03);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 16px;
          user-select: none;
          box-sizing: border-box;
        }
        .canteen-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(12, 35, 64, 0.08);
          border-color: #cbd5e1;
        }
        .canteen-card:active {
          transform: scale(0.97);
        }
        .canteen-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .canteen-card:hover .canteen-card-icon {
          transform: scale(1.05) rotate(5deg);
        }
        .quick-action-btn {
          width: 100%;
          max-width: 604px;
          padding: 16px 20px;
          background-color: #ffffff;
          border: 1.5px dashed #e5a823;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(229, 168, 35, 0.04);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: center;
          gap: 16px;
          user-select: none;
          box-sizing: border-box;
          margin-top: 12px;
        }
        .quick-action-btn:hover {
          background-color: #fffbeb;
          box-shadow: 0 6px 16px rgba(229, 168, 35, 0.1);
          transform: translateY(-2px);
          border-color: #d97706;
        }
        .quick-action-btn:active {
          transform: scale(0.98);
        }
        
        @media (max-width: 640px) {
          .canteen-card {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '340px',
        backgroundImage: `url("${bgMain}")`, backgroundSize: 'cover', backgroundPosition: 'center',
        borderBottom: 'none', zIndex: 0
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.85)' }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '8px 14px', borderRadius: '10px', border: `1px solid rgba(16, 185, 129, 0.3)` }}>
            <UserCheck size={18} color={colors.success} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span className="desktop-only" style={{ color: '#A7F3D0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Authenticated as</span>
              <span className="mobile-only" style={{ color: '#A7F3D0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Logged In</span>
              <span style={{ color: colors.gold, fontSize: '14px', fontWeight: 700 }}>
                {user.full_name} <span className="desktop-only">({user.ua_id || 'Not provided'})</span>
              </span>
            </div>
          </div>

          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: colors.white, padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <LogOut size={16} />
            <span className="desktop-only" style={{ fontSize: '13px', fontWeight: 600 }}>Secure Logout</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', color: colors.white, marginBottom: '32px' }}>
          <h1 className="hero-title" style={{ fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Rate Your <span style={{ color: colors.gold }}>Experience</span>
          </h1>
          <p className="hero-desc" style={{ opacity: 0.9, margin: 0, maxWidth: '500px', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            Help us improve the UA Canteen. Your submission is mathematically sealed and linked to your verified identity.
          </p>
        </div>

        {draftBanner && (
          <div style={{ animation: 'fadeUp 0.3s ease', backgroundColor: '#ECFDF5', border: `1px solid rgba(16, 185, 129, 0.4)`, color: '#065F46', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '100%', maxWidth: '1200px', boxSizing: 'border-box' }}>
            <CheckCircle2 size={18} color="#10B981" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Draft restored! We loaded your previous feedback evaluation.</span>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '1200px', backgroundColor: colors.white, borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '24px 0', borderBottom: `1px solid ${colors.border}`, backgroundColor: '#FAFAFA' }}>
            {[1, 2, 3, 4].map((num, idx) => (
              <React.Fragment key={num}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, transition: 'all 0.3s', border: `2px solid ${step >= num ? colors.navy : colors.border}`, color: step >= num ? (step === num ? colors.white : colors.navy) : '#94A3B8', backgroundColor: step === num ? colors.navy : colors.white }}>{num}</div>
                {idx < 3 && <div style={{ width: '40px', height: '2px', backgroundColor: step > num ? colors.navy : colors.border, transition: 'all 0.3s' }}></div>}
              </React.Fragment>
            ))}
          </div>

          <div className="card-inner">

            {/* --- STEP 1: SELECT CANTEEN & STALL --- */}
            {step === 1 && status !== "signing" && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '28px', fontWeight: 800, color: colors.navy, margin: '0 0 6px 0', letterSpacing: '-0.03em' }}>Choose a Canteen</h2>
                  <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0, fontWeight: 400 }}>
                    {selectedCanteen === null 
                      ? "Browse food stalls and submit feedback."
                      : "Select the food stall you would like to review to begin."
                    }
                  </p>
                </div>

                {selectedCanteen === null ? (
                  /* SELECT CANTEEN SELECTION */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '100%' }}>
                      
                      {/* High School Canteen */}
                      <div
                        className="canteen-card"
                        onClick={() => {
                          setSelectedCanteen("SHS");
                          setSelectedStall("");
                        }}
                      >
                        <div className="canteen-card-icon" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
                          <UtensilsCrossed size={22} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.navy, margin: '0 0 2px 0' }}>High School Canteen</h3>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 4px 0', lineHeight: 1.3 }}>
                            {loadingStalls ? '...' : availableStalls.filter(s => s.canteen_group === 'SHS').length} stalls • Main Building, 1st Floor
                          </p>
                          <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            View Stalls &rarr;
                          </span>
                        </div>
                      </div>

                      {/* College Canteen */}
                      <div
                        className="canteen-card"
                        onClick={() => {
                          setSelectedCanteen("College");
                          setSelectedStall("");
                        }}
                      >
                        <div className="canteen-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
                          <Utensils size={22} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.navy, margin: '0 0 2px 0' }}>College Canteen</h3>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 4px 0', lineHeight: 1.3 }}>
                            {loadingStalls ? '...' : availableStalls.filter(s => s.canteen_group === 'College').length} stalls • Ground Floor
                          </p>
                          <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            View Stalls &rarr;
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Divider */}
                    <div style={{ width: '100%', maxWidth: '604px', height: '1px', backgroundColor: colors.border, margin: '24px 0 16px 0' }} />
                    <div style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center', width: '100%' }}>
                      Quick Actions
                    </div>

                    {/* Scan QR Code Button */}
                    <div className="quick-action-btn" onClick={startScanner}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', flexShrink: 0 }}>
                        <Camera size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: colors.navy, margin: '0 0 2px 0' }}>Scan QR Code</h4>
                        <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>Point your camera at any stall QR code to review instantly</p>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* SELECT STALLS FILTERED BY CANTEEN */
                  <div style={{ marginBottom: '48px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
                      <button 
                        onClick={() => {
                          setSelectedCanteen(null);
                          setSelectedStall("");
                        }}
                        style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 600, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        &larr; Change Canteen
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: colors.navy, backgroundColor: selectedCanteen === 'College' ? '#EFF6FF' : '#FEF2F2', padding: '4px 10px', borderRadius: '12px' }}>
                        {selectedCanteen === 'College' ? 'College Canteen' : 'High School Canteen'}
                      </span>
                    </div>

                    {loadingStalls ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: colors.textMuted, fontSize: '15px', padding: '40px 0', justifyContent: 'center', backgroundColor: colors.bg, borderRadius: '16px' }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} color={colors.navy} /> Loading available stalls...
                      </div>
                    ) : availableStalls.filter(stall => stall.canteen_group === selectedCanteen).length === 0 ? (
                      <div style={{ padding: '40px', backgroundColor: colors.bg, borderRadius: '16px', border: `2px dashed ${colors.border}`, color: colors.textMuted, fontSize: '16px', textAlign: 'center' }}>
                        <Store size={40} color="#CBD5E1" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                        No specific stalls are listed in this canteen right now.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
                        {availableStalls.filter(stall => stall.canteen_group === selectedCanteen).map((stall, index) => {
                          const isSelected = selectedStall === stall.name;

                          const fallbackImages = [
                            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80",
                            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
                            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
                            "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=400&q=80",
                            "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80"
                          ];

                          const uniquePlaceholder = fallbackImages[index % fallbackImages.length];
                          const stallImage = stall.image || stall.photo || stall.imageUrl || stall.attachment || uniquePlaceholder;

                          return (
                            <div
                              key={stall.name}
                              onClick={() => setSelectedStall(stall.name)}
                              style={{
                                width: '320px',
                                backgroundColor: colors.white,
                                borderRadius: '16px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 0 0 3px ${colors.navy}, 0 12px 24px rgba(12, 35, 64, 0.2)` : '0 4px 12px rgba(0,0,0,0.06)',
                                transform: isSelected ? 'translateY(-4px)' : 'none',
                                display: 'flex',
                                flexDirection: 'column'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                                  e.currentTarget.style.transform = 'none';
                                }
                              }}
                            >
                              {/* Card Image */}
                              <div style={{
                                height: '140px',
                                width: '100%',
                                backgroundImage: `url("${stallImage}")`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative'
                              }}>
                                {isSelected && (
                                  <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: colors.white, borderRadius: '50%', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                    <CheckCircle2 size={24} color={colors.navy} fill={colors.gold} />
                                  </div>
                                )}
                              </div>

                              {/* Card Body */}
                              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: colors.text, lineHeight: 1.3, flex: 1, paddingRight: '12px' }}>
                                      {stall.name}
                                    </h3>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>Services</div>
                                      <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>Until 5PM</div>
                                    </div>
                                  </div>
                                  {stall.canteen_group && (
                                    <span style={{ 
                                      alignSelf: 'flex-start',
                                      fontSize: '11px', 
                                      fontWeight: 700, 
                                      color: stall.canteen_group === 'College' ? '#3B82F6' : '#EF4444', 
                                      backgroundColor: stall.canteen_group === 'College' ? '#EFF6FF' : '#FEF2F2',
                                      padding: '2px 6px', 
                                      borderRadius: '4px',
                                      border: `1px solid ${stall.canteen_group === 'College' ? '#BFDBFE' : '#FCA5A5'}`
                                    }}>
                                      {stall.canteen_group === 'College' ? 'College Canteen' : 'High School Canteen'}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                                  <span style={{ padding: '6px 12px', backgroundColor: '#F8FAFC', borderRadius: '100px', fontSize: '11px', fontWeight: 500, color: colors.textMuted }}>Food Service</span>
                                  <span style={{ padding: '6px 12px', backgroundColor: '#F8FAFC', borderRadius: '100px', fontSize: '11px', fontWeight: 500, color: colors.textMuted }}>Beverages</span>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                                  <button style={{
                                    flex: 1, padding: '10px 0',
                                    backgroundColor: isSelected ? colors.navy : '#1E40AF',
                                    color: colors.white, border: 'none', borderRadius: '6px',
                                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}>
                                    {isSelected ? 'Selected' : 'Select Stall'}
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Continue button block */}
                {selectedCanteen !== null && (
                  <div style={{ display: 'flex', justifyContent: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: '32px' }}>
                    <button
                      type="button"
                      disabled={!selectedStall}
                      style={{
                        padding: '16px 48px', fontSize: '16px', fontWeight: 600,
                        backgroundColor: selectedStall ? colors.navy : '#94A3B8',
                        color: colors.white, border: 'none', borderRadius: '12px',
                        cursor: selectedStall ? 'pointer' : 'not-allowed',
                        transition: 'all 0.25s ease',
                        boxShadow: selectedStall ? '0 8px 20px rgba(12, 35, 64, 0.25)' : 'none',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '10px',
                        transform: selectedStall ? 'translateY(0)' : 'none'
                      }}
                      onMouseEnter={(e) => { if (selectedStall) { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                      onMouseLeave={(e) => { if (selectedStall) { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'translateY(0)'; } }}
                      onClick={() => setStep(2)}
                    >
                      Continue to Ratings <ArrowRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --- STEP 2: RATING & COMMENTS --- */}
            {step === 2 && status !== "signing" && (() => {
              const selectedStallObj = availableStalls.find(s => s.name === selectedStall);
              return (
                <div style={{ animation: 'fadeUp 0.4s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0' }}>Share your thoughts</h2>
                    <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      Reviewing: <strong style={{ color: colors.navy }}>{selectedStall}</strong>
                      {selectedStallObj && selectedStallObj.canteen_group && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          color: selectedStallObj.canteen_group === 'College' ? '#3B82F6' : '#EF4444', 
                          backgroundColor: selectedStallObj.canteen_group === 'College' ? '#EFF6FF' : '#FEF2F2',
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          border: `1px solid ${selectedStallObj.canteen_group === 'College' ? '#BFDBFE' : '#FCA5A5'}`
                        }}>
                          {selectedStallObj.canteen_group === 'College' ? 'College Stall' : 'High School Stall'}
                        </span>
                      )}
                    </p>
                  </div>

                <div className="form-grid">
                  {/* Ratings Column */}
                  <div style={{ backgroundColor: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '24px' }}>
                    <label style={{ fontSize: '12px', color: colors.navy, fontWeight: 700, display: 'block', marginBottom: '16px', letterSpacing: '0.05em' }}>CATEGORY SCORING</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {criteriaList.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: colors.textMuted }}>
                          <Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }} />
                          Loading evaluation categories...
                        </div>
                      ) : (
                        criteriaList.map((category) => (
                        <div key={category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid transparent` }}>
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>{category}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: colors.gold, marginTop: '2px', minHeight: '16px', transition: 'all 0.1s ease' }}>
                              {getRatingLabel(hoverRating.category === category ? hoverRating.val : ratings[category])}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isHovered = hoverRating.category === category && hoverRating.val >= star;
                              const isActive = ratings[category] >= star;
                              return (
                                <Star
                                  key={star} size={22}
                                  onClick={() => handleRatingChange(category, star)}
                                  onMouseEnter={() => setHoverRating({ category, val: star })}
                                  onMouseLeave={() => setHoverRating({ category: '', val: 0 })}
                                  fill={isHovered || isActive ? colors.gold : 'transparent'}
                                  color={isHovered || isActive ? colors.gold : '#CBD5E1'}
                                  style={{ cursor: 'pointer', transition: 'transform 0.1s', transform: isHovered ? 'scale(1.15)' : 'scale(1)' }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                    </div>
                  </div>

                  {/* Comments & Upload Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>ADDITIONAL COMMENTS</label>
                      <textarea
                        name="comment" placeholder="Tell us what you liked or how we can improve..." value={form.comment} onChange={handleChange}
                        maxLength={500}
                        style={{ width: '100%', height: '140px', padding: '16px', fontSize: '15px', borderRadius: '8px', border: `1px solid ${hasRestrictedSymbols ? colors.red : (form.comment.length > 0 && form.comment.length < 10 ? colors.red : colors.border)}`, backgroundColor: colors.bg, resize: 'none', outline: 'none', color: colors.text, fontFamily: 'inherit', transition: 'border 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = hasRestrictedSymbols ? colors.red : colors.navy}
                        onBlur={(e) => e.target.style.borderColor = hasRestrictedSymbols ? colors.red : colors.border}
                      ></textarea>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                        <span style={{ color: (hasRestrictedSymbols || form.comment.length < 10) ? colors.red : colors.success, fontWeight: 500 }}>
                          {hasRestrictedSymbols 
                            ? "⚠️ Restricted symbols detected" 
                            : (form.comment.length < 10 ? `Min 10 characters required (${10 - form.comment.length} left)` : "✓ Minimum length requirement met")}
                        </span>
                        <span style={{ color: colors.textMuted }}>
                          {form.comment.length} / 500
                        </span>
                      </div>
                      {hasRestrictedSymbols && (
                        <div style={{ color: colors.red, fontSize: '12px', fontWeight: 600, marginTop: '6px', textAlign: 'left' }}>
                          ⚠️ Symbols &lt;, &gt;, [ and ] are restricted to ensure comment security.
                        </div>
                      )}
                    </div>

                    <div style={{ backgroundColor: '#F8FAFC', border: `1px solid ${colors.border}`, padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setIsAnonymous(!isAnonymous)}>
                      <input 
                        type="checkbox" 
                        checked={isAnonymous} 
                        onChange={() => {}} // handled by parent div click
                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', accentColor: colors.navy }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>Submit Anonymously</span>
                        <span style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px', lineHeight: 1.4 }}>
                          Your review will be posted as <strong>"Anonymous Student"</strong> in public feeds. The cryptographic seal remains intact.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>PHOTO EVIDENCE (OPTIONAL)</label>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

                      {!imagePreview ? (
                        <div
                          onClick={() => fileInputRef.current.click()}
                          style={{ width: '100%', minHeight: '100px', padding: '24px', border: `2px dashed ${colors.border}`, borderRadius: '8px', backgroundColor: colors.bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', boxSizing: 'border-box' }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.navy}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
                        >
                          <UploadCloud size={24} color={colors.textMuted} />
                          <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 500, textAlign: 'center' }}>Click to upload photo</span>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                          <img src={imagePreview} alt="Evidence Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => setImagePreview(null)} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="action-buttons" style={{ marginTop: '32px' }}>
                  <button
                    type="button"
                    style={{ padding: '16px 32px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.white}
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    type="button"
                    disabled={form.comment.length < 10 || hasRestrictedSymbols}
                    style={{
                      padding: '16px 40px',
                      fontSize: '15px',
                      fontWeight: 600,
                      backgroundColor: (form.comment.length < 10 || hasRestrictedSymbols) ? '#CBD5E1' : colors.navy,
                      color: colors.white,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (form.comment.length < 10 || hasRestrictedSymbols) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: (form.comment.length < 10 || hasRestrictedSymbols) ? 'none' : '0 4px 12px rgba(12, 35, 64, 0.2)',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (form.comment.length >= 10 && !hasRestrictedSymbols) {
                        e.currentTarget.style.backgroundColor = '#17365C';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (form.comment.length >= 10 && !hasRestrictedSymbols) {
                        e.currentTarget.style.backgroundColor = colors.navy;
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                    onClick={() => {
                      if (form.comment.length < 10 || hasRestrictedSymbols) return;
                      setErrorMessage("");
                      setStatus("idle");
                      setStep(3);
                    }}
                  >
                    Review Feedback <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            );
          })()}

            {/* --- STEP 3: REVIEW --- */}
            {step === 3 && status !== "signing" && status !== "success" && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0' }}>Verify your submission</h2>
                  <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Please check your details before we cryptographically seal them.</p>
                </div>

                <div style={{ backgroundColor: colors.bg, borderRadius: '12px', padding: '24px', marginBottom: '32px', border: `1px solid ${colors.border}` }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>SELECTED STALL</span>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: colors.navy, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Store size={16} color={colors.gold} /> {selectedStall}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>SUBMISSION IDENTITY</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: isAnonymous ? colors.textMuted : colors.success, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isAnonymous ? (
                        <>
                          <Lock size={16} color={colors.textMuted} /> Anonymous Student
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> {user.full_name}
                        </>
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>OVERALL SCORE</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: colors.navy, fontSize: '18px' }}>{overallRating} / 5</span>
                      <Star size={16} fill={colors.gold} color={colors.gold} />
                    </div>
                  </div>

                  <div style={{ borderBottom: form.comment || imagePreview ? `1px solid ${colors.border}` : 'none', paddingBottom: form.comment || imagePreview ? '16px' : '0', marginBottom: form.comment || imagePreview ? '16px' : '0' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>CATEGORY BREAKDOWN</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {criteriaList.map((cat) => {
                        const val = ratings[cat] || 5;
                        return (
                          <div key={cat} style={{ fontSize: '12px', backgroundColor: colors.white, padding: '6px 12px', borderRadius: '20px', border: `1px solid ${colors.border}`, fontWeight: 500, color: colors.text }}>
                            {cat}: <strong style={{ color: colors.navy }}>{val}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {form.comment && (
                    <div style={{ borderBottom: imagePreview ? `1px solid ${colors.border}` : 'none', paddingBottom: imagePreview ? '16px' : '0', marginBottom: imagePreview ? '16px' : '0' }}>
                      <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>COMMENTS</span>
                      <p style={{ fontSize: '14px', fontStyle: 'italic', color: colors.text, lineHeight: '1.6', margin: 0 }}>"{form.comment}"</p>
                    </div>
                  )}

                  {imagePreview && (
                    <div>
                      <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', letterSpacing: '0.05em' }}>
                        <ImageIcon size={14} /> ATTACHED EVIDENCE
                      </span>
                      <img src={imagePreview} alt="Evidence Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain', border: `1px solid ${colors.border}`, backgroundColor: colors.white, padding: '8px' }} />
                    </div>
                  )}
                </div>

                {status === "error" && (
                  <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 600, backgroundColor: '#FFE4E6', color: '#E11D48', border: '1px solid #FDA4AF' }}>
                    Error: {errorMessage}
                  </div>
                )}

                <div className="action-buttons">
                  <button
                    type="button"
                    style={{ padding: '16px 32px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.white}
                    onClick={() => { setStatus("idle"); setErrorMessage(""); setStep(2); }}
                  >
                    <ArrowLeft size={18} /> Back to Edit
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, maxWidth: '400px', padding: '16px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(12, 35, 64, 0.2)', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'none'; }}
                    onClick={handleSubmit}
                  >
                    <Lock size={16} color={colors.gold} /> Sign & Submit
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 4: CRYPTO ANIMATION --- */}
            {status === "signing" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
                <Loader2 size={48} color={colors.navy} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '24px' }} />
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, marginBottom: '12px', letterSpacing: '-0.02em' }}>Securing Data Payload</h3>
                <div style={{ backgroundColor: colors.white, color: colors.navy, padding: '16px 20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '500', width: '100%', maxWidth: '340px', textAlign: 'center', border: `1px solid ${colors.border}`, boxShadow: '0 8px 24px rgba(12, 35, 64, 0.08)', wordBreak: 'break-word', boxSizing: 'border-box', margin: '0 auto' }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>
                    <strong style={{ color: colors.gold, marginRight: '6px' }}>&gt;</strong>
                    {signMessage}
                  </span>
                </div>
                <style>{`
                  @keyframes spin { 100% { transform: rotate(360deg); } }
                  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
              </div>
            )}

            {/* --- STEP 4: MODERN DIGITAL RECEIPT WITH COPY & SCREENSHOT UX --- */}
            {status === "success" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0', textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>

                <div style={{ width: '70px', height: '70px', backgroundColor: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '4px solid #10B981' }}>
                  <ShieldCheck size={36} color="#10B981" />
                </div>

                <h3 style={{ fontSize: '26px', fontWeight: 700, color: colors.navy, marginBottom: '8px', letterSpacing: '-0.02em' }}>Review Secured</h3>
                <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px', maxWidth: '400px', lineHeight: 1.6 }}>
                  Your feedback for <strong>{selectedStall}</strong> is now mathematically sealed in the database.
                </p>

                <div style={{ width: '100%', maxWidth: '440px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    YOUR ED25519 RECEIPT SIGNATURE
                  </label>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', color: colors.navy, backgroundColor: colors.white, padding: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, wordBreak: 'break-all', marginBottom: '12px', lineHeight: 1.4 }}>
                    {receiptData?.signature || 'Generating...'}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={copyToClipboard}
                      style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 600, backgroundColor: copied ? colors.success : colors.white, color: copied ? colors.white : colors.text, border: `1px solid ${copied ? colors.success : colors.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontFamily: 'inherit' }}
                    >
                      {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy Signature</>}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center', margin: '16px 0 0 0' }}>
                    📸 Tip: Take a screenshot of this page for your records.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleReturnHome}
                    style={{ width: '100%', padding: '16px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#17365C'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.navy}
                  >
                    Evaluate Another Stall
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 600, backgroundColor: 'transparent', color: colors.textMuted, border: `1.5px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = colors.red; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.border; }}
                  >
                    Log Out
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>

      {/* ─── CAMERA SCANNER OVERLAY MODAL ─── */}
      {showScanner && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '450px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', position: 'relative',
            animation: 'fadeUp 0.3s ease'
          }}>
            
            {/* Close Button */}
            <button
              onClick={stopScanner}
              style={{
                position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none',
                color: colors.textMuted, cursor: 'pointer', padding: '6px', borderRadius: '50%',
                transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', marginBottom: '16px' }}>
                <QrCode size={26} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: colors.navy, margin: '0 0 6px 0' }}>Scan Stall QR Code</h3>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                Position the printed QR Code sticker in the center of the scanner frame to select the stall.
              </p>
            </div>

            {/* Scanner Frame Box */}
            <div style={{
              borderRadius: '16px', overflow: 'hidden', border: `2px dashed ${colors.border}`,
              backgroundColor: '#0F172A', position: 'relative', width: '100%', aspectRatio: '1/1',
              boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <style>{`
                #reader canvas { display: none !important; }
                #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 14px; }
              `}</style>
              <div id="reader" style={{ width: '100%', height: '100%' }}></div>
              
              {/* Sleek Single Scan Reticle Overlay */}
              <div style={{
                position: 'absolute', width: '220px', height: '220px',
                border: '2.5px solid #E5A823', borderRadius: '18px',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)', pointerEvents: 'none'
              }}></div>
            </div>

            {/* Error Message Box if camera fails */}
            {scannerError && (
              <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                {scannerError}
              </div>
            )}

            <button
              onClick={stopScanner}
              style={{
                marginTop: '24px', width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                backgroundColor: '#F1F5F9', color: '#1E293B', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            >
              Cancel Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
