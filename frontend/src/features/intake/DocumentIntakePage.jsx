import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ShieldAlert, Cpu } from "lucide-react";
import { apiClient } from "../../services/api/client";

export function DocumentIntakePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const initialCaseId = queryParams.get("caseId") || "";

  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Official Audit Report");
  const [sourceAuthority, setSourceAuthority] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [duplicateAlert, setDuplicateAlert] = useState(null);

  useEffect(() => {
    async function loadCases() {
      try {
        const res = await apiClient.get("/cases?limit=100");
        setCases(res.data.items || []);
        if (!selectedCaseId && res.data.items?.length > 0) {
          setSelectedCaseId(res.data.items[0].id);
        }
      } catch (err) {
        console.error("Failed to load cases", err);
      }
    }
    loadCases();
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0) {
      addFiles(files);
    } else {
      setErrorMsg("Only PDF documents (.pdf) are accepted for ingestion.");
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const addFiles = (newFiles) => {
    setErrorMsg("");
    setDuplicateAlert(null);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (!documentTitle && newFiles.length > 0) {
      setDocumentTitle(newFiles[0].name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "));
    }
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCaseId) {
      setErrorMsg("Please select an authorized Case file for ingestion.");
      return;
    }
    if (selectedFiles.length === 0) {
      setErrorMsg("Please select or drop at least one PDF document.");
      return;
    }
    if (!documentTitle.trim()) {
      setErrorMsg("Document title is mandatory.");
      return;
    }

    setErrorMsg("");
    setDuplicateAlert(null);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", selectedFiles[0]);
      formData.append("case_id", selectedCaseId);
      formData.append("document_title", documentTitle.trim());
      formData.append("document_category", documentCategory);
      formData.append("source_authority", sourceAuthority);
      formData.append("received_date", receivedDate);
      formData.append("remarks", remarks);
      formData.append("allow_duplicate", allowDuplicate ? "true" : "false");

      setUploadProgress(60);
      const res = await apiClient.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadProgress(100);
      const data = res.data;

      // Navigate to processing queue or document viewer
      setTimeout(() => {
        navigate(`/processing`);
      }, 500);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateAlert(err.response.data);
      } else {
        setErrorMsg(err.response?.data?.detail || "Document ingestion failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Intake & Ingestion Portal</h1>
          <div className="page-subtitle">
            Secure multi-stage digital PDF extraction and scanned PDF OCR processing
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
        {/* Left: Upload and Dropzone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Dropzone */}
          <div
            className="gov-card"
            style={{
              border: "2px dashed #94A3B8",
              backgroundColor: "#F8FAFC",
              textAlign: "center",
              padding: "40px 20px",
              cursor: "pointer",
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <div
              style={{
                width: "52px",
                height: "52px",
                backgroundColor: "#18315315",
                color: "#183153",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <UploadCloud size={28} />
            </div>
            <div style={{ fontWeight: 600, fontSize: "15px", color: "#183153" }}>
              Drag and Drop Official PDF Files Here
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
              Or click to browse your workstation • Multilingual documents supported (Gujarati, Hindi, English)
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="gov-card">
              <div className="gov-card-header">
                <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Queued Files for Intake ({selectedFiles.length})</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedFiles([])}
                >
                  Clear All
                </button>
              </div>
              <div style={{ padding: "12px" }}>
                {selectedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FileText size={18} color="#183153" />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>{f.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>{(f.size / 1024).toFixed(1)} KB • PDF Document</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Document Alert */}
          {duplicateAlert && (
            <div
              style={{
                padding: "16px",
                backgroundColor: "#FEF3C7",
                border: "1px solid #F59E0B",
                borderRadius: "4px",
                color: "#B45309",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "14px" }}>
                <AlertCircle size={18} /> Duplicate Checksum Detected
              </div>
              <div style={{ fontSize: "12px", marginTop: "6px", lineHeight: "1.4" }}>
                {duplicateAlert.message}
              </div>
              <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
                <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                  />
                  <span>Acknowledge and proceed with ingestion (force upload)</span>
                </label>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "#FEE2E2",
                border: "1px solid #EF4444",
                borderRadius: "4px",
                color: "#B91C1C",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}
        </div>

        {/* Right: Metadata Form */}
        <div className="gov-card">
          <div className="gov-card-header">
            <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Document Evidence Metadata</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
            <div className="form-group">
              <label className="form-label">Target Case File *</label>
              <select
                className="form-select"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                required
              >
                <option value="">-- Select Case File --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_reference} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Official Document Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sanand Parcel 412/A Audit Order"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Document Category</label>
              <select
                className="form-select"
                value={documentCategory}
                onChange={(e) => setDocumentCategory(e.target.value)}
              >
                <option value="Official Audit Report">Official Audit Report</option>
                <option value="Revenue Order">Revenue Order</option>
                <option value="Registry Deed / Land Record">Registry Deed / Land Record</option>
                <option value="Official Communication / Notice">Official Communication / Notice</option>
                <option value="Eyewitness Statement">Eyewitness Statement</option>
                <option value="Bank Voucher / Disbursement">Bank Voucher / Disbursement</option>
                <option value="General Exhibit">General Exhibit</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Issuing Authority / Source</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Office of the District Collector"
                value={sourceAuthority}
                onChange={(e) => setSourceAuthority(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date Received / Record Date</label>
              <input
                type="date"
                className="form-input"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Officer Remarks</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Initial chain of custody observations..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              ></textarea>
            </div>

            {isUploading && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                  <span>Uploading and calculating SHA-256...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ height: "6px", backgroundColor: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`, backgroundColor: "#183153", transition: "width 0.3s ease" }}></div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "40px" }}
              disabled={isUploading || selectedFiles.length === 0}
            >
              {isUploading ? "Ingesting..." : "Submit for Asynchronous AI Processing"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
