import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, CheckCircle, AlertCircle } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, ROLES, canPerformAction } from "../../config/rbac";

export function BriefingsRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canExportBriefing = canPerformAction(user?.role, ACTIONS.EXPORT_BRIEFING);
  const canApproveBriefing = canPerformAction(user?.role, ACTIONS.APPROVE_BRIEFING);

  const [briefings, setBriefings] = useState([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [approvalError, setApprovalError] = useState("");

  const loadBriefings = async () => {
    setIsLoading(true);
    setApprovalError("");
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" });
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiClient.get(`/briefings?${params.toString()}`);
      setBriefings(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBriefings();
  }, [page, statusFilter]);

  const handleApproveBriefing = async (briefingId, creator) => {
    if (!canApproveBriefing) {
      alert("Only an authorized Supervisory Reviewer or System Administrator may approve final briefings.");
      return;
    }

    if (creator === user?.username && user?.role !== ROLES.SYSTEM_ADMINISTRATOR) {
      setApprovalError("Separation of duties violation: An investigating officer cannot self-approve their own briefing draft.");
      return;
    }

    const confirmApprove = window.confirm("Officially approve and finalize this investigation briefing? Once approved, it becomes an immutable official record.");
    if (!confirmApprove) return;

    try {
      await apiClient.post(`/briefings/${briefingId}/approve`);
      alert("Briefing officially approved.");
      loadBriefings();
    } catch (err) {
      setApprovalError(err.response?.data?.detail || "Approval failed.");
    }
  };

  const columns = [
    {
      header: "Briefing ID",
      accessor: "_id",
      width: "150px",
      render: (r) => <b>{r._id}</b>,
    },
    {
      header: "Briefing Title",
      accessor: "title",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{r.title}</div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Case Reference: {r.case_reference}</div>
        </div>
      ),
    },
    {
      header: "Version",
      accessor: "version",
      width: "80px",
      align: "center",
      render: (r) => <span className="badge badge-primary">v{r.version}</span>,
    },
    {
      header: "Prepared By",
      accessor: "created_by",
      width: "140px",
    },
    {
      header: "Claim Verification",
      accessor: "claim_stats",
      width: "150px",
      render: (r) => (
        <span style={{ fontSize: "12px", color: "var(--color-text-primary)" }}>
          <b>{r.claim_stats?.supported || 0}</b> / {r.claim_stats?.total || 0} verified
        </span>
      ),
    },
    {
      header: "Review Status",
      accessor: "status",
      width: "150px",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Actions",
      width: "220px",
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/briefings/${r._id}/review`)}
          >
            {canPerformAction(user?.role, ACTIONS.EDIT_BRIEFING) ? "Review" : "View"}
          </button>
          {canExportBriefing && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => downloadFile(`/briefings/${r._id}/export/pdf`, `Briefing_${r.case_reference || r._id}.pdf`)}
                title="Download Official PDF"
              >
                <Download size={13} /> PDF
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => downloadFile(`/briefings/${r._id}/export/docx`, `Briefing_${r.case_reference || r._id}.docx`)}
                title="Download Official DOCX"
              >
                DOCX
              </button>
            </>
          )}
          {r.status === "Under Review" && canApproveBriefing && (r.created_by !== user?.username || user?.role === ROLES.SYSTEM_ADMINISTRATOR) && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleApproveBriefing(r._id, r.created_by)}
              title="Official Approval"
            >
              <CheckCircle size={13} /> Approve
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Investigation Briefings Register</h1>
          <div className="page-subtitle">
            Formal AI-synthesized briefings, supervisory sign-offs, and immutable final publications
          </div>
        </div>
      </div>

      {approvalError && (
        <div
          style={{
            padding: "12px 14px",
            backgroundColor: "var(--color-red-bg)",
            border: "1px solid var(--color-red-alert)",
            borderRadius: "4px",
            color: "var(--color-red-alert)",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} /> {approvalError}
        </div>
      )}

      {/* Filter Bar */}
      <div className="gov-card" style={{ padding: "14px 16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>Filter Status:</span>
        <select
          className="form-select"
          style={{ width: "200px" }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Briefing Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Returned for Revision">Returned for Revision</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={briefings}
        isLoading={isLoading}
      />
    </div>
  );
}
