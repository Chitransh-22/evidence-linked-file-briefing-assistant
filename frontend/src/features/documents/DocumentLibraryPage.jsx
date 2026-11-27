import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, RotateCcw, ExternalLink, Trash2, AlertTriangle, X } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function DocumentLibraryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canUploadDocument = canPerformAction(user?.role, ACTIONS.UPLOAD_DOCUMENT);
  const canRetryProcessing = canPerformAction(user?.role, ACTIONS.RETRY_PROCESSING);
  const canDeleteDocument = canPerformAction(user?.role, ACTIONS.DELETE_DOCUMENT);

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [docDeleteError, setDocDeleteError] = useState("");

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (languageFilter) params.append("language", languageFilter);
      if (statusFilter) params.append("processing_status", statusFilter);

      const res = await apiClient.get(`/documents?${params.toString()}`);
      setDocuments(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [page, languageFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadDocuments();
  };

  const handleRetry = async (docId, e) => {
    e.stopPropagation();
    if (!canRetryProcessing) return;
    try {
      await apiClient.post(`/documents/${docId}/retry`);
      loadDocuments();
    } catch (err) {
      alert("Failed to retry processing");
    }
  };

  const handleDownloadOriginal = (docId, filename, e) => {
    e.stopPropagation();
    downloadFile(`/documents/${docId}/original`, filename || `document_${docId}.pdf`);
  };

  const handleDeleteDoc = async () => {
    if (!canDeleteDocument || !docToDelete) return;
    setIsDeletingDoc(true);
    setDocDeleteError("");
    try {
      await apiClient.delete(`/documents/${docToDelete._id}`);
      setDocToDelete(null);
      loadDocuments();
    } catch (err) {
      setDocDeleteError(err.response?.data?.detail || "Failed to delete document.");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const columns = [
    {
      header: "Document ID",
      accessor: "_id",
      width: "140px",
      render: (row) => <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{row._id}</span>,
    },
    {
      header: "Document Title",
      accessor: "document_title",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{row.document_title}</div>
          <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
            File: {row.original_filename} • Authority: {row.source_authority || "N/A"}
          </div>
        </div>
      ),
    },
    {
      header: "Case Reference",
      accessor: "case_reference",
      width: "160px",
      render: (row) => <b>{row.case_reference || "Unassigned"}</b>,
    },
    {
      header: "Language",
      accessor: "language",
      width: "90px",
      align: "center",
      render: (row) => (
        <span className="badge badge-neutral" style={{ textTransform: "uppercase" }}>
          {row.language || "ENG"}
        </span>
      ),
    },
    {
      header: "Classification",
      accessor: "classification",
      width: "110px",
      align: "center",
      render: (row) => (
        <span className={`badge ${row.classification === "scanned" ? "badge-warning" : "badge-info"}`}>
          {row.classification?.toUpperCase()}
        </span>
      ),
    },
    {
      header: "Pages",
      accessor: "page_count",
      width: "70px",
      align: "center",
    },
    {
      header: "Status",
      accessor: "processing_status",
      width: "130px",
      render: (row) => <StatusBadge status={row.processing_status} />,
    },
    {
      header: "Actions",
      width: "160px",
      align: "right",
      render: (row) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/documents/${row._id}`)}
            title="Inspect Extraction and Viewer"
          >
            <ExternalLink size={13} /> View
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => handleDownloadOriginal(row._id, row.original_filename, e)}
            title="Download Original PDF"
          >
            <Download size={13} />
          </button>
          {row.processing_status === "Failed" && canRetryProcessing && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => handleRetry(row._id, e)}
              title="Retry Processing Pipeline"
            >
              <RotateCcw size={13} />
            </button>
          )}
          {canDeleteDocument && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setDocToDelete(row);
                setDocDeleteError("");
              }}
              style={{ color: "var(--color-red-alert)", borderColor: "var(--color-red-alert)" }}
              title="Permanently Delete Document (Admin Only)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Repository & Library</h1>
          <div className="page-subtitle">Master register of all digital exhibits and scanned source files</div>
        </div>
        {canUploadDocument && (
          <button className="btn btn-primary" onClick={() => navigate("/intake")}>
            Intake New Document
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="gov-card"
        style={{
          padding: "16px",
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: 1 }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "32px" }}
              placeholder="Search by title, filename, or document ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            className="form-select"
            style={{ width: "130px" }}
            value={languageFilter}
            onChange={(e) => {
              setLanguageFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Languages</option>
            <option value="eng">English</option>
            <option value="guj">Gujarati</option>
            <option value="hin">Hindi</option>
          </select>

          <select
            className="form-select"
            style={{ width: "160px" }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Ready for Review">Ready for Review</option>
            <option value="Processing">Processing</option>
            <option value="Pending Extraction">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <DataTable
        columns={columns}
        data={documents}
        isLoading={isLoading}
        pagination={{
          page,
          pages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Delete Document Confirmation Modal */}
      {docToDelete && canDeleteDocument && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "480px", borderTop: "4px solid var(--color-red-alert)" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} color="var(--color-red-alert)" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-red-alert)" }}>
                  Delete Document Artifacts (Admin Only)
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
                Are you sure you want to permanently delete document: <br />
                <b>{docToDelete.document_title || docToDelete._id}</b>?
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
                  {isDeletingDoc ? "Purging Document..." : "Permanently Delete Document"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
