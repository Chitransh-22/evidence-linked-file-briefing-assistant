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
  LogOut,
  Activity,
  Sliders,
  UserCog,
  Menu,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { getAuthorizedMenuSections, getRoleBadgeLabel } from "../config/rbac";
import lekhLogo from "../assets/logo.png";

const ICON_MAP = {
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
  Activity,
  Sliders,
  UserCog,
};

export function MainLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const authorizedSections = isAuthenticated && user?.role
    ? getAuthorizedMenuSections(user.role)
    : [];

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumb = pathParts.length > 0 ? pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ") : "Dashboard";

  return (
    <div className="app-shell auth-theme">
      {/* Mobile Sidebar Backdrop */}
      <div
        className={`sidebar-backdrop${mobileMenuOpen ? " is-open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`app-sidebar${mobileMenuOpen ? " is-open" : ""}`}>
        <div className="sidebar-brand">
          <img src={lekhLogo} alt="LEKH logo" className="brand-logo-img" />
          <div>
            <div className="brand-title">LEKH</div>
            <div className="brand-sub">Ledger for Evidence and Knowledge Handling</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          {authorizedSections.map((section) => (
            <React.Fragment key={section.id}>
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => {
                const Icon = ICON_MAP[item.icon] || FileText;
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={Boolean(item.end)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  >
                    <Icon size={16} /> {item.label}
                  </NavLink>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* Current Officer Profile */}
        <div className="sidebar-user">
          <div className="user-info-text">
            <div className="user-name">{user?.full_name || user?.username || "Authorized Officer"}</div>
            <div className="user-role-badge">{(user?.role || "Officer").replace(/_/g, " ")}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out of secure session"
            className="sidebar-logout-btn"
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
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <Menu size={16} />
            </button>
            <div className="header-breadcrumbs">
              <span>Home</span>
              <span>/</span>
              <span className="header-breadcrumb-active">{breadcrumb}</span>
            </div>
          </div>

          <div className="header-right">
            <div className="header-node-status">
              <span className="header-node-dot"></span>
              <span>Ledger Node: Online</span>
            </div>

            <div style={{ position: "relative" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>{user?.username}</span>
                <span className="badge badge-primary" style={{ fontSize: "10px", padding: "1px 6px" }}>
                  {getRoleBadgeLabel(user?.role)}
                </span>
              </button>

              {showUserDropdown && (
                <div className="header-user-dropdown">
                  <div className="header-user-dropdown-meta">
                    <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{user?.full_name}</div>
                    <div style={{ color: "var(--color-text-secondary)" }}>{user?.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="header-user-dropdown-logout"
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
