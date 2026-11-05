import React, { useState, useEffect } from "react";
import { UserCog, Plus, Edit, UserX, UserCheck, X, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "investigating_officer",
    assigned_cases: "",
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/users?limit=50");
      setUsers(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const payload = {
        ...formData,
        assigned_cases: formData.assigned_cases ? formData.assigned_cases.split(",").map(c => c.trim()) : ["*"],
      };
      await apiClient.post("/admin/users", payload);
      setShowModal(false);
      setFormData({
        username: "",
        email: "",
        full_name: "",
        password: "",
        role: "investigating_officer",
        assigned_cases: "",
      });
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create user account.");
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    const confirmToggle = window.confirm(`Change status for officer "${user.username}" to ${newStatus.toUpperCase()}?`);
    if (!confirmToggle) return;

    try {
      await apiClient.patch(`/admin/users/${user._id}`, { status: newStatus });
      loadUsers();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const columns = [
    {
      header: "Officer Username",
      accessor: "username",
      width: "160px",
      render: (r) => <b>{r.username}</b>,
    },
    {
      header: "Full Name & Designation",
      accessor: "full_name",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500, color: "#183153" }}>{r.full_name}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>{r.email}</div>
        </div>
      ),
    },
    {
      header: "Security Role",
      accessor: "role",
      width: "180px",
      render: (r) => (
        <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
          {r.role?.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      width: "100px",
      render: (r) => <StatusBadge status={r.status === "active" ? "Active" : "Disabled"} />,
    },
    {
      header: "Last Login",
      accessor: "last_login",
      width: "150px",
      render: (r) => r.last_login ? r.last_login.slice(0, 16).replace("T", " ") : "Never",
    },
    {
      header: "Actions",
      width: "130px",
      align: "right",
      render: (r) => (
        <button
          className={`btn btn-sm ${r.status === "active" ? "btn-secondary" : "btn-primary"}`}
          onClick={() => toggleUserStatus(r)}
        >
          {r.status === "active" ? "Disable" : "Enable"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Officer & Role Access Administration</h1>
          <div className="page-subtitle">Enforce backend role-based access control and case file permissions</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Officer Account
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
      />

      {/* Add User Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(16, 36, 58, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div className="gov-card" style={{ width: "100%", maxWidth: "520px", backgroundColor: "#ffffff" }}>
            <div className="gov-card-header">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#183153" }}>Register Authorized Officer</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ padding: "20px" }}>
              {formError && (
                <div style={{ padding: "8px 12px", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "4px", fontSize: "12px", marginBottom: "14px" }}>
                  <AlertCircle size={14} style={{ display: "inline", marginRight: "6px" }} />
                  {formError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Official Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name & Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">System Role *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="investigating_officer">Investigating Officer</option>
                    <option value="supervisory_reviewer">Supervisory Reviewer</option>
                    <option value="intake_officer">Intake Officer</option>
                    <option value="auditor">Auditor</option>
                    <option value="system_administrator">System Administrator</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Case Permissions (comma-separated case IDs, or * for all)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CASE-2026-GUJ-042 or *"
                  value={formData.assigned_cases}
                  onChange={(e) => setFormData({ ...formData, assigned_cases: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Officer Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
