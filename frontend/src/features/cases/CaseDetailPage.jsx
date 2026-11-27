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
  Languages,
  Trash2,
  X,
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
  const canDeleteCase = canPerformAction(user?.role, ACTIONS.DELETE_CASE);
  const canDeleteDocument = canPerformAction(user?.role, ACTIONS.DELETE_DOCUMENT);

  const [activeTab, setActiveTab] = useState("overview");
  const [caseData, setCaseData] = useState(null);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [events, setEvents] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showDeleteCaseModal, setShowDeleteCaseModal] = useState(false);
  const [caseDeleteConfirmText, setCaseDeleteConfirmText] = useState("");
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [caseDeleteError, setCaseDeleteError] = useState("");

  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [docDeleteError, setDocDeleteError] = useState("");

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

  const handleDeleteCase = async () => {
    if (!canDeleteCase || !caseData) return;
    const inputClean = caseDeleteConfirmText.trim();
    if (inputClean.toUpperCase() !== "DELETE" && inputClean !== caseData.case_reference) {
      setCaseDeleteError(`Please type DELETE or "${caseData.case_reference}" to confirm.`);
      return;
    }
    setIsDeletingCase(true);
    setCaseDeleteError("");
    try {
      await apiClient.delete(`/cases/${caseId}`);
      navigate("/cases");
    } catch (err) {
      setCaseDeleteError(err.response?.data?.detail || "Failed to delete case.");
      setIsDeletingCase(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!canDeleteDocument || !docToDelete) return;
    setIsDeletingDoc(true);
    setDocDeleteError("");
    try {
      await apiClient.delete(`/documents/${docToDelete._id}`);
      setDocToDelete(null);
      // Reload documents and statistics
      const [docsRes, caseRes] = await Promise.all([
        apiClient.get(`/documents?case_id=${caseId}&limit=50`),
        apiClient.get(`/cases/${caseId}`),
      ]);
      setDocuments(docsRes.data.items || []);
      setStats(caseRes.data.statistics);
    } catch (err) {
      setDocDeleteError(err.response?.data?.detail || "Failed to delete document.");
    } finally {
      setIsDeletingDoc(false);
    }
  };

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

            {(canUploadDocument || canGenerateBriefing || canDeleteCase) && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                {canDeleteCase && (
                  <button
                    className="btn btn-secondary"
                    style={{ color: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
                    onClick={() => {
                      setShowDeleteCaseModal(true);
                      setCaseDeleteConfirmText("");
                      setCaseDeleteError("");
                    }}
                    title="Permanently Delete Case (Admin Only)"
                  >
                    <Trash2 size={16} /> Delete Case
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
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/documents/${r._id}`)}
                  >
                    <ExternalLink size={14} /> Open Inspector
                  </button>
                  {canDeleteDocument && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
                      onClick={() => {
                        setDocToDelete(r);
                        setDocDeleteError("");
                      }}
                      title="Permanently Delete Document (Admin Only)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
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
            {
              header: "Verified Statement & Grounded Source Excerpt",
              accessor: "translated_text",
              render: (r) => {
                const primaryText = r.translated_text || r.source_excerpt;
                const hasTranslation = r.translated_text && r.source_excerpt && r.translated_text !== r.source_excerpt;
                return (
                  <div style={{ fontSize: "13px", lineHeight: "1.45" }}>
                    <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                      {primaryText}
                    </div>
                    {hasTranslation && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "12px",
                          color: "var(--color-text-secondary)",
                          backgroundColor: "var(--color-hover)",
                          padding: "5px 8px",
                          borderRadius: "4px",
                          borderLeft: "3px solid var(--color-primary)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, fontSize: "11px", color: "var(--color-primary)", marginBottom: "2px" }}>
                          <Languages size={12} /> Original Source ({r.detected_language ? r.detected_language.toUpperCase() : "Regional Script"}):
                        </div>
                        <div style={{ fontStyle: "normal" }}>{r.source_excerpt}</div>
                      </div>
                    )}
                    {r.associated_entities?.length > 0 && (
                      <div style={{ marginTop: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {r.associated_entities.map((e, idx) => (
                          <span key={idx} className="badge badge-neutral" style={{ fontSize: "10px", padding: "1px 5px" }}>
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              },
            },
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
            {
              header: "Date",
              accessor: "event_date",
              width: "140px",
              render: (r) => (
                <div>
                  <b style={{ color: "var(--color-text-primary)" }}>{r.event_date || r.original_date_expression}</b>
                  {r.original_date_expression && r.event_date && r.original_date_expression !== r.event_date && (
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      {r.original_date_expression}
                    </div>
                  )}
                </div>
              ),
            },
            {
              header: "Event Title",
              accessor: "event_title",
              width: "220px",
              render: (r) => (
                <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {r.event_title || r.title || "Chronological Milestone"}
                </span>
              ),
            },
            {
              header: "Description",
              accessor: "description",
              render: (r) => (
                <div style={{ fontSize: "13px", lineHeight: "1.45", color: "var(--color-text-primary)" }}>
                  {r.description || r.translated_description}
                </div>
              ),
            },
            {
              header: "Entities",
              accessor: "associated_entities",
              width: "180px",
              render: (r) => (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {r.associated_entities?.length > 0
                    ? r.associated_entities.map((ent, idx) => (
                        <span key={idx} className="badge badge-neutral" style={{ fontSize: "11px" }}>
                          {ent}
                        </span>
                      ))
                    : "-"}
                </div>
              ),
            },
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
      {/* Delete Case Confirmation Modal */}
      {showDeleteCaseModal && canDeleteCase && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "520px", borderTop: "4px solid var(--color-red-alert)" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} color="var(--color-red-alert)" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-red-alert)" }}>
                  Permanent Case Purge (Admin Only)
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteCaseModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: "13px", lineHeight: "1.5", color: "var(--color-text-primary)", marginBottom: "14px" }}>
                You are about to permanently delete <b>{caseData.case_reference}</b> (<i>{caseData.title}</i>).
              </div>
              <div
                style={{
                  backgroundColor: "var(--color-hover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "12px",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  marginBottom: "16px",
                  color: "var(--color-text-secondary)",
                }}
              >
                <b style={{ color: "var(--color-red-alert)" }}>Cascading Purge Impact:</b>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  <li>All {documents.length} ingested documents and their pages/chunks</li>
                  <li>All vector embeddings in Qdrant</li>
                  <li>All {evidence.length} structured evidence records & {events.length} chronology events</li>
                  <li>All {briefings.length} briefings, claims, and {contradictions.length} contradictions</li>
                  <li>All original PDF documents and intermediate files on disk</li>
                </ul>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Type <code>DELETE</code> or <code>{caseData.case_reference}</code> to confirm:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type DELETE to confirm"
                  value={caseDeleteConfirmText}
                  onChange={(e) => setCaseDeleteConfirmText(e.target.value)}
                  autoFocus
                />
              </div>
              {caseDeleteError && (
                <div style={{ color: "var(--color-red-alert)", fontSize: "12px", marginTop: "8px" }}>
                  {caseDeleteError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteCaseModal(false)}
                  disabled={isDeletingCase}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
                  onClick={handleDeleteCase}
                  disabled={isDeletingCase || (caseDeleteConfirmText.trim().toUpperCase() !== "DELETE" && caseDeleteConfirmText.trim() !== caseData.case_reference)}
                >
                  {isDeletingCase ? "Purging Case..." : "Permanently Delete Case"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {docToDelete && canDeleteDocument && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "480px", borderTop: "4px solid var(--color-red-alert)" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} color="var(--color-red-alert)" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-red-alert)" }}>
                  Delete Document Artifacts
                </h3>
              </div>
              <button
                onClick={() => setDocToDelete(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-primary)", marginBottom: "14px" }}>
                Permanently purge <b>{docToDelete.document_title || docToDelete._id}</b>?
              </p>
              <div
                style={{
                  backgroundColor: "var(--color-hover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "10px",
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  marginBottom: "16px",
                }}
              >
                This will delete its pages, chunks, Qdrant vector embeddings, extracted evidence records, and storage files on disk.
              </div>
              {docDeleteError && (
                <div style={{ color: "var(--color-red-alert)", fontSize: "12px", marginBottom: "10px" }}>
                  {docDeleteError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDocToDelete(null)}
                  disabled={isDeletingDoc}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
                  onClick={handleDeleteDoc}
                  disabled={isDeletingDoc}
                >
                  {isDeletingDoc ? "Deleting..." : "Delete Document"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
