import React, { useState, useEffect } from "react";
import { AlertTriangle, Download, X } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function ContradictionsPage() {
  const user = useAuthStore((state) => state.user);
  const canReviewContradiction = canPerformAction(user?.role, ACTIONS.REVIEW_CONTRADICTION);

  const [contradictions, setContradictions] = useState([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    if (!canReviewContradiction) return;
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
          style={{ fontWeight: 600, color: "var(--color-amber-warning)", cursor: "pointer" }}
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
          <div style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>{r.explanation}</div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
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
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>Filter Review Status:</span>
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

      <DataTable
        columns={columns}
        data={contradictions}
        isLoading={isLoading}
      />

      {selectedContra && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "880px" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={18} color="var(--color-amber-warning)" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Contradiction Analysis: {selectedContra.contradiction._id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedContra(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "var(--color-amber-bg)",
                  border: "1px solid var(--color-amber-warning)",
                  borderRadius: "4px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-amber-warning)" }}>
                  Identified Conflict: {selectedContra.contradiction.category}
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-primary)", marginTop: "4px" }}>
                  {selectedContra.contradiction.explanation}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div
                  style={{
                    backgroundColor: "var(--color-hover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--color-text-primary)" }}>
                      EXHIBIT A: {selectedContra.evidence_a?._id}
                    </span>
                    <span className="badge badge-neutral">Page {selectedContra.evidence_a?.page_number}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                    Doc: <b>{selectedContra.document_a?.document_title || selectedContra.evidence_a?.document_id}</b>
                  </div>
                  <div
                    style={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      padding: "10px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    "{selectedContra.evidence_a?.translated_text || selectedContra.evidence_a?.source_excerpt}"
                    {selectedContra.evidence_a?.translated_text && selectedContra.evidence_a?.source_excerpt && selectedContra.evidence_a?.translated_text !== selectedContra.evidence_a?.source_excerpt && (
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                        Original: {selectedContra.evidence_a?.source_excerpt}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--color-hover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--color-text-primary)" }}>
                      EXHIBIT B: {selectedContra.evidence_b?._id}
                    </span>
                    <span className="badge badge-neutral">Page {selectedContra.evidence_b?.page_number}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                    Doc: <b>{selectedContra.document_b?.document_title || selectedContra.evidence_b?.document_id}</b>
                  </div>
                  <div
                    style={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      padding: "10px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    "{selectedContra.evidence_b?.translated_text || selectedContra.evidence_b?.source_excerpt}"
                    {selectedContra.evidence_b?.translated_text && selectedContra.evidence_b?.source_excerpt && selectedContra.evidence_b?.translated_text !== selectedContra.evidence_b?.source_excerpt && (
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                        Original: {selectedContra.evidence_b?.source_excerpt}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canReviewContradiction ? (
                <form onSubmit={handleSubmitReview} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                    Official Officer Determination
                  </h4>

                  {errorMsg && (
                    <div style={{ padding: "8px 12px", backgroundColor: "var(--color-red-bg)", color: "var(--color-red-alert)", borderRadius: "4px", fontSize: "12px", marginBottom: "12px" }}>
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
              ) : (
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "12.5px", color: "var(--color-text-secondary)" }}>
                    <b>Status:</b> {selectedContra.contradiction.status}
                    {selectedContra.contradiction.officer_explanation && (
                      <span> — {selectedContra.contradiction.officer_explanation}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedContra(null)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
