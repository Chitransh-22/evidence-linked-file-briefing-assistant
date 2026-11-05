import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Filter, FileText, Download, RotateCcw, ExternalLink } from "lucide-react";
import { apiClient, downloadFile, getAuthenticatedUrl } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";

export function DocumentLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const columns = [
    {
      header: "Document ID",
      accessor: "_id",
      width: "140px",
      render: (row) => <span style={{ fontWeight: 600, color: "#183153" }}>{row._id}</span>,
    },
    {
      header: "Document Title",
      accessor: "document_title",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: "#1E293B" }}>{row.document_title}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>
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
          {row.processing_status === "Failed" && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => handleRetry(row._id, e)}
              title="Retry Processing Pipeline"
            >
              <RotateCcw size={13} />
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
        <button className="btn btn-primary" onClick={() => navigate("/intake")}>
          Intake New Document
        </button>
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
            <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
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
    </div>
  );
}
