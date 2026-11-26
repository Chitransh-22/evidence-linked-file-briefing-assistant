import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Search,
  FileCheck,
  Settings,
  FileUp,
  ClipboardCheck,
  CheckCircle2,
  Users,
  ClipboardList,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import "./login.css";

const QUICK_USERS = [
  {
    role: "Investigating Officer",
    username: "investigator",
    password: "OfficerGov2026!",
    desc: "Investigation.",
    icon: Search,
  },
  {
    role: "Supervisory Reviewer",
    username: "reviewer",
    password: "OfficerGov2026!",
    desc: "Review.",
    icon: FileCheck,
  },
  {
    role: "System Administrator",
    username: "admin",
    password: "AdminSecureGov2026!",
    desc: "Administration.",
    icon: Settings,
  },
  {
    role: "Intake Officer",
    username: "intake_officer",
    password: "OfficerGov2026!",
    desc: "Document intake.",
    icon: FileUp,
  },
  {
    role: "Independent Auditor",
    username: "auditor",
    password: "OfficerGov2026!",
    desc: "Audit & compliance.",
    icon: ClipboardCheck,
    fullWidth: true,
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
    <div className="login-terminal">
      <div className="lt-top-accent" aria-hidden="true" />

      {/* Minimal Top Header */}
      <header className="lt-header">
        <div className="lt-container lt-header-inner">
          <span className="lt-header-brand">LEKH</span>
          <span className="lt-header-status">
            <Lock size={14} strokeWidth={2} aria-hidden="true" />
            <span>Restricted Access</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="lt-main">
        <div className="lt-container">
          {/* Institutional Title Section */}
          <section className="lt-title-section">
            <div className="lt-eyebrow-row">
              <span className="lt-eyebrow-line" aria-hidden="true" />
              <span className="lt-eyebrow-label">OFFICIAL ACCESS PORTAL</span>
            </div>
            <h1 className="lt-page-title">
              Ledger for Evidence and Knowledge Handling
            </h1>
            <p className="lt-page-subtitle">
              Authenticate to access your designated investigation workspace.
            </p>
          </section>

          {/* Two-Column Authentication Workspace */}
          <section className="lt-workspace">
            {/* Left Section: Manual Authentication */}
            <div>
              <div className="lt-section-code">01 / AUTHENTICATION</div>
              <h2 className="lt-section-heading">Officer sign in</h2>
              <p className="lt-section-desc">Enter your official credentials.</p>

              {isExpired && (
                <div className="lt-alert-warning" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>Your session has expired. Please re-authenticate.</span>
                </div>
              )}

              {error && (
                <div className="lt-alert-error" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="lt-field-group">
                  <label className="lt-label" htmlFor="username">
                    Officer Username / Official Email
                  </label>
                  <div className="lt-input-wrap">
                    <User size={16} className="lt-input-icon" aria-hidden="true" />
                    <input
                      id="username"
                      type="text"
                      className="lt-input"
                      placeholder="e.g. investigator or admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="lt-field-group">
                  <label className="lt-label" htmlFor="password">
                    Security Password
                  </label>
                  <div className="lt-input-wrap">
                    <Lock size={16} className="lt-input-icon" aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="lt-input has-toggle"
                      placeholder="Enter your confidential password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="lt-pw-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="lt-submit-btn"
                  disabled={isLoading}
                >
                  <span>
                    {isLoading && !activeQuickUser
                      ? "Validating Credentials..."
                      : "Authenticate & Access System"}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>

              <p className="lt-notice">
                Access is restricted to authorized personnel.
              </p>
            </div>

            {/* Vertical Neutral Divider */}
            <div className="lt-divider-vertical" aria-hidden="true" />

            {/* Right Section: Quick Role Access */}
            <div>
              <div className="lt-section-code">02 / ROLE ACCESS</div>
              <h2 className="lt-section-heading">Select workspace</h2>
              <p className="lt-section-desc">Quick access · Testing only</p>

              <div className="lt-role-grid">
                {QUICK_USERS.map((u) => {
                  const Icon = u.icon;
                  const isThisLoading = isLoading && activeQuickUser === u.username;
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      disabled={isLoading}
                      className={`lt-role-tile${u.fullWidth ? " is-full" : ""}`}
                    >
                      <div className="lt-role-tile-left">
                        <Icon size={18} strokeWidth={1.9} className="lt-role-icon" aria-hidden="true" />
                        <div>
                          <div className="lt-role-title">{u.role}</div>
                          <div className="lt-role-desc">{u.desc}</div>
                        </div>
                      </div>
                      <span className="lt-role-arrow">
                        {isThisLoading ? "Signing in..." : <ArrowRight size={15} aria-hidden="true" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Bottom Information Strip */}
          <div className="lt-info-strip">
            <div className="lt-info-item">
              <CheckCircle2 size={15} className="lt-info-icon" aria-hidden="true" />
              <span>Evidence Integrity</span>
            </div>
            <div className="lt-info-item">
              <Users size={15} className="lt-info-icon" aria-hidden="true" />
              <span>Role-Based Access</span>
            </div>
            <div className="lt-info-item">
              <ClipboardList size={15} className="lt-info-icon" aria-hidden="true" />
              <span>Audit Accountability</span>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="lt-footer">
        LEKH · AUTHORIZED PERSONNEL ONLY
      </footer>
    </div>
  );
}
