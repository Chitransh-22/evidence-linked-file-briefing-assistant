import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileSignature,
  Save,
  Send,
  Download,
  RotateCcw,
  CheckCircle,
  FileCheck,
  ArrowLeft,
  Clock,
  History,
  AlertCircle,
} from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";

export function OfficerReviewPage() {
  const { briefingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [briefing, setBriefing] = useState(null);
  const [sectionData, setSectionData] = useState({});
  const [activeSection, setActiveSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadBriefing = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/briefings/${briefingId}`);
      const b = res.data.briefing;
      setBriefing(b);
      setSectionData(b.section_data || {});
      const secKeys = Object.keys(b.section_data || {});
      if (secKeys.length > 0 && !activeSection) {
        setActiveSection(secKeys[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing();
  }, [briefingId]);

  const handleSectionTextChange = (secName, val) => {
    setSectionData(prev => ({ ...prev, [secName]: val }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveConfirmation("");
    try {
      await apiClient.patch(`/briefings/${briefingId}`, {
        section_data: sectionData,
        change_note: "Manual revision by officer in review workspace",
      });
      setSaveConfirmation("Briefing draft saved successfully.");
      setTimeout(() => setSaveConfirmation(""), 3000);
    } catch (err) {
      alert("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateCurrentSection = async () => {
    if (!activeSection) return;
    const confirmRegen = window.confirm(`Regenerate section "${activeSection}" from retrieved evidence? Your edits in other sections will be preserved.`);
    if (!confirmRegen) return;

    setIsRegenerating(true);
    try {
      const res = await apiClient.post(`/briefings/${briefingId}/regenerate-section`, {
        section_name: activeSection,
      });
      setSectionData(prev => ({ ...prev, [activeSection]: res.data.content }));
      setSaveConfirmation(`Section "${activeSection}" regenerated.`);
      setTimeout(() => setSaveConfirmation(""), 3000);
    } catch (err) {
      alert("Failed to regenerate section");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSubmitForReview = async () => {
    const confirmSubmit = window.confirm("Submit this briefing to the Supervisory Review Commissioner for official sign-off?");
    if (!confirmSubmit) return;

    try {
      await handleSaveDraft();
      await apiClient.post(`/briefings/${briefingId}/submit-review`);
      alert("Briefing submitted for supervisory review.");
      navigate("/briefings");
    } catch (err) {
      alert("Failed to submit briefing");
    }
  };

  if (isLoading) {
    return <div style={{ padding: "40px", color: "#64748B" }}>Loading officer review workspace...</div>;
  }

  if (!briefing) {
    return <div style={{ padding: "40px", color: "#B91C1C" }}>Briefing record not found.</div>;
  }

  const sectionsList = Object.keys(sectionData);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "12px",
          borderBottom: "1px solid #D8DEE7",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/briefings")}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#183153" }}>
                {briefing.title}
              </h2>
              <span className="badge badge-info">v{briefing.version}</span>
              <StatusBadge status={briefing.status} />
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              Case: <b>{briefing.case_reference}</b> • Prepared By: <b>{briefing.created_by}</b>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {saveConfirmation && (
            <span style={{ fontSize: "12px", color: "#0F766E", fontWeight: 600 }}>
              ✓ {saveConfirmation}
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/briefings/${briefingId}/verification`)}
          >
            <FileCheck size={14} /> Claim Verification Workspace
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => downloadFile(`/briefings/${briefingId}/export/pdf`, `Briefing_${briefing?.case_reference || briefingId}.pdf`)}
          >
            <Download size={14} /> Export PDF
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save Draft"}
          </button>
          {briefing.status === "Draft" && (
            <button className="btn btn-primary btn-sm" onClick={handleSubmitForReview}>
              <Send size={14} /> Submit for Review
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Editing Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1.4fr 300px", gap: "16px", flex: 1, overflow: "hidden" }}>
        {/* Left: Section Navigation */}
        <div className="gov-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="gov-card-header" style={{ padding: "10px 14px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#183153", textTransform: "uppercase" }}>
              Briefing Sections
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {sectionsList.map((secName, idx) => {
              const isActive = activeSection === secName;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveSection(secName)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: isActive ? "#183153" : "transparent",
                    color: isActive ? "#ffffff" : "#334155",
                    fontSize: "12.5px",
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    marginBottom: "4px",
                    lineHeight: "1.3",
                  }}
                >
                  {secName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Editable Section Content */}
        <div className="gov-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 18px",
              backgroundColor: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#183153" }}>
              {activeSection}
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRegenerateCurrentSection}
              disabled={isRegenerating}
            >
              <RotateCcw size={13} /> {isRegenerating ? "Regenerating..." : "Regenerate Section"}
            </button>
          </div>

          <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column" }}>
            <textarea
              style={{
                flex: 1,
                width: "100%",
                padding: "16px",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                fontFamily: "var(--font-family-sans)",
                fontSize: "13.5px",
                lineHeight: "1.6",
                color: "#1E293B",
                resize: "none",
                outline: "none",
              }}
              value={sectionData[activeSection] || ""}
              onChange={(e) => handleSectionTextChange(activeSection, e.target.value)}
              placeholder="Enter section narrative or edit AI-synthesized draft..."
            />
          </div>
        </div>

        {/* Right: Revision History & Audit Log */}
        <div className="gov-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="gov-card-header" style={{ padding: "10px 14px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#183153", textTransform: "uppercase" }}>
              Audit & Revision History
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", fontSize: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(briefing.change_history || []).map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#183153" }}>{ch.action}</div>
                  <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>
                    Officer: <b>{ch.user_id}</b> • {ch.timestamp?.slice(0, 16).replace("T", " ")}
                  </div>
                  {ch.note && (
                    <div style={{ color: "#334155", marginTop: "4px", fontStyle: "italic" }}>
                      "{ch.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
