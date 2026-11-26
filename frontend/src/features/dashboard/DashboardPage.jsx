import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  Cpu,
  BookOpen,
  AlertTriangle,
  FileSignature,
  XCircle,
  Plus,
  UploadCloud,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canCreateCase = canPerformAction(user?.role, ACTIONS.CREATE_CASE);
  const canUploadDocument = canPerformAction(user?.role, ACTIONS.UPLOAD_DOCUMENT);
  const canViewBriefings = canPerformAction(user?.role, ACTIONS.VIEW_BRIEFINGS);

  const [metrics, setMetrics] = useState({
    totalCases: 0,
    totalDocuments: 0,
    processingDocs: 0,
    awaitingReviewDocs: 0,
    evidenceRecords: 0,
    potentialContradictions: 0,
    briefingsPendingReview: 0,
    failedJobs: 0,
  });

  const [recentCases, setRecentCases] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentContradictions, setRecentContradictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [casesRes, docsRes, jobsRes, evRes, contraRes, brfRes] = await Promise.all([
          apiClient.get("/cases?limit=5"),
          apiClient.get("/documents?limit=5"),
          apiClient.get("/jobs?limit=5"),
          apiClient.get("/evidence?limit=1"),
          apiClient.get("/contradictions?limit=5"),
          canViewBriefings ? apiClient.get("/briefings?limit=5") : Promise.resolve({ data: { items: [] } }),
        ]);

        const totalCases = casesRes.data.total || 0;
        const totalDocs = docsRes.data.total || 0;
        const totalEv = evRes.data.total || 0;
        const totalContra = contraRes.data.total || 0;

        const failed = (jobsRes.data.items || []).filter(j => j.status === "Failed").length;
        const processing = (docsRes.data.items || []).filter(d => d.processing_status === "Processing" || d.processing_status === "Pending Extraction").length;
        const readyReview = (docsRes.data.items || []).filter(d => d.processing_status === "Ready for Review").length;
        const pendingBriefings = (brfRes.data.items || []).filter(b => b.status === "Under Review" || b.status === "Draft").length;

        setMetrics({
          totalCases,
          totalDocuments: totalDocs,
          processingDocs: processing,
          awaitingReviewDocs: readyReview,
          evidenceRecords: totalEv,
          potentialContradictions: totalContra,
          briefingsPendingReview: pendingBriefings,
          failedJobs: failed,
        });

        setRecentCases(casesRes.data.items || []);
        setRecentDocs(docsRes.data.items || []);
        setRecentJobs(jobsRes.data.items || []);
        setRecentContradictions(contraRes.data.items || []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [canViewBriefings]);

  const cards = [
    { label: "Total Cases", value: metrics.totalCases, icon: FolderKanban, link: "/cases" },
    { label: "Total Documents", value: metrics.totalDocuments, icon: FileText, link: "/documents" },
    { label: "Documents Processing", value: metrics.processingDocs, icon: Cpu, link: "/processing" },
    { label: "Awaiting Review", value: metrics.awaitingReviewDocs, icon: CheckCircle2, link: "/documents?status=Ready for Review" },
    { label: "Evidence Records", value: metrics.evidenceRecords, icon: BookOpen, link: "/evidence" },
    { label: "Potential Contradictions", value: metrics.potentialContradictions, icon: AlertTriangle, link: "/contradictions" },
    ...(canViewBriefings
      ? [{ label: "Briefings Pending Review", value: metrics.briefingsPendingReview, icon: FileSignature, link: "/briefings" }]
      : []),
    { label: "Failed Processing Jobs", value: metrics.failedJobs, icon: XCircle, link: "/processing?status=Failed" },
  ];

  return (
    <div>
      {/* Top Banner and Quick Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Operations Dashboard</h1>
          <div className="page-subtitle">
            Centralized Document Evidence Ledger & Multi-Stage Intelligence Overview
          </div>
        </div>
        {(canCreateCase || canUploadDocument) && (
          <div style={{ display: "flex", gap: "10px" }}>
            {canCreateCase && (
              <button className="btn btn-primary" onClick={() => navigate("/cases")}>
                <Plus size={16} /> Create Case
              </button>
            )}
            {canUploadDocument && (
              <button className="btn btn-secondary" onClick={() => navigate("/intake")}>
                <UploadCloud size={16} /> Upload Documents
              </button>
            )}
          </div>
        )}
      </div>

      {/* Top-Level Metric Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className="gov-card dashboard-metric-card"
              onClick={() => navigate(c.link)}
            >
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                    {c.label}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "4px",
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text-primary)", marginTop: "8px" }}>
                  {isLoading ? "..." : c.value}
                </div>
                <div className="dashboard-card-link" style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>View in register</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: 2 Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Left Column: Recent Cases & Document Ingestion */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Recent Cases */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Active Investigation Workspaces</h3>
              <Link to="/cases" className="dashboard-link">
                View All Cases &rarr;
              </Link>
            </div>
            <div style={{ padding: "0", overflowX: "auto" }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Case Title</th>
                    <th>Category</th>
                    <th>Documents</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "20px" }}>
                        No active cases registered.
                      </td>
                    </tr>
                  ) : (
                    recentCases.map((cs) => (
                      <tr
                        key={cs.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/cases/${cs.id}`)}
                      >
                        <td style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{cs.case_reference}</td>
                        <td style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cs.title}
                        </td>
                        <td>{cs.category}</td>
                        <td>{cs.document_count}</td>
                        <td>
                          <StatusBadge status={cs.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Document Uploads */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Recent Document Ingestion</h3>
              <Link to="/documents" className="dashboard-link">
                View Library &rarr;
              </Link>
            </div>
            <div style={{ padding: "0", overflowX: "auto" }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Language</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "20px" }}>
                        No documents uploaded yet.
                      </td>
                    </tr>
                  ) : (
                    recentDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 500 }}>{doc.document_title}</td>
                        <td>
                          <span className="badge badge-neutral" style={{ textTransform: "uppercase" }}>
                            {doc.language || "eng"}
                          </span>
                        </td>
                        <td>{doc.classification || "digital"}</td>
                        <td>
                          <StatusBadge status={doc.processing_status} />
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Processing Pipeline Status & Contradictions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Asynchronous Pipeline Activity */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Asynchronous Pipeline Monitor</h3>
              <Link to="/processing" className="dashboard-link">
                View Queue &rarr;
              </Link>
            </div>
            <div style={{ padding: "16px" }}>
              {recentJobs.length === 0 ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>No active background pipeline jobs.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {recentJobs.map((j) => (
                    <div
                      key={j.id}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "var(--color-hover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--color-text-primary)" }}>
                          {j.job_id} • {j.current_stage}
                        </span>
                        <StatusBadge status={j.status} />
                      </div>
                      {/* Progress Bar */}
                      <div
                        style={{
                          height: "6px",
                          width: "100%",
                          backgroundColor: "var(--color-border)",
                          borderRadius: "3px",
                          marginTop: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${j.progress || 0}%`,
                            backgroundColor: j.status === "Failed" ? "var(--color-red-alert)" : "var(--color-primary)",
                            transition: "width 0.3s ease",
                          }}
                        ></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                        <span>Progress: {j.progress || 0}%</span>
                        <span>Doc: {j.document_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Potential Contradiction Alerts */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Active Contradiction Alerts</h3>
              <Link to="/contradictions" className="dashboard-link">
                Review All &rarr;
              </Link>
            </div>
            <div style={{ padding: "16px" }}>
              {recentContradictions.length === 0 ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>Zero active evidentiary contradictions.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentContradictions.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "rgba(254, 243, 199, 0.35)",
                        border: "1px solid rgba(180, 83, 9, 0.3)",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--color-amber-warning)" }}>
                          {c.category}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-primary)", marginTop: "4px", lineHeight: "1.3" }}>
                        {c.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
