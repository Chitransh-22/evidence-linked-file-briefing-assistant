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
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";

export function DashboardPage() {
  const navigate = useNavigate();
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
  const [recentBriefings, setRecentBriefings] = useState([]);
  const [recentContradictions, setRecentContradictions] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
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
          apiClient.get("/briefings?limit=5"),
        ]);

        const totalCases = casesRes.data.total || 0;
        const totalDocs = docsRes.data.total || 0;
        const totalEv = evRes.data.total || 0;
        const totalContra = contraRes.data.total || 0;
        const totalJobs = jobsRes.data.total || 0;

        // Calculate counts
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
        setRecentBriefings(brfRes.data.items || []);
        setRecentContradictions(contraRes.data.items || []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const cards = [
    { label: "Total Cases", value: metrics.totalCases, icon: FolderKanban, color: "#183153", link: "/cases" },
    { label: "Total Documents", value: metrics.totalDocuments, icon: FileText, color: "#334155", link: "/documents" },
    { label: "Documents Processing", value: metrics.processingDocs, icon: Cpu, color: "#0369A1", link: "/processing" },
    { label: "Awaiting Review", value: metrics.awaitingReviewDocs, icon: CheckCircle2, color: "#0F766E", link: "/documents?status=Ready for Review" },
    { label: "Evidence Records", value: metrics.evidenceRecords, icon: BookOpen, color: "#1E293B", link: "/evidence" },
    { label: "Potential Contradictions", value: metrics.potentialContradictions, icon: AlertTriangle, color: "#B45309", link: "/contradictions" },
    { label: "Briefings Pending Review", value: metrics.briefingsPendingReview, icon: FileSignature, color: "#475569", link: "/briefings" },
    { label: "Failed Processing Jobs", value: metrics.failedJobs, icon: XCircle, color: "#B91C1C", link: "/processing?status=Failed" },
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
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-primary" onClick={() => navigate("/cases")}>
            <Plus size={16} /> Create Case
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/intake")}>
            <UploadCloud size={16} /> Upload Documents
          </button>
        </div>
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
              className="gov-card"
              onClick={() => navigate(c.link)}
              style={{
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                    {c.label}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "4px",
                      backgroundColor: `${c.color}15`,
                      color: c.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: c.color, marginTop: "8px" }}>
                  {isLoading ? "..." : c.value}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>View in register</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: 2 Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
        {/* Left Column: Recent Cases & Document Ingestion */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Recent Cases */}
          <div className="gov-card">
            <div className="gov-card-header">
              <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Active Investigation Workspaces</h3>
              <Link to="/cases" style={{ fontSize: "12px", fontWeight: 500 }}>
                View All Cases &rarr;
              </Link>
            </div>
            <div style={{ padding: "0" }}>
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
                      <td colSpan="5" style={{ textAlign: "center", color: "#64748B", padding: "20px" }}>
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
                        <td style={{ fontWeight: 600, color: "#183153" }}>{cs.case_reference}</td>
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
              <Link to="/documents" style={{ fontSize: "12px", fontWeight: 500 }}>
                View Library &rarr;
              </Link>
            </div>
            <div style={{ padding: "0" }}>
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
                      <td colSpan="5" style={{ textAlign: "center", color: "#64748B", padding: "20px" }}>
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
              <Link to="/processing" style={{ fontSize: "12px", fontWeight: 500 }}>
                View Queue &rarr;
              </Link>
            </div>
            <div style={{ padding: "16px" }}>
              {recentJobs.length === 0 ? (
                <div style={{ color: "#64748B", fontSize: "13px" }}>No active background pipeline jobs.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {recentJobs.map((j) => (
                    <div
                      key={j.id}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "#183153" }}>
                          {j.job_id} • {j.current_stage}
                        </span>
                        <StatusBadge status={j.status} />
                      </div>
                      {/* Progress Bar */}
                      <div
                        style={{
                          height: "6px",
                          width: "100%",
                          backgroundColor: "#E2E8F0",
                          borderRadius: "3px",
                          marginTop: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${j.progress || 0}%`,
                            backgroundColor: j.status === "Failed" ? "#B91C1C" : "#183153",
                            transition: "width 0.3s ease",
                          }}
                        ></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
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
              <Link to="/contradictions" style={{ fontSize: "12px", fontWeight: 500 }}>
                Review All &rarr;
              </Link>
            </div>
            <div style={{ padding: "16px" }}>
              {recentContradictions.length === 0 ? (
                <div style={{ color: "#64748B", fontSize: "13px" }}>Zero active evidentiary contradictions.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentContradictions.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "#FEF3C720",
                        border: "1px solid rgba(180, 83, 9, 0.3)",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "#B45309" }}>
                          {c.category}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{ fontSize: "12px", color: "#334155", marginTop: "4px", lineHeight: "1.3" }}>
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
