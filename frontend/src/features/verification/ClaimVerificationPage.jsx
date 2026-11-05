import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";

export function ClaimVerificationPage() {
  const { briefingId } = useParams();
  const navigate = useNavigate();

  const [briefing, setBriefing] = useState(null);
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState("Supported");
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/briefings/${briefingId}`);
      setBriefing(res.data.briefing);
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
    if (!selectedClaim) return;
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
        <span style={{ fontSize: "12px", color: "#64748B" }}>Briefing ID: <b>{briefingId}</b></span>
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
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Fully Supported</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F766E", marginTop: "4px" }}>{supportedCount}</div>
        </div>
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Partially Supported</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0369A1", marginTop: "4px" }}>{partialCount}</div>
        </div>
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Conflicting Evidence</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#B45309", marginTop: "4px" }}>{conflictCount}</div>
        </div>
        <div className="gov-card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Requires Human Review</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#B91C1C", marginTop: "4px" }}>{unverifiedCount}</div>
        </div>
      </div>

      {/* Claims Table */}
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
              <span style={{ fontSize: "11px", color: "#475569" }}>
                {r.supporting_evidence_ids?.join(", ") || "No Direct Citation"}
              </span>
            ),
          },
          { header: "Verification Status", accessor: "verification_status", width: "160px", render: (r) => <StatusBadge status={r.verification_status} /> },
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
        ]}
        data={claims}
        isLoading={isLoading}
      />

      {/* Verification Drawer / Modal */}
      {selectedClaim && (
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
          <div className="gov-card" style={{ width: "100%", maxWidth: "600px", backgroundColor: "#ffffff" }}>
            <div className="gov-card-header">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#183153" }}>
                Verify Asserted Claim: {selectedClaim._id}
              </h3>
              <button onClick={() => setSelectedClaim(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateClaim} style={{ padding: "20px" }}>
              <div className="form-group">
                <label className="form-label">Asserted Claim Text:</label>
                <div style={{ padding: "12px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", fontSize: "13px", lineHeight: "1.4" }}>
                  "{selectedClaim.claim_text}"
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Evidence IDs:</label>
                <div style={{ fontSize: "12px", color: "#183153", fontWeight: 600 }}>
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
