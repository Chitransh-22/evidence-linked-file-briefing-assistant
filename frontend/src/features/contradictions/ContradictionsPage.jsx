import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, Search, Download, ExternalLink, X, HelpCircle } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";

export function ContradictionsPage() {
  const navigate = useNavigate();

  const [contradictions, setContradictions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Side-by-side Modal
  const [selectedContra, setSelectedContra] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("Confirmed by officer");
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadContradictions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" });
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiClient.get(`/contradictions?${params.toString()}`);
      setContradictions(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContradictions();
  }, [page, statusFilter]);

  const handleOpenReview = async (item) => {
    try {
      const res = await apiClient.get(`/contradictions/${item._id}`);
      setSelectedContra(res.data);
      setExplanation(item.officer_explanation || "");
      setErrorMsg("");
    } catch (err) {
      alert("Failed to load contradiction details");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setErrorMsg("Officer justification is required for audit compliance.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      await apiClient.post(`/contradictions/${selectedContra.contradiction._id}/review`, {
        status: reviewStatus,
        officer_explanation: explanation.trim(),
      });
      setSelectedContra(null);
      setExplanation("");
      loadContradictions();
    } catch (err) {
      setErrorMsg("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Contradiction ID",
      accessor: "_id",
      width: "160px",
      render: (r) => (
        <span
          style={{ fontWeight: 600, color: "#B45309", cursor: "pointer" }}
          onClick={() => handleOpenReview(r)}
        >
          {r._id}
        </span>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      width: "180px",
      render: (r) => <span className="badge badge-warning">{r.category}</span>,
    },
    {
      header: "AI Explanation of Conflict",
      accessor: "explanation",
      render: (r) => (
        <div>
          <div style={{ fontSize: "13px", color: "#1E293B" }}>{r.explanation}</div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
            Confidence: <b>{Math.round((r.confidence || 0) * 100)}%</b> • Entities: {r.related_entities?.join(", ") || "-"}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      width: "160px",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Actions",
      width: "120px",
      align: "right",
      render: (r) => (
        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenReview(r)}>
          Compare Side-by-Side
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Potential Contradiction Detection & Review</h1>
          <div className="page-subtitle">
            Automated conflict discovery across statements, locations, dates, and disbursement amounts
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => downloadFile(`/contradictions/export/csv`, "contradictions.csv")}
        >
          <Download size={14} /> Export Conflicts CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="gov-card" style={{ padding: "14px 16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "#64748B" }}>Filter Review Status:</span>
        <select
          className="form-select"
          style={{ width: "200px" }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Review Statuses</option>
          <option value="Needs Further Review">Needs Further Review</option>
          <option value="Confirmed by officer">Confirmed by officer</option>
          <option value="Rejected by officer">Rejected by officer</option>
          <option value="Resolved with explanation">Resolved with explanation</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={contradictions}
        isLoading={isLoading}
      />

      {/* Side-by-Side Comparison Modal */}
      {selectedContra && (
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
          <div className="gov-card" style={{ width: "100%", maxWidth: "880px", backgroundColor: "#ffffff" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={18} color="#B45309" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#183153" }}>
                  Contradiction Analysis: {selectedContra.contradiction._id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedContra(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
              {/* Conflict Explanation Banner */}
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #F59E0B",
                  borderRadius: "4px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#B45309" }}>
                  Identified Conflict: {selectedContra.contradiction.category}
                </div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
                  {selectedContra.contradiction.explanation}
                </div>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                {/* Side A */}
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "12px", color: "#183153" }}>
                      EXHIBIT A: {selectedContra.evidence_a?._id}
                    </span>
                    <span className="badge badge-neutral">Page {selectedContra.evidence_a?.page_number}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px" }}>
                    Doc: <b>{selectedContra.document_a?.document_title || selectedContra.evidence_a?.document_id}</b>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #E2E8F0",
                      padding: "10px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "#1E293B",
                    }}
                  >
                    "{selectedContra.evidence_a?.source_excerpt}"
                  </div>
                </div>

                {/* Side B */}
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "12px", color: "#183153" }}>
                      EXHIBIT B: {selectedContra.evidence_b?._id}
                    </span>
                    <span className="badge badge-neutral">Page {selectedContra.evidence_b?.page_number}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px" }}>
                    Doc: <b>{selectedContra.document_b?.document_title || selectedContra.evidence_b?.document_id}</b>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #E2E8F0",
                      padding: "10px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "#1E293B",
                    }}
                  >
                    "{selectedContra.evidence_b?.source_excerpt}"
                  </div>
                </div>
              </div>

              {/* Review & Resolution Form */}
              <form onSubmit={handleSubmitReview} style={{ borderTop: "1px solid #E2E8F0", paddingTop: "16px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#183153", marginBottom: "10px" }}>
                  Official Officer Determination
                </h4>

                {errorMsg && (
                  <div style={{ padding: "8px 12px", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "4px", fontSize: "12px", marginBottom: "12px" }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Review Status Decision</label>
                  <select
                    className="form-select"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                  >
                    <option value="Confirmed by officer">Confirmed by officer (Genuine Discrepancy)</option>
                    <option value="Rejected by officer">Rejected by officer (No Conflict / Different Scope)</option>
                    <option value="Needs further review">Needs further review (Requires External Inquiries)</option>
                    <option value="Resolved with explanation">Resolved with explanation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Official Justification / Officer Explanation *</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Provide mandatory operational justification for this determination..."
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedContra(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    Record Review Decision
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
