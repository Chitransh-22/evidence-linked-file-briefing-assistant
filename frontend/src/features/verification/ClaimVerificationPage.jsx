import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function ClaimVerificationPage() {
  const { briefingId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canVerifyClaims = canPerformAction(user?.role, ACTIONS.VERIFY_CLAIMS);

  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState("Supported");
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/briefings/${briefingId}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [briefingId]);

  const handleUpdateClaim = async (e) => {
    e.preventDefault();
    if (!selectedClaim || !canVerifyClaims) return;
    try {
      await apiClient.post(`/briefings/${briefingId}/verify`, {
        claim_id: selectedClaim._id,
        verification_status: verifyStatus,
        verification_explanation: explanation,
      });
      setSelectedClaim(null);
      setExplanation("");
      loadData();
    } catch (err) {
      alert("Failed to update claim verification");
    }
  };

  const supportedCount = claims.filter(c => c.verification_status === "Supported").length;
  const partialCount = claims.filter(c => c.verification_status === "Partially Supported").length;
  const conflictCount = claims.filter(c => c.verification_status === "Conflicting Evidence").length;
  const unverifiedCount = claims.filter(c => c.verification_status === "Requires Human Review" || c.verification_status === "Unsupported").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/briefings/${briefingId}/review`)}>
          <ArrowLeft size={14} /> Back to Briefing Review
        </button>
        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Briefing ID: <b>{briefingId}</b></span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Independent Factual Claim Verification</h1>
          <div className="page-subtitle">
            Every factual claim asserted in the briefing must be traceable to primary evidence
          </div>
        </div>
      </div>

      {/* Summary Scorecard */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Fully Supported</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-teal-positive)", marginTop: "4px" }}>{supportedCount}</div>
        </div>
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Partially Supported</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-blue-info)", marginTop: "4px" }}>{partialCount}</div>
        </div>
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Conflicting Evidence</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-amber-warning)", marginTop: "4px" }}>{conflictCount}</div>
        </div>
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Requires Human Review</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-red-alert)", marginTop: "4px" }}>{unverifiedCount}</div>
        </div>
      </div>

      <DataTable
        columns={[
          { header: "Claim ID", accessor: "_id", width: "130px", render: (r) => <b>{r._id}</b> },
          { header: "Asserted Statement", accessor: "claim_text", render: (r) => <span style={{ fontSize: "13px" }}>{r.claim_text}</span> },
          { header: "Citation Status", accessor: "citation_status", width: "130px", render: (r) => <span className="badge badge-info">{r.citation_status}</span> },
          {
            header: "Evidence Provenance",
            accessor: "supporting_evidence_ids",
            width: "150px",
            render: (r) => (
              <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                {r.supporting_evidence_ids?.join(", ") || "No Direct Citation"}
              </span>
            ),
          },
          { header: "Verification Status", accessor: "verification_status", width: "160px", render: (r) => <StatusBadge status={r.verification_status} /> },
          ...(canVerifyClaims
            ? [
                {
                  header: "Action",
                  width: "110px",
                  align: "right",
                  render: (r) => (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedClaim(r);
                        setVerifyStatus(r.verification_status);
                        setExplanation(r.verification_explanation || "");
                      }}
                    >
                      Inspect
                    </button>
                  ),
                },
              ]
            : []),
        ]}
        data={claims}
        isLoading={isLoading}
      />

      {selectedClaim && canVerifyClaims && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "600px" }}>
            <div className="gov-card-header">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                Verify Asserted Claim: {selectedClaim._id}
              </h3>
              <button onClick={() => setSelectedClaim(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateClaim} style={{ padding: "20px" }}>
              <div className="form-group">
                <label className="form-label">Asserted Claim Text:</label>
                <div style={{ padding: "12px", backgroundColor: "var(--color-hover)", border: "1px solid var(--color-border)", borderRadius: "4px", fontSize: "13px", lineHeight: "1.4" }}>
                  "{selectedClaim.claim_text}"
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Evidence IDs:</label>
                <div style={{ fontSize: "12px", color: "var(--color-primary-accessible)", fontWeight: 600 }}>
                  {selectedClaim.supporting_evidence_ids?.join(", ") || "None"}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Verification Decision Status</label>
                <select
                  className="form-select"
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value)}
                >
                  <option value="Supported">Supported (Evidence Matches Directly)</option>
                  <option value="Partially Supported">Partially Supported (Context Missing)</option>
                  <option value="Conflicting Evidence">Conflicting Evidence (Contradiction Found)</option>
                  <option value="Unsupported">Unsupported (No Source Citation)</option>
                  <option value="Requires Human Review">Requires Human Review</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Verification Audit Explanation</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Officer rationale for this claim verification decision..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedClaim(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Claim Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
