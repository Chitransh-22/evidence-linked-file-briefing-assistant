import React, { useState, useEffect } from "react";
import { Sliders, Cpu, CheckCircle2, AlertTriangle, RefreshCw, Languages, Database, HardDrive, BrainCircuit } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";

export function AIServicesPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/ai-services");
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (isLoading) {
    return <div style={{ padding: "40px", color: "#64748B" }}>Polling AI pipeline service readiness...</div>;
  }

  const s = data?.services || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Pipeline & Component Readiness</h1>
          <div className="page-subtitle">
            Health and integration parameters for document processing, translation, NER, and vector models
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadStatus}>
          <RefreshCw size={14} /> Refresh Readiness
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* PDF Parser & OCR */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <HardDrive size={18} color="#183153" />
              <h3 style={{ fontSize: "14px", fontWeight: 700 }}>1. PDF Parser & OCR Engine</h3>
            </div>
            <StatusBadge status={s.pdf_parser?.status || "ready"} />
          </div>
          <div style={{ padding: "16px", fontSize: "13px", lineHeight: "1.6" }}>
            <div><b>Parser Engine:</b> {s.pdf_parser?.name} ({s.pdf_parser?.version})</div>
            <div><b>Capabilities:</b> {s.pdf_parser?.capabilities?.join(", ")}</div>
            <hr style={{ margin: "12px 0", borderColor: "#E2E8F0" }} />
            <div><b>OCR Engine:</b> {s.ocr?.name}</div>
            <div><b>Configured Languages:</b> {s.ocr?.languages} (English, Hindi, Gujarati)</div>
            <div><b>Status:</b> <StatusBadge status={s.ocr?.status} /></div>
          </div>
        </div>

        {/* Translation: IndicTrans2 & Language Detection */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Languages size={18} color="#183153" />
              <h3 style={{ fontSize: "14px", fontWeight: 700 }}>2. Multilingual & Translation Engine</h3>
            </div>
            <StatusBadge status={s.indictrans2?.status || "ready"} />
          </div>
          <div style={{ padding: "16px", fontSize: "13px", lineHeight: "1.6" }}>
            <div><b>Model Provider:</b> {s.indictrans2?.name} ({s.indictrans2?.version})</div>
            <div><b>Supported Routes:</b> {s.indictrans2?.supported_routes?.join(", ")}</div>
            <div><b>English Bypass:</b> Active per Authoritative Specification</div>
            <div><b>Status:</b> {s.indictrans2?.status}</div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "6px" }}>
              {s.indictrans2?.instructions}
            </div>
          </div>
        </div>

        {/* NER & LLM Structured Extraction */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BrainCircuit size={18} color="#183153" />
              <h3 style={{ fontSize: "14px", fontWeight: 700 }}>3. NER & LLM Structured Extraction</h3>
            </div>
            <StatusBadge status="ready" />
          </div>
          <div style={{ padding: "16px", fontSize: "13px", lineHeight: "1.6" }}>
            <div><b>NER Model:</b> {s.ner?.name}</div>
            <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px" }}>
              Categories: {s.ner?.categories?.slice(0, 7).join(", ")}...
            </div>
            <hr style={{ margin: "12px 0", borderColor: "#E2E8F0" }} />
            <div><b>LLM Synthesis Provider:</b> {s.llm?.provider} ({s.llm?.model_name})</div>
            <div><b>Status:</b> <StatusBadge status={s.llm?.status} /></div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
              {s.llm?.details}
            </div>
          </div>
        </div>

        {/* Embeddings & Qdrant Vector Database */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={18} color="#183153" />
              <h3 style={{ fontSize: "14px", fontWeight: 700 }}>4. Embeddings & Vector Index</h3>
            </div>
            <StatusBadge status="ready" />
          </div>
          <div style={{ padding: "16px", fontSize: "13px", lineHeight: "1.6" }}>
            <div><b>Embedding Model:</b> {s.embeddings?.model_name} (dim: {s.embeddings?.dimension})</div>
            <div><b>Vector Engine:</b> {s.vector_database?.name} ({s.vector_database?.host})</div>
            <div><b>Collection:</b> <code>{s.vector_database?.collection}</code></div>
            <div><b>Vector Mode:</b> <StatusBadge status={s.vector_database?.status} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
