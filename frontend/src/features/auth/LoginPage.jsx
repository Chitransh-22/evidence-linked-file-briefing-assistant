import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const QUICK_USERS = [
  {
    role: "Investigating Officer",
    username: "investigator",
    password: "OfficerGov2026!",
    badge: "Investigator",
    badgeColor: "#1E40AF",
    badgeBg: "#DBEAFE",
    desc: "Case management, evidence analysis & briefing draft",
  },
  {
    role: "Supervisory Reviewer",
    username: "reviewer",
    password: "OfficerGov2026!",
    badge: "Reviewer",
    badgeColor: "#9A3412",
    badgeBg: "#FFEDD5",
    desc: "Claim verification, 3-column review & approval sign-off",
  },
  {
    role: "System Administrator",
    username: "admin",
    password: "AdminSecureGov2026!",
    badge: "Admin",
    badgeColor: "#831843",
    badgeBg: "#FCE7F3",
    desc: "User management, AI engine health & system telemetry",
  },
  {
    role: "Intake Officer",
    username: "intake_officer",
    password: "OfficerGov2026!",
    badge: "Intake",
    badgeColor: "#065F46",
    badgeBg: "#D1FAE5",
    desc: "Document intake dropzone, SHA-256 checks & routing",
  },
  {
    role: "Independent Auditor",
    username: "auditor",
    password: "OfficerGov2026!",
    badge: "Auditor",
    badgeColor: "#3730A3",
    badgeBg: "#E0E7FF",
    desc: "Read-only ledger & SHA-256 audit chain verification",
  },
];

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuickUser, setActiveQuickUser] = useState(null);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get("expired") === "1";

  const executeLogin = async (usr, pwd) => {
    setError("");
    setIsLoading(true);
    try {
      await login(usr.trim(), pwd);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setActiveQuickUser(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please provide both username and security password.");
      return;
    }
    await executeLogin(username, password);
  };

  const handleQuickLogin = async (u) => {
    setUsername(u.username);
    setPassword(u.password);
    setActiveQuickUser(u.username);
    await executeLogin(u.username, u.password);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#F3F5F8",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        className="gov-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          border: "1px solid #D8DEE7",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {/* Header Branding */}
        <div
          style={{
            padding: "24px 24px 18px",
            borderBottom: "1px solid #E2E8F0",
            textAlign: "center",
            backgroundColor: "#F8FAFC",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#183153",
              color: "#ffffff",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h2 style={{ fontSize: "15px", color: "#183153", fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
            GOVERNMENT DOCUMENT EVIDENCE INTELLIGENCE & BRIEFING SYSTEM
          </h2>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "4px" }}>
            Official Restricted Access Portal
          </div>
        </div>

        {/* Quick Testing User Selectors */}
        <div
          style={{
            backgroundColor: "#F1F5F9",
            borderBottom: "1px solid #E2E8F0",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
              <UserCheck size={14} color="#183153" /> Quick Login by Role (For Testing)
            </span>
            <span style={{ fontSize: "10px", color: "#64748B" }}>1-Click Auth</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {QUICK_USERS.map((u) => {
              const isThisLoading = isLoading && activeQuickUser === u.username;
              return (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  disabled={isLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    backgroundColor: activeQuickUser === u.username ? "#E2E8F0" : "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.borderColor = "#94A3B8";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        backgroundColor: u.badgeBg,
                        color: u.badgeColor,
                        minWidth: "68px",
                        textAlign: "center",
                      }}
                    >
                      {u.badge}
                    </span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>
                        {u.role}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748B" }}>
                        User: <code style={{ color: "#0F172A", fontWeight: 600 }}>{u.username}</code>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569", fontSize: "11px", fontWeight: 600 }}>
                    {isThisLoading ? "Signing in..." : <ArrowRight size={14} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: "12px", textAlign: "center" }}>
            — Or Enter Officer Credentials Manually —
          </div>

          {isExpired && (
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "#FEF3C7",
                border: "1px solid #F59E0B",
                borderRadius: "4px",
                color: "#B45309",
                fontSize: "12px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} /> Your session has expired. Please re-authenticate.
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "#FEE2E2",
                border: "1px solid #EF4444",
                borderRadius: "4px",
                color: "#B91C1C",
                fontSize: "12px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label" htmlFor="username">
                Officer Username / Official Email
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "34px" }}
                  placeholder="e.g. investigator or admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
                <User size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" htmlFor="password">
                Security Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: "34px", paddingRight: "34px" }}
                  placeholder="Enter your confidential password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Lock size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "10px", top: "10px", background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "38px" }}
              disabled={isLoading}
            >
              {isLoading && !activeQuickUser ? "Validating Credentials..." : "Authenticate & Access System"}
            </button>
          </form>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #E2E8F0",
              fontSize: "11px",
              color: "#64748B",
              textAlign: "center",
              lineHeight: "1.4",
            }}
          >
            CONFIDENTIAL WARNING: Unauthorized access is strictly prohibited under the Information Technology Act.
            All user sessions and document access events are cryptographically hashed and logged.
          </div>
        </div>
      </div>
    </div>
  );
}
