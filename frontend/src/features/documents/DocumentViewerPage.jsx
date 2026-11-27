import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  AlertTriangle,
  Languages,
  ArrowLeft,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { apiClient, getAuthenticatedUrl, downloadFile } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function DocumentViewerPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canDeleteDocument = canPerformAction(user?.role, ACTIONS.DELETE_DOCUMENT);

  const [document, setDocument] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [activeTab, setActiveTab] = useState("normalized");
  const [evidenceList, setEvidenceList] = useState([]);
  const [entitiesList, setEntitiesList] = useState([]);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteDocument = async () => {
    if (!canDeleteDocument || !document) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await apiClient.delete(`/documents/${documentId}`);
      navigate("/documents");
    } catch (err) {
      setDeleteError(err.response?.data?.detail || "Failed to delete document.");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function loadDocumentData() {
      setIsLoading(true);
      try {
        const [docRes, pagesRes, evRes, entRes] = await Promise.all([
          apiClient.get(`/documents/${documentId}`),
          apiClient.get(`/documents/${documentId}/pages`),
          apiClient.get(`/evidence?document_id=${documentId}&limit=50`),
          apiClient.get(`/entities?document_id=${documentId}&limit=100`),
        ]);

        setDocument(docRes.data);
        const pList = pagesRes.data.pages || [];
        setPages(pList);
        setEvidenceList(evRes.data.items || []);
        setEntitiesList(entRes.data.items || []);
      } catch (err) {
        console.error("Failed to load document metadata:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocumentData();
  }, [documentId]);

  useEffect(() => {
    let activeUrl = null;
    let isCancelled = false;

    async function loadPdfBlob() {
      if (!documentId) return;
      setIsPdfLoading(true);
      try {
        const res = await apiClient.get(`/documents/${documentId}/original`, {
          responseType: "blob",
        });
        if (!isCancelled) {
          const blob = new Blob([res.data], { type: "application/pdf" });
          activeUrl = window.URL.createObjectURL(blob);
          setPdfBlobUrl(activeUrl);
        }
      } catch (err) {
        console.warn("Could not load PDF blob, falling back to authenticated stream URL:", err);
      } finally {
        if (!isCancelled) {
          setIsPdfLoading(false);
        }
      }
    }

    loadPdfBlob();

    return () => {
      isCancelled = true;
      if (activeUrl) {
        window.URL.revokeObjectURL(activeUrl);
      }
    };
  }, [documentId]);

  if (isLoading) {
    return <div style={{ padding: "40px", color: "var(--color-text-secondary)" }}>Loading document inspection workspace...</div>;
  }

  if (!document) {
    return <div style={{ padding: "40px", color: "var(--color-red-alert)" }}>Document not found.</div>;
  }

  const currentPage = pages.find((p) => p.page_number === currentPageNum) || pages[0] || {};
  const pdfStreamUrl = pdfBlobUrl
    ? `${pdfBlobUrl}#page=${currentPageNum}`
    : getAuthenticatedUrl(`/documents/${documentId}/original#page=${currentPageNum}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/documents")}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                {document.document_title}
              </h2>
              <StatusBadge status={document.processing_status} />
              <span className="badge badge-neutral">Doc ID: {document._id}</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Case: <b>{document.case_reference || document.case_id}</b> • SHA-256: <code>{document.sha256?.slice(0, 16)}...</code> • Classification: <b>{document.classification}</b>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => downloadFile(`/documents/${documentId}/original`, document.original_filename || `${document.document_title || "document"}.pdf`)}
          >
            <Download size={14} /> Download Original
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/cases/${document.case_id}`)}
          >
            Open Case Workspace &rarr;
          </button>
          {canDeleteDocument && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError("");
              }}
              title="Permanently Delete Document (Admin Only)"
            >
              <Trash2 size={14} /> Delete Document
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Split Inspection Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "16px", flex: 1, overflow: "hidden" }}>
        {/* Left Column: PDF Viewer */}
        <div className="gov-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* PDF Viewer Controls Header */}
          <div
            style={{
              padding: "8px 14px",
              backgroundColor: "var(--color-hover)",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPageNum <= 1}
                onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: "12px", color: "var(--color-text-primary)", fontWeight: 600 }}>
                Page {currentPageNum} of {pages.length || 1}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPageNum >= pages.length}
                onClick={() => setCurrentPageNum(p => Math.min(pages.length, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.max(70, z - 10))}>
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: "12px", minWidth: "40px", textAlign: "center" }}>{zoom}%</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.min(180, z + 10))}>
                <ZoomIn size={14} />
              </button>
            </div>
          </div>

          {/* Embedded Viewer Canvas */}
          <div style={{ flex: 1, backgroundColor: "var(--color-border)", overflow: "hidden", position: "relative" }}>
            {isPdfLoading && !pdfBlobUrl ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--color-text-secondary)",
                  fontSize: "13px",
                  gap: "10px",
                }}
              >
                <Loader2 size={24} className="spin" style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
                <span>Loading authenticated PDF stream...</span>
              </div>
            ) : (
              <iframe
                src={pdfStreamUrl}
                title="Official PDF Document Viewer"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Tabbed Content & Extraction Details */}
        <div className="gov-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Extraction Tabs */}
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--color-hover)",
              borderBottom: "1px solid var(--color-border)",
              overflowX: "auto",
              padding: "0 8px",
            }}
          >
            {[
              { id: "normalized", label: "Normalized Text" },
              { id: "translated", label: "Translation" },
              { id: "original", label: "Original / OCR" },
              { id: "entities", label: `Entities (${entitiesList.length})` },
              { id: "evidence", label: `Evidence Records (${evidenceList.length})` },
              { id: "pipeline", label: "Processing Audit" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    background: isActive ? "var(--color-surface)" : "none",
                    border: "none",
                    borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {activeTab === "normalized" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    Unicode Normalized • Page {currentPageNum}
                  </span>
                  <span className="badge badge-neutral">Detected: {currentPage.detected_language?.toUpperCase() || "ENG"}</span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-family-mono)",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    backgroundColor: "var(--color-hover)",
                    padding: "16px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    whiteSpace: "pre-wrap",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {currentPage.normalized_text || "No normalized text extracted for this page."}
                </div>
              </div>
            )}

            {activeTab === "translated" && (
              <div>
                <div
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "var(--color-blue-bg)",
                    border: "1px solid rgba(3, 105, 161, 0.3)",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "var(--color-blue-info)",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Languages size={16} />
                  <span>
                    <b>IndicTrans2 Route:</b> {currentPage.detected_language === "eng" ? "English Bypass Active (Source retained)" : "Translated via IndicTrans2 Gujarati/Hindi Model"}
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-family-sans)",
                    fontSize: "13.5px",
                    lineHeight: "1.6",
                    backgroundColor: "var(--color-surface)",
                    padding: "16px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    whiteSpace: "pre-wrap",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {currentPage.translated_text || currentPage.normalized_text || "No translation output available."}
                </div>
              </div>
            )}

            {activeTab === "original" && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                  Extraction Method: <b>{currentPage.extraction_method || "Digital PyMuPDF"}</b> • OCR Confidence: <b>{currentPage.ocr_confidence || 100}%</b>
                </div>
                {currentPage.layout_metadata?.ocr_warning && (
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--color-amber-bg)",
                      color: "var(--color-amber-warning)",
                      borderRadius: "4px",
                      fontSize: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <AlertTriangle size={14} style={{ display: "inline", marginRight: "6px" }} />
                    {currentPage.layout_metadata.ocr_warning}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: "var(--font-family-mono)",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    backgroundColor: "var(--color-hover)",
                    padding: "14px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    whiteSpace: "pre-wrap",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {currentPage.original_text || currentPage.ocr_text || "Raw text empty."}
                </div>
              </div>
            )}

            {activeTab === "entities" && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "12px" }}>
                  Named Entities identified in this document:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {entitiesList.map((ent) => (
                    <div
                      key={ent.id || ent._id}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--color-hover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-text-primary)" }}>
                          {ent.entity_name}
                        </span>
                        <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                          Occurrences: {ent.occurrence_count || ent.source_occurrences?.length || 1}
                        </div>
                      </div>
                      <span className="badge badge-info">{ent.entity_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "evidence" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {evidenceList.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "13px" }}>
                    No extracted evidence records linked to this document.
                  </div>
                ) : (
                  evidenceList.map((ev) => {
                    const primaryText = ev.translated_text || ev.source_excerpt;
                    const hasTranslation = ev.translated_text && ev.source_excerpt && ev.translated_text !== ev.source_excerpt;
                    return (
                      <div
                        key={ev._id}
                        style={{
                          padding: "14px",
                          border: "1px solid var(--color-border)",
                          borderRadius: "4px",
                          backgroundColor: "var(--color-surface)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--color-text-primary)" }}>
                            {ev._id} • Page {ev.page_number}
                          </span>
                          <StatusBadge status={ev.verification_status} />
                        </div>
                        <div style={{ fontSize: "13.5px", fontWeight: 500, marginTop: "8px", color: "var(--color-text-primary)", lineHeight: "1.45" }}>
                          {primaryText}
                        </div>
                        {hasTranslation && (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "12px",
                              color: "var(--color-text-secondary)",
                              backgroundColor: "var(--color-hover)",
                              padding: "6px 10px",
                              borderRadius: "4px",
                              borderLeft: "3px solid var(--color-primary)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, fontSize: "11px", color: "var(--color-primary)", marginBottom: "3px" }}>
                              <Languages size={12} /> Grounded Original Script ({ev.detected_language ? ev.detected_language.toUpperCase() : "Regional"}):
                            </div>
                            <div>{ev.source_excerpt}</div>
                          </div>
                        )}
                        {ev.associated_entities?.length > 0 && (
                          <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {ev.associated_entities.map((e, idx) => (
                              <span key={idx} className="badge badge-neutral" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-secondary)", paddingTop: "8px", borderTop: "1px solid var(--color-border)" }}>
                          <span>Category: <b>{ev.evidence_category}</b></span>
                          <span>Confidence: <b>{Math.round((ev.confidence || 0) * 100)}%</b></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "pipeline" && (
              <div style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>
                <h4 style={{ fontSize: "13px", marginBottom: "8px" }}>Ingestion Provenance</h4>
                <div style={{ backgroundColor: "var(--color-hover)", padding: "12px", border: "1px solid var(--color-border)", borderRadius: "4px" }}>
                  <div><b>File Size:</b> {document.file_size} bytes</div>
                  <div><b>Storage Key:</b> {document.storage_key}</div>
                  <div><b>SHA-256:</b> <code>{document.sha256}</code></div>
                  <div><b>Page Count:</b> {document.page_count}</div>
                  <div><b>Ingested By:</b> {document.created_by}</div>
                  <div><b>Timestamp:</b> {document.created_at}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Document Confirmation Modal */}
      {showDeleteModal && canDeleteDocument && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "480px", borderTop: "4px solid var(--color-red-alert)" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} color="var(--color-red-alert)" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-red-alert)" }}>
                  Permanently Delete Document
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-primary)", marginBottom: "14px" }}>
                Are you sure you want to permanently delete document: <br />
                <b>{document.document_title || documentId}</b>?
              </p>
              <div
                style={{
                  backgroundColor: "var(--color-hover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "10px",
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  lineHeight: "1.5",
                  marginBottom: "16px",
                }}
              >
                <b style={{ color: "var(--color-red-alert)" }}>Cascading Purge:</b>
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li>All extracted pages, sections, and chunks</li>
                  <li>All Qdrant vector embeddings associated with this document</li>
                  <li>All extracted evidence records & dependent chronology events</li>
                  <li>Physical PDF file and intermediate artifacts on disk</li>
                </ul>
              </div>
              {deleteError && (
                <div style={{ color: "var(--color-red-alert)", fontSize: "12px", marginBottom: "10px" }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Purging Document..." : "Permanently Delete Document"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
