import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileSignature, CheckSquare, Square, Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/api/client";

const STANDARD_SECTIONS = [
  "Executive Summary",
  "Background",
  "Scope of Review",
  "Documents Reviewed",
  "Key Persons and Organizations",
  "Important Dates and Events",
  "Chronology",
  "Important Evidence Findings",
  "Potential Contradictions",
  "Unresolved Questions",
  "Supporting Evidence References",
  "Limitations and Information Gaps",
  "Conclusion or Summary of Findings",
  "Annexures and Source References",
];

export function BriefingGeneratePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [stats, setStats] = useState(null);
  const [title, setTitle] = useState("");
  const [selectedSections, setSelectedSections] = useState(STANDARD_SECTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCaseData() {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/cases/${caseId}`);
        setCaseData(res.data.case);
        setStats(res.data.statistics);
        setTitle(`Official Investigation Briefing - ${res.data.case.case_reference}`);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCaseData();
  }, [caseId]);

  const toggleSection = (sec) => {
    if (selectedSections.includes(sec)) {
      setSelectedSections(selectedSections.filter(s => s !== sec));
    } else {
      setSelectedSections([...selectedSections, sec]);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (selectedSections.length === 0) {
      alert("Please select at least one briefing section to compile.");
      return;
    }
    setIsGenerating(true);

    try {
      const res = await apiClient.post("/briefings/generate", {
        case_id: caseId,
        title: title.trim(),
        selected_sections: selectedSections,
      });

      const briefing = res.data.briefing;
      // Navigate directly to the Officer Review Workspace
      navigate(`/briefings/${briefing._id}/review`);
    } catch (err) {
      alert("Briefing generation failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: "40px", color: "#64748B" }}>Loading case intelligence readiness...</div>;
  }

  if (!caseData) {
    return <div style={{ padding: "40px", color: "#B91C1C" }}>Case file not found.</div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/cases/${caseId}`)} style={{ marginBottom: "16px" }}>
        <ArrowLeft size={14} /> Back to Case Workspace
      </button>

      <div className="gov-card" style={{ marginBottom: "20px" }}>
        <div className="gov-card-header">
          <div>
            <span style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>AI-Assisted Synthesis</span>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#183153" }}>
              Investigation Briefing Generator
            </h2>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div style={{ padding: "20px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#183153", marginBottom: "12px" }}>
            Case Intelligence Synthesis Readiness
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", fontSize: "12px" }}>
            <div style={{ padding: "10px", backgroundColor: "#ffffff", border: "1px solid #CBD5E1", borderRadius: "4px" }}>
              <div style={{ color: "#64748B" }}>Available Documents</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#183153" }}>{stats?.documents || 0}</div>
            </div>
            <div style={{ padding: "10px", backgroundColor: "#ffffff", border: "1px solid #CBD5E1", borderRadius: "4px" }}>
              <div style={{ color: "#64748B" }}>Evidence Ledger Records</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#183153" }}>{stats?.evidence_records || 0}</div>
            </div>
            <div style={{ padding: "10px", backgroundColor: "#ffffff", border: "1px solid #CBD5E1", borderRadius: "4px" }}>
              <div style={{ color: "#64748B" }}>Chronological Milestones</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#183153" }}>{stats?.events || 0}</div>
            </div>
          </div>

          <div style={{ marginTop: "12px", fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertCircle size={14} />
            <span>
              Briefings are synthesized strictly from retrieved evidence and chronological records. Legal determinations or guilt are never autonomously decided.
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} style={{ padding: "24px" }}>
          <div className="form-group">
            <label className="form-label">Briefing Document Title *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: "20px" }}>
            <label className="form-label" style={{ marginBottom: "10px" }}>
              Select Approved Briefing Sections to Compile:
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                backgroundColor: "#F8FAFC",
                padding: "16px",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
              }}
            >
              {STANDARD_SECTIONS.map((sec, idx) => {
                const checked = selectedSections.includes(sec);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleSection(sec)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: checked ? "#183153" : "#64748B",
                      fontWeight: checked ? 600 : 400,
                    }}
                  >
                    {checked ? <CheckSquare size={16} color="#183153" /> : <Square size={16} color="#94A3B8" />}
                    <span>{sec}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/cases/${caseId}`)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGenerating || selectedSections.length === 0}
            >
              {isGenerating ? "Compiling Intelligence Draft..." : "Synthesize Investigation Briefing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
