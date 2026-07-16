import React, { useEffect, useState, useRef } from "react";
import StallManager from './StallManager';
import { getAdminFeedbacks, verifyFeedback, deleteFeedback, quarantineFeedback, getFeedbackPhoto, fetchStalls, getUserDemographics, fetchUsers, deleteUser, fetchAllCriteria, createCriteria, updateCriteria, deleteCriteria, verifyAdminPassword, purgeAllFeedbacks } from "../api";
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
  LineChart, Line
} from 'recharts';
import { Camera, LayoutDashboard, FileText, LogOut, ShieldCheck, X, Star, Key, Hash, ShieldAlert, Search, Download, AlertTriangle, Clock, Terminal, Trash2, ChevronLeft, ChevronRight, Loader2, Store, Trophy, Medal, Award, Users, Edit } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://bite-check-backend.vercel.app/api';

export default function AdminDashboard({ navigate }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [verifyState, setVerifyState] = useState({});
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [traceModal, setTraceModal] = useState(null);
  const [traceStatus, setTraceStatus] = useState('loading');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Custom Modal State for Confirmations & Alerts
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "confirm", onConfirm: null });
  const showCustomModal = (title, message, type = "confirm", onConfirm = null) => {
    setModalState({ isOpen: true, title, message, type, onConfirm });
  };
  const closeCustomModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // Role-Based Access Control (Admin vs Viewer)
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('UA Admin');

  // Ranking Filter
  const [rankingFilter, setRankingFilter] = useState("Overall");

  useEffect(() => {
    const token = localStorage.getItem('ua_token');
    const userStr = localStorage.getItem('ua_user');
    
    if (!token || !userStr) {
      window.location.href = '/';
      return;
    }

    try {
      const u = JSON.parse(userStr);
      setUserRole(u.role || 'admin');
      setUserName(u.full_name || 'UA Admin');
    } catch (e) {
      window.location.href = '/';
    }
  }, []);

  // State for the Stall Filter dropdown
  const [dashboardStallFilter, setDashboardStallFilter] = useState("All");
  const [stallsList, setStallsList] = useState([]);
  const [demographics, setDemographics] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Criteria management state
  const [criteria, setCriteria] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [newCriteriaName, setNewCriteriaName] = useState("");
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [passwordConfirm, setPasswordConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    password: "",
    loading: false,
    error: "",
    onConfirm: null
  });

  const loadCriteria = async () => {
    try {
      setLoadingCriteria(true);
      const data = await fetchAllCriteria();
      setCriteria(data);
    } catch (err) {
      console.error("Failed to load criteria:", err);
      if (err.message && (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("login"))) {
        localStorage.removeItem('ua_token');
        localStorage.removeItem('ua_user');
        window.location.href = '/';
      }
    } finally {
      setLoadingCriteria(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'criteria') {
      loadCriteria();
    }
  }, [activeMenu]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setUsersError(null);
      const data = await fetchUsers();
      setUsersList(data);
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsersError(err.message || "Failed to load registered users.");
      if (err.message && (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("login"))) {
        localStorage.removeItem('ua_token');
        localStorage.removeItem('ua_user');
        setTimeout(() => { window.location.href = '/'; }, 2000);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'users') {
      loadUsers();
    }
  }, [activeMenu]);

  const handleDeleteUser = (id, fullName) => {
    showCustomModal(
      "Confirm User Deletion",
      `Are you sure you want to permanently delete user ${fullName} (ID: ${id})? This will delete the user account from the Neon database.`,
      "confirm",
      async () => {
        try {
          await deleteUser(id);
          setUsersList(prev => prev.filter(u => u.id !== id));
          showCustomModal("Success", `User ${fullName} has been successfully deleted.`, "success");
        } catch (err) {
          showCustomModal("Error", err.message || "Failed to delete user.", "error");
        }
      }
    );
  };

  const handleCreateCriteria = async (e) => {
    e.preventDefault();
    if (!newCriteriaName.trim()) return;

    const name = newCriteriaName.trim();
    // eslint-disable-next-line no-useless-escape
    if (/[\[\]:|/]/g.test(name)) {
      showCustomModal("Validation Error", "Criteria name cannot contain invalid characters: [ ] : | /", "error");
      return;
    }

    try {
      const added = await createCriteria(name);
      setCriteria(prev => [...prev, added]);
      setNewCriteriaName("");
      showCustomModal("Success", `Criterion "${name}" has been created successfully.`, "success");
    } catch (err) {
      showCustomModal("Error", err.message || "Failed to create criterion.", "error");
    }
  };

  const handleToggleCriteria = async (id, name, currentActive) => {
    const nextActive = !currentActive;
    try {
      const updated = await updateCriteria(id, nextActive);
      setCriteria(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      showCustomModal("Error", err.message || "Failed to toggle criterion status.", "error");
    }
  };

  const handleDeleteCriteria = (id, name) => {
    showCustomModal(
      "Confirm Deletion",
      `Are you sure you want to permanently delete the criterion "${name}"? This cannot be undone.`,
      "confirm",
      async () => {
        try {
          await deleteCriteria(id);
          setCriteria(prev => prev.filter(c => c.id !== id));
          showCustomModal("Success", `Criterion "${name}" deleted successfully.`, "success");
        } catch (err) {
          showCustomModal("Error", err.message || "Failed to delete criterion.", "error");
        }
      }
    );
  };

  const handleSaveCriteriaName = async () => {
    if (!editingCriteria || !editingCriteria.name.trim()) return;
    const name = editingCriteria.name.trim();
    // eslint-disable-next-line no-useless-escape
    if (/[\[\]:|/]/g.test(name)) {
      showCustomModal("Validation Error", "Criteria name cannot contain invalid characters: [ ] : | /", "error");
      return;
    }
    try {
      await updateCriteria(editingCriteria.id, null, name);
      setCriteria(prev => prev.map(c => c.id === editingCriteria.id ? { ...c, name } : c));
      setEditingCriteria(null);
      showCustomModal("Success", "Criterion updated successfully.", "success");
    } catch (err) {
      showCustomModal("Error", err.message || "Failed to update criterion.", "error");
    }
  };

  const handleConfirmPasswordAction = async () => {
    if (!passwordConfirm.password) {
      setPasswordConfirm(prev => ({ ...prev, error: "Password is required." }));
      return;
    }
    setPasswordConfirm(prev => ({ ...prev, loading: true, error: "" }));
    try {
      // If it succeeded, run onConfirm callback with password
      if (passwordConfirm.onConfirm) {
        await passwordConfirm.onConfirm(passwordConfirm.password);
      }
      setPasswordConfirm(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setPasswordConfirm(prev => ({ ...prev, loading: false, error: err.message || "Invalid credentials." }));
    }
  };

  const isAuditingRef = useRef(isAuditing);
  useEffect(() => { isAuditingRef.current = isAuditing; }, [isAuditing]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeMenu]);

  useEffect(() => {
    const fetchAndAudit = async () => {
      if (isAuditingRef.current) return;
      try {
        const data = await getAdminFeedbacks();
        setFeedbacks(data);

        const results = data.map(f => ({
          id: f.id,
          status: f._is_signature_valid ? "valid" : "invalid"
        }));

        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setVerifyState(prev => {
          const nextState = { ...prev };
          results.forEach(res => {
            const existing = nextState[res.id] || {};
            if (existing.status !== 'checking') {
              nextState[res.id] = {
                status: res.status,
                tamperTime: res.status === 'invalid' ? (existing.tamperTime || now) : null
              };
            }
          });
          return nextState;
        });
      } catch (error) {
        console.error("Live sync error:", error);
      }
    };

    // Fetches the list of stalls for the dropdown filter!
    fetchStalls().then(data => setStallsList(data)).catch(console.error);
    getUserDemographics().then(data => setDemographics(data)).catch(console.error);
    fetchAllCriteria().then(data => setCriteria(data)).catch(console.error);

    fetchAndAudit();
    const intervalId = setInterval(fetchAndAudit, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // --- BRAND COLORS ---
  const colors = {
    navy: '#0C2340',
    gold: '#E5A823',
    bg: '#F8FAFC',
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    success: '#10B981',
    successBg: '#ECFDF5'
  };

  const modernFont = "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const isCompromised = (f) => f.is_quarantined || verifyState[f.id]?.status === 'invalid';

  const safeFeedbacks = feedbacks.filter(f => !isCompromised(f));
  const compromisedFeedbacks = feedbacks.filter(f => isCompromised(f));
  const activeBreachCount = compromisedFeedbacks.length;

  let displayedFeedbacks = [];
  if (activeMenu === 'dashboard' || activeMenu === 'records') displayedFeedbacks = safeFeedbacks;
  else if (activeMenu === 'verify') displayedFeedbacks = feedbacks;
  else if (activeMenu === 'quarantine') displayedFeedbacks = compromisedFeedbacks;

  const searchedFeedbacks = displayedFeedbacks.filter(f =>
    (f.customer_name || 'Anonymous').toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toString().includes(searchTerm)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = searchedFeedbacks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchedFeedbacks.length / itemsPerPage);

  // Filter dashboard math based on the selected stall!
  const dashboardFeedbacks = dashboardStallFilter === "All"
    ? safeFeedbacks
    : safeFeedbacks.filter(f => {
      const stallMatch = f.comment?.match(/\[Stall: (.*?)\]/);
      const stallName = stallMatch ? stallMatch[1] : 'General Feedback';
      return stallName === dashboardStallFilter;
    });

  const total = dashboardFeedbacks.length;
  const avgValue = total > 0 ? Number((dashboardFeedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2)) : 0;
  const avgPercent = Math.round((avgValue / 5) * 100);
  const avgLabel = avgValue >= 4.5 ? "Excellent" : avgValue >= 3.5 ? "Good" : avgValue >= 2.5 ? "Fair" : "Needs Improvement";

  const CHART_COLORS = [colors.navy, '#3B82F6', colors.gold, '#FBBF24', colors.danger];

  const pieData = [5, 4, 3, 2, 1].map(star => ({
    star, name: `${star} Stars`,
    value: dashboardFeedbacks.filter(f => f.rating === star).length,
    percentage: total > 0 ? Number(((dashboardFeedbacks.filter(f => f.rating === star).length / total) * 100).toFixed(1)) : 0
  })).filter(d => d.value > 0);

  const dominantRating = pieData.length > 0 ? pieData.reduce((best, current) => current.value > best.value ? current : best, pieData[0]) : { star: 'N/A' };

  const categoryTotals = {};
  const categoryCounts = {};
  let count = 0;

  // Align with active database criteria
  const activeCriteriaNames = criteria.filter(c => c.is_active).map(c => c.name);
  activeCriteriaNames.forEach(name => {
    categoryTotals[name] = 0;
    categoryCounts[name] = 0;
  });

  dashboardFeedbacks.forEach(f => {
    const scoresMatch = f?.comment?.match(/\[Scores -> (.*?)\]/);
    if (scoresMatch) {
      count++;
      const scoresStr = scoresMatch[1];
      const parts = scoresStr.split('|');
      parts.forEach(part => {
        const subMatch = part.trim().match(/^(.*?):\s*(\d)\/5$/);
        if (subMatch) {
          const rawName = subMatch[1].trim();
          const name = rawName === 'Clean' ? 'Cleanliness' : rawName;
          const val = parseInt(subMatch[2]);
          if (activeCriteriaNames.includes(name)) {
            categoryTotals[name] = (categoryTotals[name] || 0) + val;
            categoryCounts[name] = (categoryCounts[name] || 0) + 1;
          }
        }
      });
    }
  });

  const barData = activeCriteriaNames.map(name => ({
    name,
    score: categoryCounts[name] ? Number((categoryTotals[name] / categoryCounts[name]).toFixed(1)) : 0
  })).sort((a, b) => b.score - a.score);

  const topCategory = barData.length > 0 && barData[0].score > 0 ? barData[0] : { name: "N/A", score: 0 };

  // Calculate Stall Comparison Chart Data
  const stallScores = {};
  safeFeedbacks.forEach(f => {
    const stallMatch = f.comment?.match(/\[Stall: (.*?)\]/);
    const name = stallMatch ? stallMatch[1] : 'General';
    if (!stallScores[name]) {
      stallScores[name] = { totalRating: 0, count: 0 };
    }
    stallScores[name].totalRating += f.rating;
    stallScores[name].count += 1;
  });

  const stallComparisonData = Object.keys(stallScores).map(name => ({
    name,
    rating: Number((stallScores[name].totalRating / stallScores[name].count).toFixed(2))
  })).sort((a, b) => b.rating - a.rating);

  // Calculate Review Volume Trends over time
  const timelineCounts = {};
  feedbacks.forEach(f => {
    if (!f.created_at) return;
    const d = new Date(f.created_at);
    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timelineCounts[dateKey] = (timelineCounts[dateKey] || 0) + 1;
  });

  const timelineData = Object.keys(timelineCounts).map(date => ({
    date,
    count: timelineCounts[date],
    timestamp: new Date(`${date}, ${new Date().getFullYear()}`).getTime()
  })).sort((a, b) => a.timestamp - b.timestamp);

  const openModal = async (f) => {
    setSelectedFeedback(f);
    if (f.has_attachment && !f.attachment) {
      try {
        const photoData = await getFeedbackPhoto(f.id);
        if (photoData && photoData.attachment) {
          setSelectedFeedback(prev => (prev && prev.id === f.id ? { ...prev, attachment: photoData.attachment } : prev));
        }
      } catch (err) {
        console.error("Failed to load photo", err);
      }
    }
  };

  const handleVerify = async (feedback) => {
    setVerifyState(prev => ({ ...prev, [feedback.id]: { status: "checking" } }));
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      const { valid } = await verifyFeedback(feedback);
      setVerifyState(prev => ({ ...prev, [feedback.id]: { status: valid ? "valid" : "invalid", tamperTime: valid ? null : now } }));
    } catch (e) {
      setVerifyState(prev => ({ ...prev, [feedback.id]: { status: "invalid", tamperTime: now } }));
    }
  };

  const runSystemAudit = async () => {
    setIsAuditing(true);
    for (let f of feedbacks) {
      await handleVerify(f);
      await new Promise(res => setTimeout(res, 150));
    }
    setIsAuditing(false);
  };

  const runDetailedTrace = async (f) => {
    setTraceModal(f);
    setTraceStatus('loading');
    setVerifyState(prev => ({ ...prev, [f.id]: { status: "checking" } }));

    setTimeout(async () => {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      try {
        const { valid } = await verifyFeedback(f);
        setVerifyState(prev => ({ ...prev, [f.id]: { status: valid ? "valid" : "invalid", tamperTime: valid ? null : now } }));
        setTraceStatus(valid ? 'pass' : 'fail');
      } catch (e) {
        setVerifyState(prev => ({ ...prev, [f.id]: { status: "invalid", tamperTime: now } }));
        setTraceStatus('fail');
      }
    }, 1500);
  };

  const handleQuarantineRecord = (id) => {
    showCustomModal(
      "Confirm Quarantine",
      `SECURITY ALERT: Are you sure you want to move Record #${id} to the Quarantine Zone? This will hide it from students and report averages.`,
      "confirm",
      async () => {
        try {
          await quarantineFeedback(id);
          setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_quarantined: true } : f));
          showCustomModal("Success", `Record #${id} has been quarantined successfully.`, "success");
        } catch (err) {
          showCustomModal("Error", "Failed to quarantine record. Check backend server.", "error");
        }
      }
    );
  };

  const handlePurgeRecord = (id) => {
    showCustomModal(
      "FINAL WARNING",
      `Are you sure you want to permanently delete Record #${id}? This action cannot be undone and will delete it from Neon.`,
      "confirm",
      async () => {
        try {
          await deleteFeedback(id);
          setFeedbacks(prev => prev.filter(f => f.id !== id));
          showCustomModal("Success", `Record #${id} has been permanently deleted.`, "success");
        } catch (err) {
          showCustomModal("Error", "Failed to permanently delete record.", "error");
        }
      }
    );
  };

  const exportToCSV = () => {
    const headers = ["ID,Date,Time,Customer Name,Stall,Rating,Ed25519 Signature,Public Key,Integrity Check,Tamper Detected At"];
    const rows = feedbacks.map(f => {
      const state = verifyState[f.id] || {};
      const status = state.status === 'valid' ? 'Authentic' : (state.status === 'invalid' ? 'TAMPERED' : 'Pending');
      const tamperTime = state.tamperTime || 'N/A';
      const dateStr = f.created_at ? new Date(f.created_at).toLocaleString() : 'N/A';

      const stallMatch = f.comment?.match(/\[Stall: (.*?)\]/);
      const stallName = stallMatch ? stallMatch[1] : 'General';

      return `${f.id},${dateStr},"${f.customer_name || 'Anonymous'}","${stallName}",${f.rating},${f.signature},${f.public_key},${status},${tamperTime}`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ua_crypto_audit_log.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const parseFeedbackData = (text) => {
    if (!text) return { stall: null, metrics: null, text: "No comment provided." };

    let stallName = "General Feedback";
    const stallMatch = text.match(/\[Stall: (.*?)\]/);
    if (stallMatch) {
      stallName = stallMatch[1];
    }

    const match = text.match(/\[Scores -> Food: (\d)\/5 \| Service: (\d)\/5 \| Staff: (\d)\/5 \| Clean: (\d)\/5 \| Value: (\d)\/5\]/);
    if (match) {
      const parts = text.split('\n\n');
      return {
        stall: stallName,
        metrics: { Food: match[1], Service: match[2], Staff: match[3], Cleanliness: match[4], Value: match[5] },
        text: parts.slice(1).join('\n\n').trim() || "No written comment provided."
      };
    }
    return { stall: stallName, metrics: null, text: text };
  };

  const formatPrecisionDate = (dateString) => {
    if (!dateString) return { date: 'N/A', time: '' };
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const handleDownloadReport = () => {
    let url = `${API_URL}/reports/overall`;
    if (dashboardStallFilter !== "All" && dashboardStallFilter !== "General Feedback") {
      const stallObj = stallsList.find(s => s.name === dashboardStallFilter);
      if (stallObj) url = `${API_URL}/reports/stall/${stallObj.id}`;
    }
    window.open(url, '_blank');
  };

  const MenuItem = ({ id, icon: Icon, label, badge }) => {
    const isActive = activeMenu === id;
    return (
      <div
        onClick={() => { setActiveMenu(id); setIsSidebarOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
          background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '8px',
          cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px', color: isActive ? colors.gold : colors.white,
          border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Icon size={20} /> <span style={{ fontWeight: isActive ? 600 : 400, fontSize: '15px' }}>{label}</span>
        </div>
        {badge > 0 && (
          <span style={{ backgroundColor: colors.danger, color: colors.white, fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>{badge}</span>
        )}
      </div>
    );
  };

  const PaginationControls = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '16px 0', borderTop: `1px solid ${colors.border}` }}>
      <span style={{ fontSize: '14px', color: colors.textMuted }}>
        Showing <strong>{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</strong> to <strong>{Math.min(indexOfLastItem, searchedFeedbacks.length)}</strong> of <strong>{searchedFeedbacks.length}</strong> entries
      </span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 500, backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.navy, padding: '0 12px' }}>
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 500, backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-layout">

      {/* ─── RESPONSIVE LAYOUT STYLES ─── */}
      <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }

        /* Desktop Layout */
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background-color: ${colors.bg};
          font-family: ${modernFont};
          position: relative;
        }
        .admin-sidebar {
          width: 280px;
          background-color: ${colors.navy};
          color: ${colors.white};
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          border-right: 4px solid ${colors.gold};
          flex-shrink: 0;
          box-sizing: border-box;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
        }
        .admin-main {
          flex: 1;
          padding: 48px 60px;
          overflow-y: auto;
          box-sizing: border-box;
          min-width: 0;
        }
        .mobile-header {
          display: none;
        }
        .sidebar-toggle-btn {
          display: none;
        }

        /* Chart/Dashboard Grids default */
        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 24px;
          margin-bottom: 40px;
        }
        .dashboard-analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 40px;
        }
        .pie-chart-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 16px;
        }
        .ranking-row {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          background-color: ${colors.white};
          border-radius: 16px;
          border: 1px solid ${colors.border};
          box-shadow: 0 8px 20px rgba(0,0,0,0.03);
          gap: 24px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
          cursor: default;
        }
        .ranking-row-actions {
          margin-right: 16px;
        }

        /* Mobile & Tablet Responsiveness */
        @media (max-width: 992px) {
          .admin-layout {
            flex-direction: column;
          }
          .admin-sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            bottom: 0;
            width: 280px;
            transform: translateX(-100%);
            box-shadow: 8px 0 30px rgba(0,0,0,0.15);
            padding: 32px 24px;
            border-right: 4px solid ${colors.gold};
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .admin-main {
            padding: 32px 20px !important;
          }
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: ${colors.navy};
            color: ${colors.white};
            padding: 0 20px;
            border-bottom: 3px solid ${colors.gold};
            position: sticky;
            top: 0;
            z-index: 200;
            box-sizing: border-box;
            height: 60px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .sidebar-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.2);
            color: ${colors.white};
            width: 38px;
            height: 38px;
            border-radius: 8px;
            cursor: pointer;
            outline: none;
            transition: all 0.2s;
          }
          .sidebar-toggle-btn:active {
            background: rgba(255,255,255,0.15);
          }
          .dashboard-charts-grid,
          .dashboard-analytics-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .ranking-row {
            flex-direction: column !important;
            align-items: center !important;
            padding: 24px 16px !important;
            text-align: center !important;
            gap: 16px !important;
          }
          .ranking-row-details {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .ranking-row-actions {
            margin-right: 0 !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .ranking-row-score {
            width: 100% !important;
            align-items: center !important;
          }
        }

        @media (max-width: 576px) {
          .pie-chart-grid {
            grid-template-columns: 1fr !important;
            justify-items: center;
            gap: 24px !important;
          }
        }
      `}</style>

      {/* ─── MOBILE STICKY HEADER ─── */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/ua-logo.png" alt="UA Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: colors.white }}>UA <span style={{ color: colors.gold }}>Canteen</span></h2>
          </div>
        </div>
        <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <svg style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
            {isSidebarOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* ─── SIDEBAR ─── */}
      <div className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <img src="/ua-logo.png" alt="UA Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: colors.white }}>UA <span style={{ color: colors.gold }}>Canteen</span></h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0', fontWeight: 500, letterSpacing: '0.05em' }}>ADMIN PORTAL</p>
          </div>
        </div>



        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <MenuItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <MenuItem id="ranking" icon={Star} label="Rankings" />
          <MenuItem id="records" icon={FileText} label="Safe Records" />

          {userRole !== 'viewer' && (
            <>
              <MenuItem id="stalls" icon={Store} label="Manage Stalls" />
              <MenuItem id="users" icon={Users} label="User Management" />
              <MenuItem id="criteria" icon={Star} label="Manage Criteria" />
            </>
          )}

          <MenuItem id="verify" icon={ShieldCheck} label="Crypto Logs" />

          {userRole !== 'viewer' && (
            <>
              <div style={{ margin: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
              <MenuItem id="quarantine" icon={ShieldAlert} label="Quarantine" badge={activeBreachCount} />
            </>
          )}
        </div>

        <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: colors.navy }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.white, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{userRole === 'viewer' ? 'Read-Only Viewer' : 'System Admin'}</div>
          </div>
          <LogOut size={18} color="#94A3B8" style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = colors.white} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'} onClick={() => { localStorage.removeItem('ua_token'); localStorage.removeItem('ua_user'); window.location.href = '/'; }} />
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="admin-main">

        {/* ---------------- VIEW 0: RANKINGS ---------------- */}
        {activeMenu === "ranking" && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                  Canteen <span style={{ color: colors.gold }}>Rankings</span>
                </h1>
                <p style={{ color: colors.textMuted, margin: 0, fontSize: '16px' }}>Live leaderboard based on cryptographically verified student evaluations.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Filter By Criteria</label>
                <select
                  value={rankingFilter}
                  onChange={(e) => setRankingFilter(e.target.value)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', fontWeight: 600, color: colors.navy, outline: 'none', cursor: 'pointer', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                >
                  <option value="Overall">Overall Rating</option>
                  <option value="Food">Food Quality</option>
                  <option value="Service">Customer Service</option>
                  <option value="Staff">Staff Politeness</option>
                  <option value="Clean">Cleanliness</option>
                  <option value="Value">Value for Money</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {stallsList.map(stall => {
                const stallFeedbacks = safeFeedbacks.filter(f => {
                  const match = f.comment?.match(/\[Stall: (.*?)\]/);
                  return match ? match[1] === stall.name : false;
                });

                let totalScore = 0;
                let validCount = 0;

                stallFeedbacks.forEach(f => {
                  if (rankingFilter === "Overall") {
                    totalScore += f.rating;
                    validCount++;
                  } else {
                    const criteriaMatch = f.comment?.match(new RegExp(`${rankingFilter}: (\\d+)/5`));
                    if (criteriaMatch) {
                      totalScore += parseInt(criteriaMatch[1], 10);
                      validCount++;
                    }
                  }
                });

                const avg = validCount > 0 ? totalScore / validCount : 0;

                return {
                  id: stall.id,
                  name: stall.name,
                  image: stall.image,
                  avg: Number(avg.toFixed(2)),
                  total: stallFeedbacks.length,
                  validScoreCount: validCount
                };
              }).filter(s => s.total > 0).sort((a, b) => b.avg - a.avg).map((stall, idx) => (
                <div key={stall.id} className="ranking-row" onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

                  {/* Rank Indicator */}
                  <div style={{ width: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {idx === 0 && <Trophy size={32} color={colors.gold} style={{ filter: 'drop-shadow(0 2px 4px rgba(229,168,35,0.4))' }} />}
                    {idx === 1 && <Medal size={28} color="#94A3B8" />}
                    {idx === 2 && <Award size={28} color="#B45309" />}
                    {idx > 2 && <div style={{ fontSize: '24px', fontWeight: 800, color: '#CBD5E1' }}>#{idx + 1}</div>}
                  </div>

                  {/* Stall Image Avatar */}
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: colors.bg, overflow: 'hidden', border: `2px solid ${idx === 0 ? colors.gold : colors.border}`, flexShrink: 0 }}>
                    {stall.image ? (
                      <img src={stall.image} alt={stall.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={24} color="#94A3B8" />
                      </div>
                    )}
                  </div>

                  {/* Stall Details */}
                  <div className="ranking-row-details" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', color: colors.navy, fontWeight: 700 }}>{stall.name}</h3>
                      {idx === 0 && rankingFilter === "Overall" && <span style={{ backgroundColor: 'rgba(229,168,35,0.1)', color: colors.gold, fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px', letterSpacing: '0.05em' }}>OVERALL BEST</span>}
                      {idx === 0 && rankingFilter !== "Overall" && <span style={{ backgroundColor: 'rgba(56,142,60,0.1)', color: colors.success, fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px', letterSpacing: '0.05em' }}>#1 IN {rankingFilter.toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} /> Based on {stall.total} verified student review{stall.total !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => window.open(`${API_URL}/reports/stall/${stall.id}`, '_blank')}
                    className="ranking-row-actions"
                    style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.navy, padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.color = colors.white; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.navy; }}
                  >
                    <Download size={14} /> Full Report
                  </button>

                  {/* Score & Visual Bar */}
                  <div className="ranking-row-score" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '140px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: colors.navy, display: 'flex', alignItems: 'baseline', gap: '4px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {stall.avg.toFixed(1)} <span style={{ fontSize: '16px', color: colors.textMuted, fontWeight: 600 }}>/ 5</span>
                    </div>

                    <div style={{ width: '100%', height: '6px', backgroundColor: colors.bg, borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${(stall.avg / 5) * 100}%`, height: '100%', backgroundColor: colors.gold, borderRadius: '4px', transition: 'width 1s ease' }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {(stallsList.length === 0 || safeFeedbacks.length === 0) && (
                <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>No evaluations have been recorded yet to formulate a ranking.</div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- VIEW: USER MANAGEMENT ---------------- */}
        {activeMenu === "users" && userRole !== 'viewer' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                User <span style={{ color: colors.gold }}>Management</span>
              </h1>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: '16px' }}>
                View, search, and delete registered student and coordinator accounts.
              </p>
            </div>

            {usersError && (
              <div style={{ backgroundColor: '#FEE2E2', border: `1px solid ${colors.danger}`, color: colors.danger, padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
                ⚠️ {usersError}
              </div>
            )}

            {/* Search Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Search users by name, email, or Student ID..." 
                  value={userSearchTerm} 
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px',
                    border: `1px solid ${colors.border}`, backgroundColor: '#FFFFFF',
                    fontSize: '15px', outline: 'none', transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = colors.navy}
                  onBlur={(e) => e.target.style.borderColor = colors.border}
                />
              </div>
            </div>

            {/* Users Table */}
            <div style={{ backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
              {loadingUsers ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px 0', color: colors.textMuted }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Fetching users from Neon database...</span>
                </div>
              ) : (
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>UA ID / STUDENT ID</th>
                      <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>FULL NAME</th>
                      <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>EMAIL ADDRESS</th>
                      <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>ROLE</th>
                      <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>ACADEMIC LEVEL</th>
                      <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>EMAIL STATUS</th>
                      <th style={{ padding: '18px 24px', textAlign: 'right', fontWeight: 600, color: colors.navy, fontSize: '13px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.filter(u => 
                      (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.ua_id || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '40px 24px', textAlign: 'center', color: colors.textMuted }}>
                          <Users size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
                          No registered users found matching the search.
                        </td>
                      </tr>
                    ) : (
                      usersList.filter(u => 
                        (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (u.ua_id || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                      ).map(user => (
                        <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: 600 }}>{user.ua_id}</td>
                          <td style={{ padding: '18px 24px', fontSize: '14px' }}>{user.full_name}</td>
                          <td style={{ padding: '18px 24px', fontSize: '14px' }}>{user.email || 'N/A'}</td>
                          <td style={{ padding: '18px 24px', fontSize: '14px', textTransform: 'capitalize' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                              backgroundColor: user.role === 'admin' ? 'rgba(229, 168, 35, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                              color: user.role === 'admin' ? '#B88114' : '#2563EB'
                            }}>
                              {user.role}
                            </span>
                          </td>
                          <td style={{ padding: '18px 24px', fontSize: '14px' }}>{user.academic_level || 'N/A'}</td>
                          <td style={{ padding: '18px 24px', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              backgroundColor: user.is_email_verified ? colors.successBg : colors.dangerBg,
                              color: user.is_email_verified ? colors.success : colors.danger,
                              border: `1px solid ${user.is_email_verified ? '#A7F3D0' : '#FECACA'}`
                            }}>
                              {user.is_email_verified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.full_name)}
                              style={{
                                background: colors.dangerBg, border: `1px solid #FECACA`, color: colors.danger,
                                cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s', fontFamily: 'inherit'
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ---------------- VIEW 1: MANAGE STALLS ---------------- */}
        {activeMenu === "stalls" && userRole !== 'viewer' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Manage <span style={{ color: colors.gold }}>Stalls</span>
              </h1>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: '16px' }}>
                Add or remove food stalls for the student feedback form.
              </p>
            </div>

            <StallManager />
          </div>
        )}

        {/* ---------------- VIEW: MANAGE CRITERIA ---------------- */}
        {activeMenu === "criteria" && userRole !== 'viewer' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Evaluation <span style={{ color: colors.gold }}>Criteria</span>
              </h1>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: '16px' }}>
                Create, enable, or disable evaluation categories displayed on student feedback forms.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'flex-start' }}>
              
              {/* Form Card */}
              <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.navy, margin: '0 0 20px 0' }}>Add New Criterion</h3>
                <form onSubmit={handleCreateCriteria} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '8px', letterSpacing: '0.05em' }}>CRITERION NAME</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Ambiance, Cleanliness" 
                      value={newCriteriaName} 
                      onChange={(e) => setNewCriteriaName(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px', color: colors.text, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} 
                    />
                  </div>
                  <button 
                    type="submit" 
                    style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}
                  >
                    Create Criterion
                  </button>
                </form>
              </div>

              {/* List Card */}
              <div style={{ backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '24px 32px', borderBottom: `1px solid ${colors.border}` }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.navy, margin: 0 }}>Registered Criteria</h3>
                </div>

                {loadingCriteria ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: colors.textMuted }}>
                    <Loader2 className="animate-spin" size={24} style={{ marginRight: '10px' }} />
                    Loading criteria list...
                  </div>
                ) : criteria.length === 0 ? (
                  <div style={{ padding: '80px', textAlign: 'center', color: colors.textMuted }}>No evaluation criteria configured.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${colors.border}` }}>
                          <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 700, color: colors.textMuted, letterSpacing: '0.05em' }}>CRITERION NAME</th>
                          <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 700, color: colors.textMuted, letterSpacing: '0.05em', textAlign: 'center' }}>STATUS</th>
                          <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 700, color: colors.textMuted, letterSpacing: '0.05em', textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criteria.map((item) => (
                          <tr key={item.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={{ padding: '20px 32px', fontWeight: 600, color: colors.navy, fontSize: '15px' }}>{item.name}</td>
                            <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleToggleCriteria(item.id, item.name, item.is_active)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: 'none',
                                  transition: 'all 0.2s',
                                  backgroundColor: item.is_active ? '#ECFDF5' : '#F3F4F6',
                                  color: item.is_active ? '#059669' : '#6B7280'
                                }}
                              >
                                {item.is_active ? "Active" : "Disabled"}
                              </button>
                            </td>
                            <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                              <button 
                                onClick={() => handleDeleteCriteria(item.id, item.name)}
                                style={{ backgroundColor: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background-color 0.15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ---------------- VIEW 1: DASHBOARD ---------------- */}
        {activeMenu === "dashboard" && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            {activeBreachCount > 0 && (
              <div style={{ backgroundColor: colors.dangerBg, border: `1px solid ${colors.danger}`, color: colors.danger, padding: '20px 24px', borderRadius: '12px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.1)' }}>
                <AlertTriangle size={32} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>SECURITY COMPROMISED</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#991B1B' }}>{activeBreachCount} record(s) have failed cryptographic integrity checks. They have been isolated from your metrics.</p>
                </div>
                <button onClick={() => setActiveMenu('quarantine')} style={{ backgroundColor: colors.danger, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B91C1C'} onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.danger}>
                  View Logs
                </button>
              </div>
            )}

            {/* Dashboard Header with Filter Dropdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Dashboard <span style={{ color: colors.gold }}>Overview</span></h1>
                <p style={{ color: colors.textMuted, margin: 0, fontSize: '16px' }}>Real-time verified insights from the secure database.</p>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em' }}>FILTER BY STALL</label>
                  <select
                    value={dashboardStallFilter}
                    onChange={(e) => setDashboardStallFilter(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.white, fontSize: '15px', fontWeight: 600, color: colors.navy, outline: 'none', cursor: 'pointer', minWidth: '220px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                  >
                    <option value="All">All Stalls (Overall Metrics)</option>
                    {stallsList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="General Feedback">General Feedback</option>
                  </select>
                </div>

                <button
                  onClick={handleDownloadReport}
                  style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}
                >
                  <Download size={18} />
                  Export PDF Report
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>

              <div className="card-hover" style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.3s' }}>
                <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>VERIFIED RECORDS</div>
                <div style={{ fontSize: '36px', fontWeight: 700, color: colors.navy, lineHeight: 1 }}>{total}</div>
                <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '8px' }}>Safe cryptographic submissions</div>
              </div>

              <div className="card-hover" style={{ backgroundColor: activeBreachCount > 0 ? colors.dangerBg : colors.white, borderRadius: '12px', padding: '24px', border: `1px solid ${activeBreachCount > 0 ? colors.danger : colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.3s' }}>
                <div style={{ fontSize: '13px', color: activeBreachCount > 0 ? colors.danger : colors.textMuted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>SYSTEM INTEGRITY</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: activeBreachCount > 0 ? colors.danger : colors.success, display: 'flex', alignItems: 'center', gap: '12px', lineHeight: 1 }}>
                  {activeBreachCount > 0 ? <><ShieldAlert size={28} /> ISOLATED</> : <><ShieldCheck size={28} /> SECURE</>}
                </div>
                <div style={{ fontSize: '13px', color: activeBreachCount > 0 ? '#991B1B' : colors.textMuted, marginTop: '12px', fontWeight: activeBreachCount > 0 ? 600 : 400 }}>
                  {activeBreachCount > 0 ? `${activeBreachCount} tampered records hidden` : "Ed25519 protection active"}
                </div>
              </div>

              <div className="card-hover" style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.3s' }}>
                <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>AVERAGE RATING</div>
                <div style={{ fontSize: '36px', fontWeight: 700, color: colors.navy, display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1 }}>
                  {avgValue.toFixed(2)} <span style={{ fontSize: '16px', color: colors.textMuted, fontWeight: 500 }}>/ 5</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '12px 0 8px 0', color: colors.text, fontSize: '14px', fontWeight: 500 }}>
                  <Star size={16} color={colors.gold} fill={colors.gold} /> {avgLabel}
                </div>
                <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${avgPercent}%`, height: '100%', backgroundColor: colors.gold }} />
                </div>
              </div>

              <div className="card-hover" style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.3s' }}>
                <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>TOP CATEGORY</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: colors.navy, marginTop: '8px', lineHeight: 1 }}>{topCategory.name}</div>
                <div style={{ fontSize: '14px', color: colors.textMuted, marginTop: '12px' }}>Highest rated at <strong>{topCategory.score}/5</strong></div>
              </div>

            </div>

            <div className="dashboard-charts-grid">

              <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', marginBottom: '32px' }}>CATEGORY AVERAGES</h3>
                {count === 0 ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '15px' }}>No safe records available.</div>
                ) : (
                  <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 13, fontWeight: 500 }} dy={10} />
                        <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 13 }} />
                        <BarTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '14px', fontWeight: 500 }} />
                        <Bar dataKey="score" fill={colors.navy} radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', marginBottom: '32px' }}>SCORE DISTRIBUTION</h3>
                {total === 0 ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '15px' }}>No safe records available.</div>
                ) : (
                  <div className="pie-chart-grid">
                    <div style={{ height: '260px', width: '100%', position: 'relative', minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie data={pieData} innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                          </Pie>
                          <PieTooltip
                            contentStyle={{ borderRadius: '8px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '13px', fontWeight: 500 }}
                            formatter={(value, name, payload) => [`${value} (${payload.payload.percentage}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL</div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: colors.navy, lineHeight: 1 }}>{total}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pieData.map((entry, index) => (
                          <div key={`legend-${index}-${entry.star}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: colors.text }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                              <span style={{ fontWeight: 500 }}>{entry.star} Star</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ fontWeight: 700 }}>{entry.value}</span>
                              <span style={{ color: colors.textMuted, width: '35px', textAlign: 'right' }}>{entry.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '24px', padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: `1px solid ${colors.border}`, fontSize: '13px', color: colors.text, display: 'flex', justifyContent: 'space-between' }}>
                        Most common: <strong style={{ color: colors.navy }}>{dominantRating.star} Star</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="dashboard-analytics-grid">

              {/* Stall Comparison Bar Chart */}
              <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', marginBottom: '32px' }}>STALL RATINGS COMPARISON</h3>
                {stallComparisonData.length === 0 ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '15px' }}>No stall ratings available.</div>
                ) : (
                  <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={stallComparisonData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} dy={10} />
                        <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 13 }} />
                        <BarTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '14px', fontWeight: 500 }} />
                        <Bar dataKey="rating" fill={colors.gold} radius={[4, 4, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Review Volume Timeline Line Chart */}
              <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', marginBottom: '32px' }}>FEEDBACK VOLUME TRENDS</h3>
                {timelineData.length === 0 ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '15px' }}>No volume history available.</div>
                ) : (
                  <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={timelineData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 13 }} />
                        <BarTooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '14px', fontWeight: 500 }} />
                        <Line type="monotone" dataKey="count" stroke={colors.navy} strokeWidth={3} activeDot={{ r: 8 }} dot={{ strokeWidth: 2, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>

            {/* User Registration Demographics Grid */}
            <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', marginBottom: '24px' }}>REGISTERED STUDENT DEMOGRAPHICS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                {['JHS', 'SHS', 'College'].map(level => {
                  const dataObj = demographics.find(d => (d.level || '').toUpperCase() === level.toUpperCase()) || { count: 0 };
                  const countVal = parseInt(dataObj.count) || 0;
                  
                  // Calculate total registered
                  const totalRegistered = demographics.reduce((sum, item) => sum + (parseInt(item.count) || 0), 0);
                  const percentage = totalRegistered > 0 ? ((countVal / totalRegistered) * 100).toFixed(1) : "0.0";
                  
                  // Color codes for each level
                  const levelColors = {
                    JHS: { bg: '#EFF6FF', text: '#1E40AF', label: 'Junior High School' },
                    SHS: { bg: '#FDF2F8', text: '#9D174D', label: 'Senior High School' },
                    College: { bg: '#ECFDF5', text: '#065F46', label: 'College Level' }
                  };
                  
                  const styleMeta = levelColors[level] || { bg: '#F1F5F9', text: '#334155', label: level };

                  return (
                    <div key={level} style={{ backgroundColor: styleMeta.bg, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: styleMeta.text, letterSpacing: '0.05em' }}>{styleMeta.label}</div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: colors.navy }}>{countVal} <span style={{ fontSize: '14px', fontWeight: 500, color: colors.textMuted }}>Registered</span></div>
                      <div style={{ fontSize: '13px', color: colors.textMuted }}>Makes up <strong>{percentage}%</strong> of student signups</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ---------------- VIEW 2: SAFE RECORDS ---------------- */}
        {activeMenu === "records" && (
          <div style={{ animation: 'fadeUp 0.4s ease', backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '32px 40px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Safe Customer Feedback</h1>
                <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Only cryptographically verified authentic records are shown here.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0 16px', height: '42px', width: '320px', border: `1px solid ${colors.border}` }}>
                <Search size={18} color={colors.textMuted} style={{ marginRight: '12px', flexShrink: 0 }} />
                <input type="text" placeholder="Search verified records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: colors.text }} />
              </div>
            </div>

            <div style={{ flex: 1, padding: '0 40px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '8%' }}>ID</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '18%' }}><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> TIMESTAMP</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '18%' }}>CUSTOMER</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '34%' }}>FEEDBACK SUMMARY</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '10%' }}>RATING</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '12%', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: colors.textMuted }}>No safe records found.</td></tr>
                  ) : currentItems.map((f, index) => {
                    const parsed = parseFeedbackData(f.comment);
                    const precisionDate = formatPrecisionDate(f.created_at);
                    return (
                      <tr key={f.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '20px 12px', color: colors.textMuted, fontSize: '14px', fontWeight: 500 }}>#{f.id}</td>
                        <td style={{ padding: '20px 12px' }}>
                          <div style={{ color: colors.text, fontSize: '14px', fontWeight: 500 }}>{precisionDate.date}</div>
                          <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '2px' }}>{precisionDate.time}</div>
                        </td>
                        <td style={{ padding: '20px 12px', color: colors.text, fontSize: '15px', fontWeight: 600 }}>{f.customer_name || 'Anonymous'}</td>

                        <td style={{ padding: '20px 12px', fontSize: '14px', color: colors.textMuted, lineHeight: 1.5 }}>
                          {parsed.stall && <span style={{ color: colors.navy, fontWeight: 600, backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', marginRight: '8px' }}>{parsed.stall}</span>}
                          {parsed.metrics && <span style={{ fontSize: '12px', color: colors.textMuted }}>Metrics</span>}
                          {f.has_attachment && <span style={{ fontSize: '11px', color: colors.success, fontWeight: 700, marginLeft: '8px', border: `1px solid ${colors.success}`, padding: '2px 6px', borderRadius: '4px' }}>[PHOTO]</span>}
                        </td>

                        <td style={{ padding: '20px 12px', fontWeight: 700, color: colors.navy, fontSize: '15px' }}>{f.rating} <span style={{ color: colors.textMuted, fontWeight: 500 }}>/ 5</span></td>
                        <td style={{ padding: '20px 12px', textAlign: 'right' }}>
                          <button onClick={() => openModal(f)} style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, color: colors.navy, fontSize: '13px', fontWeight: 600, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.color = colors.white; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = colors.white; e.currentTarget.style.color = colors.navy; }}>
                            View Full
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 40px 24px' }}>
              <PaginationControls />
            </div>
          </div>
        )}

        {/* ---------------- VIEW 3: SECURITY AUDITOR LOGS ---------------- */}
        {activeMenu === "verify" && (
          <div style={{ animation: 'fadeUp 0.4s ease', backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '32px 40px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={28} color={colors.gold} /> Cryptographic Audit Logs
                </h1>
                <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Raw Ed25519 signatures and payloads for database integrity verification.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={exportToCSV} style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.white}>
                    <Download size={18} /> Export CSV
                  </button>
                  <button onClick={runSystemAudit} disabled={isAuditing} style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: isAuditing ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s', opacity: isAuditing ? 0.8 : 1 }} onMouseEnter={e => { if (!isAuditing) e.currentTarget.style.backgroundColor = '#17365C' }} onMouseLeave={e => { if (!isAuditing) e.currentTarget.style.backgroundColor = colors.navy }}>
                    {isAuditing ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                    {isAuditing ? "Auditing System..." : "Run Global Audit"}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '0 16px', height: '42px', width: '320px', border: `1px solid ${colors.border}` }}>
                  <Search size={18} color={colors.textMuted} style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input type="text" placeholder="Search all logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: colors.text }} />
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '24px 40px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', minWidth: '950px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '6%' }}>ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '14%' }}><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> TIMESTAMP</th>
                    <th style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '20%' }}><Key size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Ed25519 SIGNATURE</th>
                    <th style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '16%' }}><Hash size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> PUBLIC KEY</th>
                    <th style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '16%', textAlign: 'center' }}>INTEGRITY CHECK</th>
                    <th style={{ padding: '16px 12px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, letterSpacing: '0.05em', borderBottom: `2px solid ${colors.border}`, width: '28%', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: colors.textMuted }}>No logs found.</td></tr>
                  ) : currentItems.map((f, index) => {
                    const precisionDate = formatPrecisionDate(f.created_at);
                    const isInvalid = verifyState[f.id]?.status === 'invalid';
                    return (
                      <tr key={f.id} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: isInvalid ? colors.dangerBg : 'transparent', transition: 'background-color 0.2s' }} onMouseEnter={e => { if (!isInvalid) e.currentTarget.style.backgroundColor = '#F8FAFC' }} onMouseLeave={e => { if (!isInvalid) e.currentTarget.style.backgroundColor = 'transparent' }}>
                        <td style={{ padding: '20px 12px', color: isInvalid ? colors.danger : colors.textMuted, fontSize: '14px', fontWeight: 500 }}>#{f.id}</td>
                        <td style={{ padding: '20px 12px' }}>
                          <div style={{ color: colors.text, fontSize: '13px', fontWeight: 500 }}>{precisionDate.date}</div>
                          <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '2px' }}>{precisionDate.time}</div>
                        </td>
                        <td style={{ padding: '20px 12px', fontFamily: 'monospace', fontSize: '13px', color: colors.textMuted }} title={f.signature}>
                          {f.signature ? `${f.signature.substring(0, 20)}...` : 'N/A'}
                        </td>
                        <td style={{ padding: '20px 12px', fontFamily: 'monospace', fontSize: '13px', color: colors.textMuted }} title={f.public_key}>
                          {f.public_key ? `${f.public_key.substring(0, 16)}...` : 'N/A'}
                        </td>

                        <td style={{ padding: '20px 12px', textAlign: 'center' }}>
                          {!verifyState[f.id]?.status && <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 500 }}>Pending check</span>}
                          {verifyState[f.id]?.status === 'checking' && <span style={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#D97706', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Loader2 size={14} style={{ animation: 'spin 1s infinite' }} /> VERIFYING</span>}
                          {verifyState[f.id]?.status === 'valid' && <span style={{ fontSize: '12px', fontWeight: 600, backgroundColor: colors.successBg, color: colors.success, padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={14} /> AUTHENTIC</span>}
                          {verifyState[f.id]?.status === 'invalid' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, backgroundColor: colors.danger, color: colors.white, padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} /> TAMPERED
                              </span>
                              {verifyState[f.id]?.tamperTime && <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Detected: {verifyState[f.id].tamperTime}</span>}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '20px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => runDetailedTrace(f)} style={{ fontSize: '13px', fontWeight: 600, padding: '8px 14px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'} onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}>
                              <Terminal size={14} /> Audit
                            </button>

                            {isInvalid && !f.is_quarantined && (
                              <button onClick={() => handleQuarantineRecord(f.id)} style={{ backgroundColor: colors.danger, color: colors.white, border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldAlert size={14} /> Quarantine
                              </button>
                            )}

                            {f.is_quarantined && (
                              <span style={{ fontSize: '11px', color: colors.danger, fontWeight: 800, padding: '6px 8px', border: `1px solid ${colors.danger}`, borderRadius: '4px' }}>QUARANTINED</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 40px 24px' }}>
              <PaginationControls />
            </div>
          </div>
        )}

        {/* ---------------- VIEW 4: THE QUARANTINE ZONE ---------------- */}
        {activeMenu === "quarantine" && (
          <div style={{ animation: 'fadeUp 0.4s ease', backgroundColor: colors.white, borderRadius: '16px', border: `1px solid ${colors.danger}`, boxShadow: '0 10px 25px rgba(239, 68, 68, 0.1)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '32px 40px', borderBottom: `1px solid ${colors.dangerBg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.danger, margin: '0 0 8px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldAlert size={28} /> Quarantine Zone
                </h1>
                <p style={{ color: '#991B1B', fontSize: '15px', margin: 0 }}>Isolated records detected with tampered signatures. These are hidden from your metrics.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.white, borderRadius: '8px', padding: '0 16px', height: '42px', width: '320px', border: `1px solid #FCA5A5` }}>
                <Search size={18} color={colors.danger} style={{ marginRight: '12px', flexShrink: 0 }} />
                <input type="text" placeholder="Search quarantined..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: colors.text }} />
              </div>
            </div>

            <div style={{ flex: 1, padding: '0 40px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 700, color: colors.danger, letterSpacing: '0.05em', borderBottom: `2px solid #FCA5A5`, width: '8%' }}>ID</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 700, color: colors.danger, letterSpacing: '0.05em', borderBottom: `2px solid #FCA5A5`, width: '18%' }}><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> TIMESTAMP</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 700, color: colors.danger, letterSpacing: '0.05em', borderBottom: `2px solid #FCA5A5`, width: '18%' }}>CUSTOMER</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 700, color: colors.danger, letterSpacing: '0.05em', borderBottom: `2px solid #FCA5A5`, width: '34%' }}>TAMPERED PAYLOAD</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 700, color: colors.danger, letterSpacing: '0.05em', borderBottom: `2px solid #FCA5A5`, width: '10%' }}>RATING</th>
                    <th style={{ padding: '20px 12px', fontSize: '12px', fontWeight: 700, color: colors.danger, letterSpacing: '0.05em', borderBottom: `2px solid #FCA5A5`, width: '12%', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: colors.textMuted }}>No records in quarantine.</td></tr>
                  ) : currentItems.map((f, index) => {
                    const parsed = parseFeedbackData(f.comment);
                    const precisionDate = formatPrecisionDate(f.created_at);
                    return (
                      <tr key={f.id} style={{ borderBottom: `1px solid #FEE2E2` }}>
                        <td style={{ padding: '20px 12px', color: colors.danger, fontSize: '14px', fontWeight: 700 }}>#{f.id}</td>
                        <td style={{ padding: '20px 12px' }}>
                          <div style={{ color: colors.text, fontSize: '14px', fontWeight: 500 }}>{precisionDate.date}</div>
                          <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '2px' }}>{precisionDate.time}</div>
                        </td>
                        <td style={{ padding: '20px 12px', color: colors.text, fontSize: '15px', fontWeight: 600 }}>{f.customer_name || 'Anonymous'}</td>

                        <td style={{ padding: '20px 12px', fontSize: '14px', color: colors.textMuted, lineHeight: 1.5 }}>
                          {parsed.stall && <span style={{ color: '#991B1B', fontWeight: 600, backgroundColor: '#FEE2E2', padding: '4px 10px', borderRadius: '6px', marginRight: '8px' }}>{parsed.stall}</span>}
                          {parsed.metrics && <span style={{ fontSize: '12px', color: colors.textMuted }}>Metrics</span>}
                          {f.has_attachment && <span style={{ fontSize: '11px', color: colors.danger, fontWeight: 700, marginLeft: '8px', border: `1px solid ${colors.danger}`, padding: '2px 6px', borderRadius: '4px' }}>[PHOTO]</span>}
                        </td>

                        <td style={{ padding: '20px 12px', fontWeight: 700, color: colors.danger, fontSize: '15px' }}>{f.rating} <span style={{ color: '#F87171', fontWeight: 500 }}>/ 5</span></td>
                        <td style={{ padding: '20px 12px', textAlign: 'right' }}>
                          <button onClick={() => handlePurgeRecord(f.id)} style={{ backgroundColor: colors.danger, color: colors.white, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#991B1B'} onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.danger}>
                            <Trash2 size={16} /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 40px 24px' }}>
              <PaginationControls />
            </div>
          </div>
        )}

      </div>

      {/* ---------------- 1. VIEW FEEDBACK MODAL (Modernized) ---------------- */}
      {selectedFeedback && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: colors.white, borderRadius: '16px', padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button onClick={() => setSelectedFeedback(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '4px' }}><X size={24} /></button>

            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Feedback Report</h2>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 32px 0' }}>ID #{selectedFeedback.id} • Submitted via EdDSA Portal</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>STALL REVIEWED</span>
              <span style={{ fontWeight: 700, color: colors.navy, fontSize: '15px', backgroundColor: '#F1F5F9', padding: '4px 12px', borderRadius: '6px' }}>
                {parseFeedbackData(selectedFeedback.comment).stall || 'General Feedback'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>CUSTOMER NAME</span>
              <span style={{ fontWeight: 600, color: colors.text, fontSize: '15px' }}>{selectedFeedback.customer_name || 'Anonymous'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '24px' }}>
              <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>OVERALL RATING</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: colors.navy, fontSize: '20px' }}>{selectedFeedback.rating} / 5</span>
                <Star size={18} fill={colors.gold} color={colors.gold} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>CATEGORY BREAKDOWN</span>
              {parseFeedbackData(selectedFeedback.comment).metrics ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(parseFeedbackData(selectedFeedback.comment).metrics).map(([cat, val]) => (
                    <div key={cat} style={{ fontSize: '13px', backgroundColor: '#F8FAFC', padding: '8px 16px', borderRadius: '20px', border: `1px solid ${colors.border}`, fontWeight: 500, color: colors.text }}>
                      {cat}: <strong style={{ color: colors.navy }}>{val}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                  No detailed metrics provided.
                </div>
              )}
            </div>

            <div style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>WRITTEN COMMENT</span>
              <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '12px', fontSize: '15px', color: colors.text, fontStyle: 'italic', border: `1px solid ${colors.border}`, lineHeight: 1.6 }}>
                "{parseFeedbackData(selectedFeedback.comment).text}"
              </div>
            </div>

            {/* EVIDENCE DISPLAY SECTION */}
            {selectedFeedback.has_attachment && !selectedFeedback.attachment && (
              <div style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <Loader2 size={14} style={{ animation: 'spin 1s infinite' }} /> Fetching high-res evidence data from secure vault...
              </div>
            )}

            {selectedFeedback.attachment && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', letterSpacing: '0.05em' }}>
                  <Camera size={14} /> EVIDENCE ATTACHMENT
                </span>
                <div
                  onClick={() => setFullScreenImage(selectedFeedback.attachment)}
                  title="Click to view full size"
                  style={{ padding: '8px', backgroundColor: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center', cursor: 'zoom-in', transition: 'border-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.navy}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
                >
                  <img src={selectedFeedback.attachment} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: colors.textMuted, marginTop: '12px', fontWeight: 500 }}>Click image to enlarge</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- 1.B FULL SCREEN IMAGE VIEWER ---------------- */}
      {fullScreenImage && (
        <div
          onClick={() => setFullScreenImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}
        >
          <button style={{ position: 'absolute', top: '32px', right: '40px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}><X size={40} /></button>
          <img src={fullScreenImage} alt="Full Screen Evidence" style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain', outline: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {/* ---------------- 2. CYBER TERMINAL MODAL (Kept Dark/Hacker style) ---------------- */}
      {traceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '700px', backgroundColor: '#020617', border: '1px solid #1E293B', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'fadeUp 0.3s ease' }}>

            <div style={{ backgroundColor: '#0F172A', padding: '16px 24px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#94A3B8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
                <Terminal size={16} color={colors.gold} /> Ed25519 VERIFICATION TRACE // TASK_ID: {traceModal.id}
              </div>
              <button onClick={() => setTraceModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.color = '#64748B'}><X size={20} /></button>
            </div>

            <div style={{ padding: '32px', color: '#10B981', fontSize: '14px', lineHeight: '1.6', fontFamily: 'monospace' }}>
              <div style={{ color: '#64748B', marginBottom: '24px' }}>&gt; Initializing audit protocol...</div>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 'bold' }}>[1] Target Payload Extracted:</span><br />
                <span style={{ color: '#94A3B8' }}>&#123; customer_name: "{traceModal.customer_name}", rating: {traceModal.rating}, comment: "{traceModal.comment.substring(0, 30)}..." &#125;</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 'bold' }}>[2] Retrieving EdDSA Public Key:</span><br />
                <span style={{ color: '#94A3B8', wordBreak: 'break-all' }}>{traceModal.public_key}</span>
              </div>
              <div style={{ marginBottom: '32px' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 'bold' }}>[3] Comparing computed hash against provided signature...</span><br />
                <span style={{ color: '#94A3B8', wordBreak: 'break-all' }}>Expected: {traceModal.signature ? `${traceModal.signature.substring(0, 64)}...` : 'NULL'}</span>
              </div>

              {traceStatus === 'loading' && (
                <div style={{ color: '#10B981', animation: 'blink 1s infinite' }}>&gt; Validating elliptic curve constraints...</div>
              )}

              {traceStatus === 'pass' && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10B981', padding: '20px', marginTop: '24px', color: '#10B981', animation: 'fadeUp 0.3s ease' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>[OK] SIGNATURE VERIFIED</div>
                  Data integrity mathematically proven. No tampering detected.
                </div>
              )}

              {traceStatus === 'fail' && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #EF4444', padding: '20px', marginTop: '24px', color: '#EF4444', animation: 'fadeUp 0.3s ease' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={20} /> [FATAL ERROR] HASH MISMATCH</div>
                  Computed payload hash does not match the Ed25519 signature. Data has been altered post-submission.
                </div>
              )}

              {traceStatus !== 'loading' && (
                <button onClick={() => setTraceModal(null)} style={{ marginTop: '40px', backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1E293B'; e.currentTarget.style.color = '#F8FAFC'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
                  &gt; EXIT_TRACE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── CUSTOM MODAL (CONFIRM & ALERT) ─── */}
      {modalState.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: colors.white, padding: '32px', borderRadius: '16px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              {modalState.type === 'success' && <div style={{ backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '50%' }}><ShieldCheck color="#10B981" size={28} /></div>}
              {modalState.type === 'error' && <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '50%' }}><AlertTriangle color="#EF4444" size={28} /></div>}
              {modalState.type === 'confirm' && <div style={{ backgroundColor: '#FEF3C7', padding: '12px', borderRadius: '50%' }}><AlertTriangle color="#D97706" size={28} /></div>}
              {modalState.type === 'info' && <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '50%' }}><ShieldCheck color="#3B82F6" size={28} /></div>}
              <h3 style={{ margin: 0, fontSize: '20px', color: colors.navy, fontWeight: 700 }}>{modalState.title}</h3>
            </div>

            <p style={{ margin: '0 0 28px 0', color: colors.textMuted, fontSize: '15px', lineHeight: 1.6 }}>
              {modalState.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {modalState.type === 'confirm' ? (
                <>
                  <button
                    onClick={closeCustomModal}
                    style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modalState.onConfirm) modalState.onConfirm();
                      closeCustomModal();
                    }}
                    style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}
                  >
                    Confirm Action
                  </button>
                </>
              ) : (
                <button
                  onClick={closeCustomModal}
                  style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#17365C'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.navy}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT CRITERIA MODAL ─── */}
      {editingCriteria && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: colors.white, padding: '32px', borderRadius: '16px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'fadeUp 0.3s ease' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: colors.navy, fontWeight: 700 }}>Edit Criterion</h3>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '8px', letterSpacing: '0.05em' }}>CRITERION NAME</label>
              <input 
                type="text" 
                value={editingCriteria.name} 
                onChange={e => setEditingCriteria(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px', color: colors.text, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setEditingCriteria(null)}
                style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCriteriaName}
                style={{ backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECURE PASSWORD GATE MODAL ─── */}
      {passwordConfirm.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: colors.white, padding: '32px', borderRadius: '16px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '50%' }}><ShieldAlert color="#EF4444" size={28} /></div>
              <h3 style={{ margin: 0, fontSize: '20px', color: colors.navy, fontWeight: 700 }}>{passwordConfirm.title}</h3>
            </div>

            <p style={{ margin: '0 0 16px 0', color: colors.textMuted, fontSize: '15px', lineHeight: 1.6 }}>
              {passwordConfirm.message}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Enter admin password to verify"
                value={passwordConfirm.password}
                onChange={e => setPasswordConfirm(prev => ({ ...prev, password: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
              {passwordConfirm.error && (
                <div style={{ color: colors.danger, fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
                  {passwordConfirm.error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setPasswordConfirm(prev => ({ ...prev, isOpen: false }))}
                disabled={passwordConfirm.loading}
                style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPasswordAction}
                disabled={passwordConfirm.loading}
                style={{ backgroundColor: colors.danger, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {passwordConfirm.loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}