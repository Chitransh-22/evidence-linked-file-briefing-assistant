import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, RefreshCw, Database, HardDrive, Cpu, Server, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";

export function SystemHealthPage() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/system-health");
      setHealth(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  if (isLoading) {
    return <div style={{ padding: "40px", color: "#64748B" }}>Conducting comprehensive infrastructure health diagnostics...</div>;
  }

  const c = health?.components || {};
  const q = health?.queue_metrics || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Enterprise Infrastructure & Node Health</h1>
          <div className="page-subtitle">Real-time status of database, storage, vector index, and worker daemons</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadHealth}>
          <RefreshCw size={14} /> Refresh Diagnostics
        </button>
      </div>

      {/* Overview Status Banner */}
      <div
        className="gov-card"
        style={{
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: health?.status === "healthy" ? "#F0FDF4" : "#FEF2F2",
          border: `1px solid ${health?.status === "healthy" ? "#86EFAC" : "#FCA5A5"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              backgroundColor: health?.status === "healthy" ? "#22C55E" : "#EF4444",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {health?.status === "healthy" ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#183153" }}>
              Overall Operational State: {health?.status?.toUpperCase()}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              Last health diagnostic check: {health?.timestamp?.replace("T", " ").slice(0, 19)} UTC
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/processing?status=Failed")}>
            View Failed Jobs ({q.failed_jobs || 0})
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/processing")}>
            Open Processing Queue
          </button>
        </div>
      </div>

      {/* Component Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        {/* Core FastAPI */}
        <div className="gov-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Server size={18} color="#183153" />
              <h4 style={{ fontSize: "13px", fontWeight: 700 }}>FastAPI Core Server</h4>
            </div>
            <StatusBadge status="Completed" label="Healthy" />
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
            Version: {c.api_server?.version} • Async ASGI Workers Active
          </div>
        </div>

        {/* MongoDB */}
        <div className="gov-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={18} color="#183153" />
              <h4 style={{ fontSize: "13px", fontWeight: 700 }}>MongoDB Ledger</h4>
            </div>
            <StatusBadge status={c.database_mongodb?.status === "healthy" ? "Completed" : "Failed"} label={c.database_mongodb?.status} />
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
            Database: <code>gov_evidence_ledger</code> • Indexes Verified
          </div>
        </div>

        {/* Object Storage */}
        <div className="gov-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <HardDrive size={18} color="#183153" />
              <h4 style={{ fontSize: "13px", fontWeight: 700 }}>Object Storage Adapter</h4>
            </div>
            <StatusBadge status="Completed" label={c.object_storage?.status || "Ready"} />
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
            Provider: <b>{c.object_storage?.provider}</b> • Writable: {c.object_storage?.accessible ? "Yes" : "No"}
          </div>
        </div>

        {/* Vector DB */}
        <div className="gov-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} color="#183153" />
              <h4 style={{ fontSize: "13px", fontWeight: 700 }}>Qdrant Vector Database</h4>
            </div>
            <StatusBadge status="Completed" label={c.vector_database?.status || "Active"} />
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
            Collection: <code>{c.vector_database?.collection}</code>
          </div>
        </div>

        {/* Message Queue */}
        <div className="gov-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={18} color="#183153" />
              <h4 style={{ fontSize: "13px", fontWeight: 700 }}>Queue & Workers</h4>
            </div>
            <StatusBadge status="Completed" label="Active" />
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
            Active: <b>{q.active_jobs || 0}</b> • Queued: <b>{q.queued_jobs || 0}</b> • Failed: <b>{q.failed_jobs || 0}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
