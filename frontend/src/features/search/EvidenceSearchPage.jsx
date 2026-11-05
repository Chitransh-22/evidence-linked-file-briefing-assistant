import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Filter, ExternalLink, BookOpen, AlertCircle, FilePlus } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { StatusBadge } from "../../components/common/StatusBadge";

export function EvidenceSearchPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("semantic"); // semantic, keyword, entity
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setSearched(true);

    try {
      const res = await apiClient.get(`/evidence/search?q=${encodeURIComponent(query.trim())}&limit=15`);
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Semantic Evidence Retrieval Engine</h1>
          <div className="page-subtitle">
            Hybrid Qdrant vector similarity and MongoDB metadata intelligence
          </div>
        </div>
      </div>

      {/* Search Input Box Card */}
      <div className="gov-card" style={{ padding: "24px", marginBottom: "20px" }}>
        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[
            { id: "semantic", label: "Semantic Vector Search" },
            { id: "keyword", label: "Keyword Search" },
            { id: "entity", label: "Entity Search" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSearchMode(mode.id)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "4px",
                border: "1px solid",
                borderColor: searchMode === mode.id ? "#183153" : "#CBD5E1",
                backgroundColor: searchMode === mode.id ? "#183153" : "#FFFFFF",
                color: searchMode === mode.id ? "#FFFFFF" : "#475569",
                cursor: "pointer",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{ height: "42px", paddingLeft: "36px", fontSize: "14px" }}
              placeholder="e.g. Discrepancies in land valuation payments or sanction orders by Deputy Collector..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search size={18} style={{ position: "absolute", left: "12px", top: "12px", color: "#94A3B8" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: "42px", padding: "0 20px" }} disabled={isLoading}>
            {isLoading ? "Searching Vector Database..." : "Execute Search"}
          </button>
        </form>

        <div style={{ marginTop: "12px", fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertCircle size={14} />
          <span>Semantic relevance score reflects vector embedding proximity, not independent proof of factual truth.</span>
        </div>
      </div>

      {/* Results Section */}
      {searched && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#183153" }}>
              Retrieved Evidentiary Records ({results.length})
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Query: <i>"{query}"</i>
            </span>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
              Searching Qdrant collection and enriching with Evidence Ledger...
            </div>
          ) : results.length === 0 ? (
            <div className="gov-card" style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
              No reliable supporting evidence records found matching your semantic inquiry.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {results.map((res, idx) => (
                <div key={idx} className="gov-card" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "13px", color: "#183153" }}>
                          {res.evidence_id}
                        </span>
                        <span className="badge badge-info">{res.evidence_category}</span>
                        <span className="badge badge-neutral" style={{ textTransform: "uppercase" }}>
                          {res.language}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        Source: <b>{res.document_title}</b> (Doc ID: {res.document_id}) • <b>Page {res.page_number}</b>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>Relevance Score</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F766E" }}>
                        {Math.round(res.relevance_score * 100)}%
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "13.5px",
                      lineHeight: "1.5",
                      color: "#1E293B",
                      backgroundColor: "#F8FAFC",
                      padding: "12px",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                    }}
                  >
                    "{res.excerpt || res.normalized_text}"
                  </div>

                  {res.associated_entities?.length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748B" }}>Entities:</span>
                      {res.associated_entities.map((e, eIdx) => (
                        <span key={eIdx} className="badge badge-neutral" style={{ fontSize: "11px" }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/documents/${res.document_id}`)}
                    >
                      <ExternalLink size={13} /> Open Source PDF (Page {res.page_number})
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/evidence`)}
                    >
                      <BookOpen size={13} /> View in Ledger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
