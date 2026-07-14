import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import FeedbackForm from "./components/FeedbackForm";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import VerifyReceipt from "./components/VerifyReceipt"; 
import Login from "./components/Login";
import Onboarding from "./components/Onboarding";
import { Capacitor } from '@capacitor/core';

export default function App() {
  // Determine initial view based on URL pathname
  const getInitialView = () => {
    const path = window.location.pathname;
    const onboarded = localStorage.getItem('ua_onboarded');
    const isMobileApp = Capacitor.isNativePlatform();
    
    // 1. Force onboarding on mobile devices on first app launch
    if (isMobileApp && !onboarded) {
      return "onboarding";
    }

    // 2. Bypass landing page entirely on mobile app subsequent launches
    if (isMobileApp) {
      const token = localStorage.getItem('ua_token');
      const userStr = localStorage.getItem('ua_user');
      if (token && userStr) {
        return "feedback";
      } else {
        return "login";
      }
    }

    if (path === "/admin") return "admin-login";
    if (path === "/verify-receipt" || path === "/verify_receipt") return "verify_receipt";
    if (path === "/login" || path === "/student-login") return "login";
    if (path === "/feedback") return "feedback";
    if (path === "/admin-dashboard" || path === "/admin") return "admin-dashboard";
    return "landing";
  };

  const [currentView, setCurrentView] = useState(getInitialView());

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (view) => {
    setCurrentView(view);
    
    // Sync browser URL
    let newPath = "/";
    if (view === "admin-login") newPath = "/admin";
    else if (view === "verify_receipt") newPath = "/verify-receipt";
    else if (view === "student-login" || view === "login") newPath = "/login";
    else if (view === "feedback") newPath = "/feedback";
    else if (view === "admin-dashboard" || view === "admin") newPath = "/admin-dashboard";
    else if (view === "landing") newPath = "/";

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, "", newPath);
    }
  };

  return (
    <>
      {currentView === "onboarding" && <Onboarding onComplete={() => navigate("landing")} />}
      {currentView === "landing" && <LandingPage navigate={navigate} />}
      
      {/* 🧑‍🎓 STUDENT LOGIN PORTAL */}
      {(currentView === "student-login" || currentView === "login") && (
        <Login navigate={navigate} />
      )}

      {/* 👨‍💼 ADMIN / STAFF LOGIN PORTAL */}
      {/* We split this out so "admin-login" explicitly opens your AdminLogin.js! */}
      {currentView === "admin-login" && (
        <AdminLogin navigate={navigate} />
      )}
      
      {/* 📝 SECURE FEEDBACK ROUTE */}
      {currentView === "feedback" && <FeedbackForm navigate={navigate} />}
      
      {/* 🛡️ ADMIN DASHBOARD ROUTE */}
      {(currentView === "admin" || currentView === "admin-dashboard") && (
        <AdminDashboard navigate={navigate} />
      )}
      
      {/* OTHER ROUTES */}
      {currentView === "verify_receipt" && <VerifyReceipt navigate={navigate} />}
    </>
  );
}