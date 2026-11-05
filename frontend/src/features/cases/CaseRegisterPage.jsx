import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, FolderOpen, Edit, UserPlus, Archive, X, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";

export function CaseRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    case_reference: "",
    title: "",
    category: "Corruption & Financial Irregularities",
    description: "",
    priority: "Normal",
    assigned_officers: user ? [user.username] : [],
    tags: "",
  });

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiClient.get(`/cases?${params.toString()}`);
      setCases(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadCases();
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!formData.case_reference.trim() || !formData.title.trim()) {
      setFormError("Case Reference and Title are required.");
      return;
    }
    setFormError("");

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : [],
      };
      await apiClient.post("/cases", payload);
      setShowCreateModal(false);
      setFormData({
        case_reference: "",
        title: "",
        category: "Corruption & Financial Irregularities",
        description: "",
        priority: "Normal",
        assigned_officers: user ? [user.username] : [],
        tags: "",
      });
      loadCases();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create case.");
    }
  };

  const columns = [
    {
      header: "Case Reference",
      accessor: "case_reference",
      width: "160px",
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#183153" }}>
          {row.case_reference}
        </span>
      ),
    },
    {
      header: "Case Title",
      accessor: "title",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: "#1E293B" }}>{row.title}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Priority: {row.priority}</div>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      width: "180px",
    },
    {
      header: "Assigned Officers",
      accessor: "assigned_officers",
      width: "160px",
      render: (row) => (
        <span style={{ fontSize: "12px", color: "#475569" }}>
          {row.assigned_officers?.join(", ") || "Unassigned"}
        </span>
      ),
    },
    {
      header: "Documents",
      accessor: "document_count",
      width: "90px",
      align: "center",
      render: (row) => <b>{row.document_count}</b>,
    },
    {
      header: "Status",
      accessor: "status",
      width: "110px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Briefing",
      accessor: "briefing_status",
      width: "130px",
      render: (row) => <StatusBadge status={row.briefing_status} />,
    },
    {
      header: "Actions",
      width: "130px",
      align: "right",
      render: (row) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/cases/${row.id}`)}
            title="Open Case Workspace"
          >
            <FolderOpen size={14} /> Open
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Case Register & Workspaces</h1>
          <div className="page-subtitle">Official investigation files and evidence directories</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> New Case File
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="gov-card"
        style={{
          padding: "16px",
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: 1 }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "32px" }}
              placeholder="Search by Case Reference or Title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "#64748B" }}>Status:</span>
          <select
            className="form-select"
            style={{ width: "130px" }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <DataTable
        columns={columns}
        data={cases}
        isLoading={isLoading}
        pagination={{
          page,
          pages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* New Case Modal */}
      {showCreateModal && (
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
          <div
            className="gov-card"
            style={{ width: "100%", maxWidth: "540px", backgroundColor: "#ffffff" }}
          >
            <div className="gov-card-header">
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Create New Investigation Case</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} style={{ padding: "20px" }}>
              {formError && (
                <div
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#FEE2E2",
                    color: "#B91C1C",
                    borderRadius: "4px",
                    marginBottom: "14px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Case Reference *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CR-2026-VAL-101"
                    value={formData.case_reference}
                    onChange={(e) => setFormData({ ...formData, case_reference: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Investigation Category</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Land Revenue & Procurement Irregularities">Land Revenue & Procurement</option>
                    <option value="Corruption & Financial Irregularities">Corruption & Financial</option>
                    <option value="Procurement & Tender Irregularities">Procurement & Tender</option>
                    <option value="Disciplinary Inquiry">Disciplinary Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Case Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Official inquiry title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Scope & Background Description</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Summary of allegations, orders, or jurisdiction..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sanand, Revenue, Valuation"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
