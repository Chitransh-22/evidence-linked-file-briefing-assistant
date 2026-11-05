import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, RotateCcw, XCircle, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";

const PIPELINE_STAGES = [
  "Ingestion",
  "Classification",
  "PDF Parsing/OCR",
  "Extraction API",
  "Intermediate Storage",
  "Feature Normalization",
  "Layout Reconstruction",
  "Document Structure",
  "Page-Aware Context",
  "Language Detection",
  "Translation/English Bypass",
  "NLTK",
  "NER",
  "LLM Extraction",
  "Chunking",
  "Embedding",
  "Vector Indexing",
  "Evidence Ledger",
  "Analysis",
];

export function ProcessingQueuePage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter ? `/jobs?status=${statusFilter}` : `/jobs`;
      const res = await apiClient.get(url);
      const items = res.data.items || [];
      setJobs(items);
      if (!selectedJob && items.length > 0) {
        setSelectedJob(items[0]);
      } else if (selectedJob) {
        // update selected job if in list
        const updated = items.find(j => j._id === selectedJob._id);
        if (updated) setSelectedJob(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 4000); // 4-second polling for active jobs
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleRetryJob = async (jobId, e) => {
    e?.stopPropagation();
    try {
      await apiClient.post(`/jobs/${jobId}/retry`);
      loadJobs();
    } catch (err) {
      alert("Failed to retry job");
    }
  };

  const handleCancelJob = async (jobId, e) => {
    e?.stopPropagation();
    try {
      await apiClient.post(`/jobs/${jobId}/cancel`);
      loadJobs();
    } catch (err) {
      alert("Failed to cancel job");
    }
  };

  const getStageIndex = (stageName) => {
    if (stageName === "Completed") return PIPELINE_STAGES.length;
    const idx = PIPELINE_STAGES.indexOf(stageName);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Asynchronous AI Processing Queue</h1>
          <div className="page-subtitle">Real-time 19-stage document intelligence pipeline monitor</div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={loadJobs}>
            <RefreshCw size={14} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Selected Job Visual 19-Stage Pipeline */}
      {selectedJob && (
        <div className="gov-card" style={{ marginBottom: "20px" }}>
          <div className="gov-card-header">
            <div>
              <span style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Active Pipeline Visualizer</span>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#183153" }}>
                Job {selectedJob.job_id} • Doc {selectedJob.document_id}
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <StatusBadge status={selectedJob.status} />
              {selectedJob.status === "Failed" && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRetryJob(selectedJob._id)}
                >
                  <RotateCcw size={14} /> Retry
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: "20px" }}>
            {/* Horizontal 19-Stage Stepper Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              {PIPELINE_STAGES.map((st, idx) => {
                const curIdx = getStageIndex(selectedJob.current_stage);
                const isPassed = curIdx > idx || selectedJob.status === "Completed";
                const isCurrent = curIdx === idx && selectedJob.status !== "Completed";
                const isFailed = isCurrent && selectedJob.status === "Failed";

                let bg = "#F1F5F9";
                let textCol = "#64748B";
                let borderColor = "#CBD5E1";

                if (isFailed) {
                  bg = "#FEE2E2";
                  textCol = "#B91C1C";
                  borderColor = "#EF4444";
                } else if (isPassed) {
                  bg = "#CCFBF1";
                  textCol = "#0F766E";
                  borderColor = "#14B8A6";
                } else if (isCurrent) {
                  bg = "#E0F2FE";
                  textCol = "#0369A1";
                  borderColor = "#0284C7";
                }

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      backgroundColor: bg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: "4px",
                      fontSize: "11px",
                      lineHeight: "1.3",
                    }}
                  >
                    <div style={{ fontWeight: 700, opacity: 0.8 }}>Stage {idx + 1}</div>
                    <div style={{ fontWeight: 600, color: textCol, marginTop: "2px" }}>{st}</div>
                  </div>
                );
              })}
            </div>

            {/* Error or Progress Bar */}
            {selectedJob.error ? (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#FEE2E2",
                  border: "1px solid #EF4444",
                  borderRadius: "4px",
                  color: "#B91C1C",
                  fontSize: "12px",
                }}
              >
                <b>Pipeline Diagnostic Log:</b> {selectedJob.error}
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                  <span>Current Stage: <b>{selectedJob.current_stage}</b></span>
                  <span>Progress: <b>{selectedJob.progress || 0}%</b></span>
                </div>
                <div style={{ height: "8px", backgroundColor: "#E2E8F0", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${selectedJob.progress || 0}%`,
                      backgroundColor: "#183153",
                      transition: "width 0.4s ease",
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <DataTable
        columns={[
          {
            header: "Job ID",
            accessor: "_id",
            width: "150px",
            render: (r) => (
              <span style={{ fontWeight: 600, color: "#183153", cursor: "pointer" }} onClick={() => setSelectedJob(r)}>
                {r._id}
              </span>
            ),
          },
          {
            header: "Document ID",
            accessor: "document_id",
            width: "140px",
            render: (r) => (
              <a href={`/documents/${r.document_id}`} style={{ fontWeight: 500 }}>
                {r.document_id}
              </a>
            ),
          },
          {
            header: "Case Reference",
            accessor: "case_reference",
            width: "160px",
            render: (r) => <b>{r.case_reference || r.case_id}</b>,
          },
          {
            header: "Current Stage",
            accessor: "current_stage",
            width: "180px",
            render: (r) => <span style={{ fontWeight: 600 }}>{r.current_stage}</span>,
          },
          {
            header: "Progress",
            accessor: "progress",
            width: "100px",
            render: (r) => `${r.progress || 0}%`,
          },
          {
            header: "Status",
            accessor: "status",
            width: "130px",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            header: "Duration",
            accessor: "duration_seconds",
            width: "100px",
            render: (r) => r.duration_seconds ? `${r.duration_seconds}s` : "-",
          },
          {
            header: "Actions",
            width: "140px",
            align: "right",
            render: (r) => (
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedJob(r)}
                >
                  View
                </button>
                {r.status === "Failed" && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => handleRetryJob(r._id, e)}
                    title="Retry Job"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                {r.status === "Processing" && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => handleCancelJob(r._id, e)}
                    title="Cancel Job"
                  >
                    <XCircle size={13} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
        data={jobs}
        isLoading={isLoading}
      />
    </div>
  );
}
