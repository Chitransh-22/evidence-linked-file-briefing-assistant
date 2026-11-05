import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  UploadCloud,
  FileText,
  Cpu,
  BookOpen,
  Search,
  Users,
  Calendar,
  AlertTriangle,
  FileSignature,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Activity,
  Sliders,
  UserCog,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Generate breadcrumb path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumb = pathParts.length > 0 ? pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ") : "Dashboard";

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="brand-title">EVIDENCE INTELLIGENCE</div>
            <div className="brand-sub">GOVERNMENT BRIEFING SYSTEM</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Core Operations</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/cases" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <FolderKanban size={16} /> Case Register
          </NavLink>
          <NavLink to="/intake" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <UploadCloud size={16} /> Document Intake
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <FileText size={16} /> Document Library
          </NavLink>
          <NavLink to="/processing" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Cpu size={16} /> Processing Queue
          </NavLink>

          <div className="nav-section-title">Intelligence & Evidence</div>
          <NavLink to="/evidence" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <BookOpen size={16} /> Evidence Ledger
          </NavLink>
          <NavLink to="/evidence/search" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Search size={16} /> Evidence Search
          </NavLink>
          <NavLink to="/entities" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Users size={16} /> Entity Register
          </NavLink>
          <NavLink to="/chronology" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Calendar size={16} /> Event Chronology
          </NavLink>
          <NavLink to="/contradictions" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <AlertTriangle size={16} /> Contradiction Analysis
          </NavLink>
          <NavLink to="/briefings" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <FileSignature size={16} /> Investigation Briefings
          </NavLink>

          <div className="nav-section-title">Governance & Administration</div>
          <NavLink to="/audit-logs" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <ShieldCheck size={16} /> Tamper-Evident Audit
          </NavLink>

          {user?.role === "system_administrator" && (
            <>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <UserCog size={16} /> Officer Accounts
              </NavLink>
              <NavLink to="/admin/ai-services" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Sliders size={16} /> AI Pipeline Readiness
              </NavLink>
              <NavLink to="/admin/system" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Activity size={16} /> System Health
              </NavLink>
            </>
          )}
        </nav>

        {/* Current Officer Profile */}
        <div className="sidebar-user">
          <div className="user-info-text">
            <div className="user-name">{user?.full_name || user?.username || "Authorized Officer"}</div>
            <div className="user-role-badge">{(user?.role || "Officer").replace("_", " ")}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out of secure session"
            style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: "4px" }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main-area">
        {/* Top Header */}
        <header className="app-header">
          <div className="header-left">
            <div className="header-breadcrumbs">
              <span>Home</span>
              <span>/</span>
              <span style={{ color: "#183153", fontWeight: 600 }}>{breadcrumb}</span>
            </div>
          </div>

          <div className="header-right">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748B" }}>
              <span style={{ width: "8px", height: "8px", backgroundColor: "#0F766E", borderRadius: "50%", display: "inline-block" }}></span>
              <span>Ledger Node: Online</span>
            </div>

            <div style={{ position: "relative" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>{user?.username}</span>
                <span className="badge badge-info" style={{ fontSize: "10px", padding: "1px 6px" }}>
                  {user?.role === "system_administrator" ? "Admin" : user?.role === "investigating_officer" ? "Investigator" : "Officer"}
                </span>
              </button>

              {showUserDropdown && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "40px",
                    width: "220px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    zIndex: 50,
                    padding: "8px 0",
                  }}
                >
                  <div style={{ padding: "8px 14px", borderBottom: "1px solid #E2E8F0", fontSize: "12px" }}>
                    <div style={{ fontWeight: 600, color: "#183153" }}>{user?.full_name}</div>
                    <div style={{ color: "#64748B" }}>{user?.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 14px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#B91C1C",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <LogOut size={14} /> End Secure Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
