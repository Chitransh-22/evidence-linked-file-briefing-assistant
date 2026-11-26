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
} from "lucide-react";
import { apiClient, getAuthenticatedUrl, downloadFile } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";

export function DocumentViewerPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

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
                {evidenceList.map((ev) => (
                  <div
                    key={ev._id}
                    style={{
                      padding: "12px",
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
                    <div style={{ fontSize: "13px", marginTop: "6px", color: "var(--color-text-primary)", lineHeight: "1.4" }}>
                      {ev.source_excerpt}
                    </div>
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      <span>Category: <b>{ev.evidence_category}</b></span>
                      <span>Confidence: <b>{Math.round((ev.confidence || 0) * 100)}%</b></span>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
