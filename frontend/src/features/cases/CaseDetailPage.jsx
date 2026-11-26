import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  BookOpen,
  Calendar,
  AlertTriangle,
  FileSignature,
  UploadCloud,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const canUploadDocument = canPerformAction(user?.role, ACTIONS.UPLOAD_DOCUMENT);
  const canGenerateBriefing = canPerformAction(user?.role, ACTIONS.GENERATE_BRIEFING);
  const canViewBriefings = canPerformAction(user?.role, ACTIONS.VIEW_BRIEFINGS);
  const canVerifyClaims = canPerformAction(user?.role, ACTIONS.VERIFY_CLAIMS);

  const [activeTab, setActiveTab] = useState("overview");
  const [caseData, setCaseData] = useState(null);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [events, setEvents] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCaseWorkspace() {
      setIsLoading(true);
      try {
        const [caseRes, docsRes, evRes, evtRes, contraRes, brfRes] = await Promise.all([
          apiClient.get(`/cases/${caseId}`),
          apiClient.get(`/documents?case_id=${caseId}&limit=50`),
          apiClient.get(`/evidence?case_id=${caseId}&limit=50`),
          apiClient.get(`/events?case_id=${caseId}&limit=50`),
          apiClient.get(`/contradictions?case_id=${caseId}&limit=50`),
          canViewBriefings ? apiClient.get(`/briefings?case_id=${caseId}&limit=50`) : Promise.resolve({ data: { items: [] } }),
        ]);

        setCaseData(caseRes.data.case);
        setStats(caseRes.data.statistics);
        setDocuments(docsRes.data.items || []);
        setEvidence(evRes.data.items || []);
        setEvents(evtRes.data.items || []);
        setContradictions(contraRes.data.items || []);
        setBriefings(brfRes.data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCaseWorkspace();
  }, [caseId, canViewBriefings]);

  if (isLoading) {
    return <div style={{ padding: "40px", color: "var(--color-text-secondary)" }}>Loading case workspace...</div>;
  }

  if (!caseData) {
    return <div style={{ padding: "40px", color: "var(--color-red-alert)" }}>Case file not found or access denied.</div>;
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: FolderKanban },
    { id: "documents", label: `Documents (${documents.length})`, icon: FileText },
    { id: "evidence", label: `Evidence (${evidence.length})`, icon: BookOpen },
    { id: "chronology", label: `Chronology (${events.length})`, icon: Calendar },
    { id: "contradictions", label: `Contradictions (${contradictions.length})`, icon: AlertTriangle },
    ...(canViewBriefings ? [{ id: "briefings", label: `Briefings (${briefings.length})`, icon: FileSignature }] : []),
  ];

  return (
    <div>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => navigate("/cases")}
        style={{ marginBottom: "16px" }}
      >
        <ArrowLeft size={14} /> Back to Case Register
      </button>

      {/* Case Header Card */}
      <div className="gov-card" style={{ marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                  {caseData.case_reference}
                </span>
                <StatusBadge status={caseData.status} />
                <span className="badge badge-neutral">Priority: {caseData.priority}</span>
              </div>
              <h1 style={{ fontSize: "20px", color: "var(--color-text-primary)", marginTop: "8px", fontWeight: 700 }}>
                {caseData.title}
              </h1>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                Category: <b>{caseData.category}</b> • Officers: <b>{caseData.assigned_officers?.join(", ") || "Unassigned"}</b> • Opened: <b>{caseData.created_at?.slice(0, 10)}</b>
              </div>
            </div>

            {(canUploadDocument || canGenerateBriefing) && (
              <div style={{ display: "flex", gap: "8px" }}>
                {canUploadDocument && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/intake?caseId=${caseId}`)}
                  >
                    <UploadCloud size={16} /> Upload Document
                  </button>
                )}
                {canGenerateBriefing && (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/briefings/generate/${caseId}`)}
                  >
                    <FileSignature size={16} /> Generate Briefing
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Documents Ingested</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>{stats?.documents || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Evidence Records</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>{stats?.evidence_records || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Chronological Events</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>{stats?.events || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Contradictions</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: stats?.contradictions > 0 ? "var(--color-amber-warning)" : "var(--color-teal-positive)" }}>
                {stats?.contradictions || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Briefing Status</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", marginTop: "2px" }}>
                <StatusBadge status={stats?.latest_briefing_status || "Pending"} />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-hover)", padding: "0 16px", overflowX: "auto" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "12px 16px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  background: isActive ? "var(--color-surface)" : "none",
                  border: "none",
                  borderBottom: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={15} style={{ color: isActive ? "var(--color-primary)" : "inherit" }} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Case Scope & Narrative</h3>
            </div>
            <div className="gov-card-body">
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--color-text-primary)" }}>
                {caseData.description || "No detailed narrative provided for this case record."}
              </p>
              {caseData.tags?.length > 0 && (
                <div style={{ marginTop: "16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {caseData.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-neutral">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Investigative Milestones</h3>
            </div>
            <div className="gov-card-body" style={{ fontSize: "13px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} color="var(--color-teal-positive)" />
                  <span>Case opened and authorized officers assigned</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} color={documents.length > 0 ? "var(--color-teal-positive)" : "var(--color-text-muted)"} />
                  <span>{documents.length} evidentiary PDF documents ingested</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} color={evidence.length > 0 ? "var(--color-teal-positive)" : "var(--color-text-muted)"} />
                  <span>{evidence.length} structured statements in Evidence Ledger</span>
                </div>
                {canViewBriefings && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle size={16} color={briefings.length > 0 ? "var(--color-teal-positive)" : "var(--color-text-muted)"} />
                    <span>Investigation Briefing generation</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <DataTable
          columns={[
            { header: "Document Title", accessor: "document_title", render: (r) => <b>{r.document_title}</b> },
            { header: "Original File", accessor: "original_filename" },
            { header: "Language", accessor: "language", render: (r) => <span className="badge badge-neutral">{r.language?.toUpperCase() || "ENG"}</span> },
            { header: "Pages", accessor: "page_count", align: "center" },
            { header: "Status", accessor: "processing_status", render: (r) => <StatusBadge status={r.processing_status} /> },
            {
              header: "Action",
              render: (r) => (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/documents/${r._id}`)}
                >
                  <ExternalLink size={14} /> Open Inspector
                </button>
              ),
            },
          ]}
          data={documents}
        />
      )}

      {activeTab === "evidence" && (
        <DataTable
          columns={[
            { header: "Evidence ID", accessor: "_id", width: "130px", render: (r) => <span style={{ fontWeight: 600 }}>{r._id}</span> },
            { header: "Category", accessor: "evidence_category", width: "160px" },
            { header: "Statement / Excerpt", accessor: "source_excerpt", render: (r) => <span style={{ fontSize: "13px" }}>{r.source_excerpt}</span> },
            { header: "Page", accessor: "page_number", width: "70px", align: "center" },
            { header: "Confidence", accessor: "confidence", width: "90px", align: "center", render: (r) => `${Math.round((r.confidence || 0) * 100)}%` },
            { header: "Status", accessor: "verification_status", width: "120px", render: (r) => <StatusBadge status={r.verification_status} /> },
          ]}
          data={evidence}
        />
      )}

      {activeTab === "chronology" && (
        <DataTable
          columns={[
            { header: "Date", accessor: "event_date", width: "130px", render: (r) => <b>{r.event_date || r.original_date_expression}</b> },
            { header: "Event Title", accessor: "event_title", render: (r) => <span style={{ fontWeight: 600 }}>{r.event_title}</span> },
            { header: "Description", accessor: "description" },
            { header: "Entities", accessor: "associated_entities", render: (r) => r.associated_entities?.join(", ") || "-" },
            { header: "Status", accessor: "review_status", width: "120px", render: (r) => <StatusBadge status={r.review_status} /> },
          ]}
          data={events}
        />
      )}

      {activeTab === "contradictions" && (
        <DataTable
          columns={[
            { header: "ID", accessor: "_id", width: "140px" },
            { header: "Category", accessor: "category", width: "160px", render: (r) => <b style={{ color: "var(--color-amber-warning)" }}>{r.category}</b> },
            { header: "Explanation", accessor: "explanation" },
            { header: "Status", accessor: "status", width: "140px", render: (r) => <StatusBadge status={r.status} /> },
            {
              header: "Action",
              render: () => (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate("/contradictions")}
                >
                  Inspect Conflict
                </button>
              ),
            },
          ]}
          data={contradictions}
        />
      )}

      {activeTab === "briefings" && canViewBriefings && (
        <DataTable
          columns={[
            { header: "Briefing ID", accessor: "_id", width: "140px", render: (r) => <b>{r._id}</b> },
            { header: "Title", accessor: "title" },
            { header: "Version", accessor: "version", align: "center", width: "80px", render: (r) => `v${r.version}` },
            { header: "Prepared By", accessor: "created_by", width: "130px" },
            { header: "Status", accessor: "status", width: "120px", render: (r) => <StatusBadge status={r.status} /> },
            {
              header: "Actions",
              render: (r) => (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/briefings/${r._id}/review`)}
                  >
                    Open Review
                  </button>
                  {canVerifyClaims && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/briefings/${r._id}/verification`)}
                    >
                      Verify Claims
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={briefings}
        />
      )}
    </div>
  );
}
