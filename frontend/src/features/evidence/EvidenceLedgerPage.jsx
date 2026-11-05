import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, CheckCircle, Flag, X, ExternalLink, AlertCircle } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";

export function EvidenceLedgerPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [evidenceList, setEvidenceList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState("verified");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const loadEvidence = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search) params.append("search", search);
      if (categoryFilter) params.append("category", categoryFilter);
      if (statusFilter) params.append("verification_status", statusFilter);

      const res = await apiClient.get(`/evidence?${params.toString()}`);
      setEvidenceList(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [page, categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadEvidence();
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvidence) return;
    setIsVerifying(true);
    try {
      await apiClient.post(`/evidence/${selectedEvidence._id}/verify`, {
        verification_status: verifyStatus,
        notes: verifyNotes,
      });
      setSelectedEvidence(null);
      setVerifyNotes("");
      loadEvidence();
    } catch (err) {
      alert("Failed to record verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const columns = [
    {
      header: "Evidence ID",
      accessor: "_id",
      width: "150px",
      render: (r) => (
        <span
          style={{ fontWeight: 600, color: "#183153", cursor: "pointer" }}
          onClick={() => setSelectedEvidence(r)}
        >
          {r._id}
        </span>
      ),
    },
    {
      header: "Document & Page",
      accessor: "document_id",
      width: "180px",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: "12px" }}>{r.document_title || r.document_id}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Page {r.page_number} • Para {r.paragraph_reference || 1}</div>
        </div>
      ),
    },
    {
      header: "Evidence Category",
      accessor: "evidence_category",
      width: "160px",
    },
    {
      header: "Extracted Statement / Fact",
      accessor: "source_excerpt",
      render: (r) => (
        <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
          {r.source_excerpt}
          {r.associated_entities?.length > 0 && (
            <div style={{ marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {r.associated_entities.map((e, idx) => (
                <span key={idx} style={{ fontSize: "10px", backgroundColor: "#F1F5F9", color: "#475569", padding: "1px 5px", borderRadius: "2px" }}>
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Confidence",
      accessor: "confidence",
      width: "90px",
      align: "center",
      render: (r) => `${Math.round((r.confidence || 0) * 100)}%`,
    },
    {
      header: "Verification",
      accessor: "verification_status",
      width: "130px",
      render: (r) => <StatusBadge status={r.verification_status} />,
    },
    {
      header: "Actions",
      width: "110px",
      align: "right",
      render: (r) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedEvidence(r)}
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Authoritative MongoDB Evidence Ledger</h1>
          <div className="page-subtitle">Centralized immutable record of structured documentary evidence</div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary"
            onClick={() => downloadFile(`/evidence/export/csv`, "evidence_ledger.csv")}
          >
            <Download size={15} /> Export Ledger CSV
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/evidence/search")}>
            <Search size={15} /> Semantic Search
          </button>
        </div>
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
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "32px" }}
              placeholder="Search statements, excerpts, or Evidence ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <select
          className="form-select"
          style={{ width: "180px" }}
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          <option value="Financial Transaction">Financial Transaction</option>
          <option value="Official Communication">Official Communication</option>
          <option value="Eyewitness Statement">Eyewitness Statement</option>
          <option value="Factual Finding">Factual Finding</option>
        </select>

        <select
          className="form-select"
          style={{ width: "160px" }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Verification</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="flagged">Flagged</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Evidence Table */}
      <DataTable
        columns={columns}
        data={evidenceList}
        isLoading={isLoading}
        pagination={{
          page,
          pages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Evidence Detail & Officer Verification Modal */}
      {selectedEvidence && (
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
            style={{ width: "100%", maxWidth: "680px", backgroundColor: "#ffffff" }}
          >
            <div className="gov-card-header">
              <div>
                <span style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Evidence Record Inspector</span>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#183153" }}>
                  {selectedEvidence._id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvidence(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
              {/* Provenance Box */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "4px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div><b>Document ID:</b> {selectedEvidence.document_id}</div>
                <div><b>Page Reference:</b> Page {selectedEvidence.page_number}</div>
                <div><b>Evidence Category:</b> {selectedEvidence.evidence_category}</div>
                <div><b>Model Confidence:</b> {Math.round((selectedEvidence.confidence || 0) * 100)}%</div>
                <div><b>Created Date:</b> {selectedEvidence.created_at}</div>
                <div><b>Current Status:</b> <StatusBadge status={selectedEvidence.verification_status} /></div>
              </div>

              {/* Exact Source Excerpt */}
              <div className="form-group">
                <label className="form-label">Original Grounded Source Excerpt:</label>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "13.5px",
                    lineHeight: "1.5",
                    color: "#1E293B",
                  }}
                >
                  {selectedEvidence.source_excerpt}
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerifySubmit} style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #E2E8F0" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#183153", marginBottom: "10px" }}>
                  Officer Verification & Audit Decision
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Decision Status</label>
                    <select
                      className="form-select"
                      value={verifyStatus}
                      onChange={(e) => setVerifyStatus(e.target.value)}
                    >
                      <option value="verified">Verified (Confirmed)</option>
                      <option value="flagged">Flagged for Review</option>
                      <option value="rejected">Rejected (Inaccurate)</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Officer Audit Notes</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Corroborated against bank voucher"
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/documents/${selectedEvidence.document_id}`)}
                  >
                    <ExternalLink size={14} /> Open Source Document PDF
                  </button>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedEvidence(null)}
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isVerifying}
                    >
                      Save Verification
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
