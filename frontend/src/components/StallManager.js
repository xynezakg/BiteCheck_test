import React, { useState, useEffect, useRef } from 'react';
import { fetchStalls, addStall, editStall, deleteStall, sendStallReport } from '../api';
import { Store, Plus, Trash2, Loader2, AlertCircle, Image as ImageIcon, X, Edit3, Save, QrCode, Mail, Send, CheckCircle2, Info } from 'lucide-react';

export default function StallManager() {
  const [stalls, setStalls] = useState([]);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newCanteenGroup, setNewCanteenGroup] = useState("College");
  const [editingStallId, setEditingStallId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Custom Modal State
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "success" });
  const showModal = (title, message, type = "success") => setModalState({ isOpen: true, title, message, type });
  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  // Sudo Delete Modal State
  const [sudoDeleteModal, setSudoDeleteModal] = useState({ isOpen: false, stallId: null, stallName: "", inputPhrase: "" });

  const colors = {
    navy: '#0C2340', gold: '#E5A823', bg: '#F1F5F9',
    white: '#FFFFFF', text: '#1E293B', textMuted: '#64748B',
    border: '#E2E8F0', red: '#EF4444', blue: '#3B82F6'
  };

  useEffect(() => {
    loadStalls();
  }, []);

  const loadStalls = async () => {
    try {
      setLoading(true);
      const data = await fetchStalls();
      setStalls(data);
      setError("");
    } catch (err) {
      setError("Failed to load stalls.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const MAX_WIDTH = 600;
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setNewImage(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const isEditing = !!editingStallId;
      const existingStall = isEditing ? stalls.find(s => s.id === editingStallId) : null;
      const emailInput = newEmail.trim();
      // Check if it's a new email or if the email was changed during an update
      const emailChanged = isEditing ? (existingStall?.email !== emailInput) : !!emailInput;

      if (isEditing) {
        // Edit Existing
        const updated = await editStall(editingStallId, newName.trim(), newImage, emailInput, newCanteenGroup);
        setStalls(stalls.map(s => s.id === editingStallId ? updated : s));
      } else {
        // Add New
        const newStall = await addStall(newName.trim(), newImage, emailInput, newCanteenGroup);
        setStalls([...stalls, newStall]);
      }

      handleCancelEdit();
      setIsFormModalOpen(false);
      setError("");

      const actionText = isEditing ? "updated" : "added";
      if (emailInput && emailChanged) {
        showModal("Success!", `Stall ${actionText} successfully! A verification email has been sent to ${emailInput}.`, "success");
      } else {
        showModal("Success!", `Stall ${actionText} successfully!`, "success");
      }
    } catch (err) {
      setError(err.message || "Operation failed.");
    }
  };

  const handleEditClick = (stall) => {
    setEditingStallId(stall.id);
    setNewName(stall.name);
    setNewImage(stall.image || null);
    setNewEmail(stall.email || "");
    setNewCanteenGroup(stall.canteen_group || "College");
    setIsFormModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingStallId(null);
    setNewName("");
    setNewImage(null);
    setNewEmail("");
    setNewCanteenGroup("College");
    setIsFormModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadQR = (stallName) => {
    try {
      const safeStallName = encodeURIComponent(stallName);
      const targetUrl = `${window.location.origin}/?stall=${safeStallName}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(targetUrl)}&margin=20`;

      showModal("Generating", "Preparing your branded QR code... Please wait.", "info");

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrApiUrl;

      qrImg.onload = () => {
        const logoImg = new Image();
        logoImg.src = "/app_logo.png";
        
        logoImg.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 500;
          canvas.height = 580;
          const ctx = canvas.getContext("2d");

          // 1. Draw solid white background
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, 500, 580);

          // 2. Draw raw QR code
          ctx.drawImage(qrImg, 0, 0, 500, 500);

          // 3. Draw white center circular border overlay
          const centerX = 250;
          const centerY = 250;
          const radius = 42; // 84px diameter
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();

          // 4. Draw center logo centered inside circle
          const logoSize = 64; // 64px width and height
          ctx.drawImage(logoImg, centerX - (logoSize / 2), centerY - (logoSize / 2), logoSize, logoSize);

          // 5. Draw text label at the bottom
          ctx.fillStyle = "#0C2340"; // Navy blue
          ctx.font = "800 24px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(stallName.toUpperCase(), 250, 540);

          // 6. Trigger download
          const canvasUrl = canvas.toDataURL("image/png");
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = canvasUrl;
          a.download = `QR_${stallName.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          closeModal();
        };

        logoImg.onerror = () => {
          // Fallback without logo
          const canvas = document.createElement("canvas");
          canvas.width = 500;
          canvas.height = 580;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, 500, 580);
          ctx.drawImage(qrImg, 0, 0, 500, 500);

          ctx.fillStyle = "#0C2340";
          ctx.font = "800 24px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(stallName.toUpperCase(), 250, 540);

          const canvasUrl = canvas.toDataURL("image/png");
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = canvasUrl;
          a.download = `QR_${stallName.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          closeModal();
        };
      };

      qrImg.onerror = () => {
        showModal("Error", "Failed to generate QR. Ensure you have an active internet connection.", "error");
      };
    } catch (e) {
      showModal("Error", "An unexpected error occurred generating the QR code.", "error");
    }
  };

  const handleDelete = (id) => {
    const stall = stalls.find(s => s.id === id);
    if (!stall) return;
    setSudoDeleteModal({
      isOpen: true,
      stallId: id,
      stallName: stall.name,
      inputPhrase: ""
    });
  };

  const executeDeleteStall = async () => {
    const id = sudoDeleteModal.stallId;
    try {
      if (editingStallId === id) handleCancelEdit();
      await deleteStall(id);
      setStalls(stalls.filter(s => s.id !== id));
      setError("");
      setSudoDeleteModal({ isOpen: false, stallId: null, stallName: "", inputPhrase: "" });
      showModal("Success!", "Stall has been successfully removed.", "success");
    } catch (err) {
      setError("Failed to delete stall.");
      setSudoDeleteModal(prev => ({ ...prev, isOpen: false }));
      showModal("Error", "Failed to delete stall.", "error");
    }
  };

  const handleSendReport = async (id) => {
    try {
      showModal("Processing", "Generating and sending report... Please wait.", "info");
      await sendStallReport(id);
      showModal("Success!", "Report sent successfully!", "success");
    } catch (err) {
      showModal("Error", err.message || "Failed to send report.", "error");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ─── RESPONSIVE LAYOUT STYLES ─── */}
      <style>{`
        .canteen-directory-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .canteen-directory-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .stall-row:hover { background-color: #F8FAFC !important; }
      `}</style>

      {/* ─── TOP: PAGE HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: '16px', padding: '24px 32px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(12, 35, 64, 0.05)', padding: '12px', borderRadius: '12px', color: colors.navy }}>
            <Store size={28} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: colors.navy, fontWeight: 800, letterSpacing: '-0.02em' }}>Manage Canteen Stalls</h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: colors.textMuted }}>Create, edit, and audit food stalls inside the canteens.</p>
          </div>
        </div>
        <button 
          onClick={() => { handleCancelEdit(); setIsFormModalOpen(true); }}
          style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(12,35,64,0.1)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}
        >
          <Plus size={18} /> Add New Stall
        </button>
      </div>

      {/* ─── FORM MODAL POPUP ─── */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(12, 35, 64, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '16px',
            width: '100%', maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden', border: `1px solid ${colors.border}`,
            animation: 'fadeUp 0.3s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: colors.bg
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: colors.navy }}>
                {editingStallId ? 'Edit Canteen Stall' : 'Create New Canteen Stall'}
              </h3>
              <button 
                onClick={handleCancelEdit} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEF2F2', color: colors.red, padding: '12px 16px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 500, border: '1px solid #FECACA' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', letterSpacing: '0.03em' }}>STALL NAME <span style={{ color: colors.red }}>*</span></label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Dad Bobs Canteen..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1.5px solid ${colors.border}`, fontSize: '14.5px', color: colors.text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', letterSpacing: '0.03em' }}>STALL OWNER EMAIL <span style={{ color: colors.red }}>*</span></label>
                <input
                  required
                  type="email"
                  placeholder="owner@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1.5px solid ${colors.border}`, fontSize: '14.5px', color: colors.text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', letterSpacing: '0.03em' }}>CANTEEN GROUP <span style={{ color: colors.red }}>*</span></label>
                <select
                  value={newCanteenGroup}
                  onChange={(e) => setNewCanteenGroup(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1.5px solid ${colors.border}`, fontSize: '14.5px', color: colors.text, outline: 'none', backgroundColor: '#FFFFFF', boxSizing: 'border-box', fontFamily: 'inherit' }}
                >
                  <option value="College">College Canteen</option>
                  <option value="SHS">High School Canteen (SHS / JHS)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', letterSpacing: '0.03em' }}>COVER PHOTO</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                {!newImage ? (
                  <div
                    onClick={() => fileInputRef.current.click()}
                    style={{ width: '100%', padding: '24px', border: `2px dashed ${colors.border}`, borderRadius: '8px', backgroundColor: colors.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  >
                    <div style={{ backgroundColor: colors.white, padding: '8px', borderRadius: '50%', border: `1px solid ${colors.border}` }}><ImageIcon size={20} color={colors.textMuted} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', color: colors.text, fontWeight: 600 }}>Click to upload cover photo</span>
                      <span style={{ fontSize: '11.5px', color: colors.textMuted }}>Recommended ratio 16:9 (JPG/PNG)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                    <img src={newImage} alt="Stall Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => { setNewImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${colors.border}`, paddingTop: '20px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || !newEmail.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: (newName.trim() && newEmail.trim()) ? (editingStallId ? colors.blue : colors.navy) : '#CBD5E1', color: colors.white, border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: (newName.trim() && newEmail.trim()) ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                >
                  {editingStallId ? <><Save size={16} /> Save Changes</> : <><Plus size={16} /> Create Stall</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── BOTTOM: TWO-COLUMN CANTEEN DIRECTORIES ─── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMuted, fontSize: '14px', padding: '32px', justifyContent: 'center', backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading stalls...
        </div>
      ) : (
        <div className="canteen-directory-grid">

          {/* ── COLLEGE CANTEEN ── */}
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: 'rgba(12,35,64,0.05)', padding: '8px', borderRadius: '8px' }}>
                  <Store size={18} color={colors.navy} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: colors.navy }}>College Canteen</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>Food stalls for college students</p>
                </div>
              </div>
              <span style={{ backgroundColor: colors.bg, color: colors.textMuted, fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                {stalls.filter(s => s.canteen_group === 'College').length} stalls
              </span>
            </div>

            <div style={{ padding: '8px 16px 16px' }}>
              {stalls.filter(s => s.canteen_group === 'College').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: colors.textMuted, fontSize: '14px' }}>
                  <Store size={28} color="#CBD5E1" style={{ margin: '0 auto 8px', display: 'block' }} />
                  No college canteen stalls yet.
                </div>
              ) : stalls.filter(s => s.canteen_group === 'College').map(stall => (
                <div key={stall.id} className="stall-row" style={{ display: 'flex', alignItems: 'center', padding: '12px 8px', borderBottom: `1px solid ${colors.border}`, gap: '12px', transition: 'background-color 0.15s', backgroundColor: editingStallId === stall.id ? colors.bg : 'transparent', borderRadius: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: colors.bg, overflow: 'hidden', flexShrink: 0, border: `1px solid ${colors.border}` }}>
                    {stall.image ? <img src={stall.image} alt={stall.name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={16} color="#94A3B8" /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: colors.text, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stall.name}</div>
                    {stall.email && <div style={{ fontSize: '11px', color: stall.is_email_verified ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}><Mail size={10} /> {stall.email} {stall.is_email_verified ? '(Verified)' : '(Unverified)'}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {stall.is_email_verified && <button onClick={() => handleSendReport(stall.id)} style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#15803D', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Send AI Report"><Send size={14} /></button>}
                    <button onClick={() => handleDownloadQR(stall.name)} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Download QR"><QrCode size={14} /></button>
                    <button onClick={() => handleEditClick(stall)} style={{ background: 'rgba(12,35,64,0.05)', border: '1px solid rgba(12,35,64,0.15)', color: colors.navy, cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Edit"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(stall.id)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── HIGH SCHOOL CANTEEN ── */}
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: 'rgba(12,35,64,0.05)', padding: '8px', borderRadius: '8px' }}>
                  <Store size={18} color={colors.navy} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: colors.navy }}>High School Canteen</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>Food stalls for SHS &amp; JHS students</p>
                </div>
              </div>
              <span style={{ backgroundColor: colors.bg, color: colors.textMuted, fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                {stalls.filter(s => s.canteen_group === 'SHS' || s.canteen_group === 'High School').length} stalls
              </span>
            </div>

            <div style={{ padding: '8px 16px 16px' }}>
              {stalls.filter(s => s.canteen_group === 'SHS' || s.canteen_group === 'High School').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: colors.textMuted, fontSize: '14px' }}>
                  <Store size={28} color="#CBD5E1" style={{ margin: '0 auto 8px', display: 'block' }} />
                  No high school canteen stalls yet.
                </div>
              ) : stalls.filter(s => s.canteen_group === 'SHS' || s.canteen_group === 'High School').map(stall => (
                <div key={stall.id} className="stall-row" style={{ display: 'flex', alignItems: 'center', padding: '12px 8px', borderBottom: `1px solid ${colors.border}`, gap: '12px', transition: 'background-color 0.15s', backgroundColor: editingStallId === stall.id ? colors.bg : 'transparent', borderRadius: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: colors.bg, overflow: 'hidden', flexShrink: 0, border: `1px solid ${colors.border}` }}>
                    {stall.image ? <img src={stall.image} alt={stall.name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={16} color="#94A3B8" /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: colors.text, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stall.name}</div>
                    {stall.email && <div style={{ fontSize: '11px', color: stall.is_email_verified ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}><Mail size={10} /> {stall.email} {stall.is_email_verified ? '(Verified)' : '(Unverified)'}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {stall.is_email_verified && <button onClick={() => handleSendReport(stall.id)} style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#15803D', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Send AI Report"><Send size={14} /></button>}
                    <button onClick={() => handleDownloadQR(stall.name)} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Download QR"><QrCode size={14} /></button>
                    <button onClick={() => handleEditClick(stall)} style={{ background: 'rgba(12,35,64,0.05)', border: '1px solid rgba(12,35,64,0.15)', color: colors.navy, cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Edit"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(stall.id)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}




      {/* ─── CUSTOM MODAL ─── */}
      {modalState.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: colors.white, padding: '32px', borderRadius: '16px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', transform: 'translateY(0)', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              {modalState.type === 'success' && <div style={{ backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '50%' }}><CheckCircle2 color="#10B981" size={28} /></div>}
              {modalState.type === 'error' && <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '50%' }}><AlertCircle color="#EF4444" size={28} /></div>}
              {modalState.type === 'info' && <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '50%' }}><Info color="#3B82F6" size={28} /></div>}
              <h3 style={{ margin: 0, fontSize: '22px', color: colors.navy, fontWeight: 700 }}>{modalState.title}</h3>
            </div>
            <p style={{ margin: '0 0 28px 0', color: colors.textMuted, fontSize: '15px', lineHeight: 1.6 }}>
              {modalState.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'} onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── SECURE SUDO DELETE MODAL ─── */}
      {sudoDeleteModal.isOpen && (() => {
        const requiredPhrase = `sudo-delete-${sudoDeleteModal.stallName.toLowerCase().replace(/\s+/g, '-')}`;
        const canDelete = sudoDeleteModal.inputPhrase === requiredPhrase;
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div style={{ backgroundColor: colors.white, padding: '32px', borderRadius: '16px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '50%' }}><Trash2 color="#EF4444" size={28} /></div>
                <h3 style={{ margin: 0, fontSize: '20px', color: colors.navy, fontWeight: 700 }}>Confirm Deletion</h3>
              </div>

              <p style={{ margin: '0 0 16px 0', color: colors.textMuted, fontSize: '14px', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong style={{ color: colors.navy }}>{sudoDeleteModal.stallName}</strong>? This will permanently delete the stall cover image, PDF reports, and all related student feedback data.
              </p>

              <div style={{ marginBottom: '24px', backgroundColor: colors.bg, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '6px', fontWeight: 600 }}>REQUIRED VERIFICATION CODE:</div>
                <code style={{ fontSize: '14px', fontWeight: 'bold', color: colors.red, wordBreak: 'break-all', fontFamily: 'monospace' }}>{requiredPhrase}</code>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px' }}>TYPE CODE TO PROCEED</label>
                <input 
                  type="text" 
                  placeholder={requiredPhrase}
                  value={sudoDeleteModal.inputPhrase}
                  onChange={(e) => setSudoDeleteModal(prev => ({ ...prev, inputPhrase: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${canDelete ? '#10B981' : colors.border}`, outline: 'none', fontSize: '14px', color: colors.text, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setSudoDeleteModal({ isOpen: false, stallId: null, stallName: "", inputPhrase: "" })} 
                  style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  disabled={!canDelete}
                  onClick={executeDeleteStall} 
                  style={{ backgroundColor: canDelete ? colors.red : '#CBD5E1', color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: canDelete ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}