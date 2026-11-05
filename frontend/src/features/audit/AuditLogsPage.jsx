import React, { useState, useEffect } from "react";
import { ShieldCheck, Download, Search, CheckCircle2, AlertTriangle, Key } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Cryptographic Chain Verification State
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "25" });
      if (actionFilter) params.append("action", actionFilter);

      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [page, actionFilter]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await apiClient.get("/audit-logs/verify-chain");
      setVerificationResult(res.data);
    } catch (err) {
      alert("Verification query failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const columns = [
    {
      header: "Timestamp (UTC)",
      accessor: "timestamp",
      width: "170px",
      render: (r) => <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "11px" }}>{r.timestamp?.slice(0, 19).replace("T", " ")}</span>,
    },
    {
      header: "Officer / Actor",
      accessor: "user_id",
      width: "140px",
      render: (r) => <b>{r.user_id}</b>,
    },
    {
      header: "Action Code",
      accessor: "action",
      width: "210px",
      render: (r) => (
        <span style={{ fontWeight: 600, color: "#183153", fontSize: "12px" }}>
          {r.action}
        </span>
      ),
    },
    {
      header: "Resource",
      accessor: "resource_type",
      width: "180px",
      render: (r) => (
        <span style={{ fontSize: "12px", color: "#475569" }}>
          {r.resource_type}: <code>{r.resource_id}</code>
        </span>
      ),
    },
    {
      header: "Outcome",
      accessor: "outcome",
      width: "100px",
      render: (r) => <StatusBadge status={r.outcome === "SUCCESS" ? "Completed" : "Failed"} label={r.outcome} />,
    },
    {
      header: "SHA-256 Event Hash",
      accessor: "event_hash",
      render: (r) => (
        <code style={{ fontSize: "10px", color: "#64748B" }}>
          {r.event_hash ? `${r.event_hash.slice(0, 24)}...` : "Genesis"}
        </code>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tamper-Evident System Audit Trail</h1>
          <div className="page-subtitle">
            Cryptographically chained SHA-256 audit ledger tracking every access, extraction, and briefing sign-off
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary"
            onClick={() => downloadFile(`/audit-logs/export`, "audit_logs.csv")}
          >
            <Download size={14} /> Export Audit CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={handleVerifyChain}
            disabled={isVerifying}
          >
            <ShieldCheck size={15} /> {isVerifying ? "Verifying Hash Chain..." : "Verify Hash Chain Integrity"}
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: verificationResult.valid ? "#CCFBF1" : "#FEE2E2",
            border: `1px solid ${verificationResult.valid ? "#0F766E" : "#EF4444"}`,
            borderRadius: "4px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px", color: verificationResult.valid ? "#0F766E" : "#B91C1C" }}>
              {verificationResult.valid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{verificationResult.message}</span>
            </div>
            <div style={{ fontSize: "12px", color: "#334155", marginTop: "4px" }}>
              Verified Records: <b>{verificationResult.total_records}</b> • Chain Head Hash: <code>{verificationResult.head_hash?.slice(0, 32)}...</code>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setVerificationResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="gov-card" style={{ padding: "14px 16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "#64748B" }}>Action Filter:</span>
        <select
          className="form-select"
          style={{ width: "240px" }}
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Security & Audit Actions</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="DOCUMENT_UPLOADED">Document Ingestion</option>
          <option value="DOCUMENT_PROCESSING_COMPLETED">Pipeline Completions</option>
          <option value="EVIDENCE_VERIFIED">Evidence Verifications</option>
          <option value="CONTRADICTION_REVIEWED">Contradiction Reviews</option>
          <option value="BRIEFING_GENERATED">Briefing Generations</option>
          <option value="BRIEFING_APPROVED">Supervisory Approvals</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        pagination={{
          page,
          pages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />
    </div>
  );
}
