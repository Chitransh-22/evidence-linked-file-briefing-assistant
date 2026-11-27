import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, ExternalLink, X } from "lucide-react";
import { apiClient, downloadFile } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ACTIONS, canPerformAction } from "../../config/rbac";

export function ChronologyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canMutateChronology = canPerformAction(user?.role, ACTIONS.MUTATE_CHRONOLOGY);

  const [events, setEvents] = useState([]);
  const [page] = useState(1);
  const [viewMode, setViewMode] = useState("timeline");
  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [cases, setCases] = useState([]);
  const [formData, setFormData] = useState({
    case_id: "",
    event_title: "",
    description: "",
    event_date: "",
    original_date_expression: "",
    date_precision: "exact",
    associated_entities: "",
  });

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "30" });
      if (search) params.append("search", search);
      if (caseFilter) params.append("case_id", caseFilter);

      const [res, casesRes] = await Promise.all([
        apiClient.get(`/events?${params.toString()}`),
        apiClient.get("/cases?limit=50"),
      ]);
      setEvents(res.data.items || []);
      setCases(casesRes.data.items || []);
      if (!formData.case_id && casesRes.data.items?.length > 0) {
        setFormData(prev => ({ ...prev, case_id: casesRes.data.items[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, caseFilter]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!canMutateChronology) return;
    try {
      const payload = {
        ...formData,
        associated_entities: formData.associated_entities ? formData.associated_entities.split(",").map(s => s.trim()) : [],
      };
      await apiClient.post("/events", payload);
      setShowAddModal(false);
      setFormData({
        case_id: cases[0]?.id || "",
        event_title: "",
        description: "",
        event_date: "",
        original_date_expression: "",
        date_precision: "exact",
        associated_entities: "",
      });
      loadEvents();
    } catch (err) {
      alert("Failed to record event");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Event & Chronology Intelligence Engine</h1>
          <div className="page-subtitle">Temporal reconstruction grounded strictly in verifiable document dates</div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary"
            onClick={() => downloadFile(`/events/export/csv`, "chronology_events.csv")}
          >
            <Download size={14} /> Export Timeline CSV
          </button>
          {canMutateChronology && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> Add Event Manually
            </button>
          )}
        </div>
      </div>

      {/* View Switcher and Search */}
      <div
        className="gov-card"
        style={{
          padding: "16px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`btn btn-sm ${viewMode === "timeline" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("timeline")}
          >
            Visual Timeline
          </button>
          <button
            className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("table")}
          >
            Tabular Register
          </button>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1, maxWidth: "600px", justifyContent: "flex-end" }}>
          <select
            className="form-select"
            style={{ width: "220px" }}
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
          >
            <option value="">All Case Files</option>
            {cases.map((c) => (
              <option key={c.id || c.case_id} value={c.id || c.case_id}>
                {c.case_reference || c.case_id} - {c.title?.slice(0, 26)}...
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "8px", flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Filter events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-secondary btn-sm" onClick={loadEvents}>Filter</button>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === "timeline" ? (
        <div className="gov-card" style={{ padding: "24px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "30px" }}>Loading chronology...</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "30px" }}>No chronological events found.</div>
          ) : (
            <div style={{ position: "relative", paddingLeft: "36px" }}>
              {/* Vertical Spine */}
              <div
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "10px",
                  bottom: "10px",
                  width: "2px",
                  backgroundColor: "var(--color-border)",
                }}
              ></div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {events.map((ev, idx) => (
                  <div key={ev.id || idx} style={{ position: "relative" }}>
                    {/* Circle Node */}
                    <div
                      style={{
                        position: "absolute",
                        left: "-30px",
                        top: "4px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-primary)",
                        border: "3px solid var(--color-surface)",
                        boxShadow: "0 0 0 2px var(--color-border)",
                      }}
                    ></div>

                    {/* Event Card */}
                    <div
                      style={{
                        backgroundColor: "var(--color-hover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-text-primary)" }}>
                              {ev.event_date || ev.original_date_expression}
                            </span>
                            {ev.original_date_expression && ev.event_date && ev.original_date_expression !== ev.event_date && (
                              <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                                ({ev.original_date_expression})
                              </span>
                            )}
                            <span className="badge badge-neutral">Precision: {ev.date_precision || "exact"}</span>
                            <StatusBadge status={ev.review_status} />
                          </div>
                          <h4 style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--color-text-primary)", marginTop: "4px" }}>
                            {ev.event_title || ev.title || "Timeline Milestone"}
                          </h4>
                        </div>
                        {ev.document_id && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/documents/${ev.document_id}`)}
                          >
                            <ExternalLink size={12} /> Source Doc
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: "13px", color: "var(--color-text-primary)", marginTop: "8px", lineHeight: "1.5" }}>
                        {ev.description || ev.translated_description}
                      </div>

                      {ev.associated_entities?.length > 0 && (
                        <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Entities:</span>
                          {ev.associated_entities.map((ent, eIdx) => (
                            <span key={eIdx} className="badge badge-primary" style={{ fontSize: "11px" }}>
                              {ent}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              header: "Date",
              accessor: "event_date",
              width: "140px",
              render: (r) => (
                <div>
                  <b style={{ color: "var(--color-text-primary)" }}>{r.event_date || r.original_date_expression}</b>
                  {r.original_date_expression && r.event_date && r.original_date_expression !== r.event_date && (
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      {r.original_date_expression}
                    </div>
                  )}
                </div>
              ),
            },
            { header: "Precision", accessor: "date_precision", width: "100px" },
            {
              header: "Event Title",
              accessor: "event_title",
              width: "220px",
              render: (r) => <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{r.event_title || r.title || "Chronological Milestone"}</span>,
            },
            {
              header: "Description",
              accessor: "description",
              render: (r) => (
                <div style={{ fontSize: "13px", lineHeight: "1.45", color: "var(--color-text-primary)" }}>
                  {r.description || r.translated_description}
                </div>
              ),
            },
            { header: "Entities", accessor: "associated_entities", render: (r) => r.associated_entities?.join(", ") || "-" },
            { header: "Review Status", accessor: "review_status", width: "130px", render: (r) => <StatusBadge status={r.review_status} /> },
          ]}
          data={events}
          isLoading={isLoading}
        />
      )}

      {showAddModal && canMutateChronology && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "520px" }}>
            <div className="gov-card-header">
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Record Manual Chronology Milestone</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEvent} style={{ padding: "20px" }}>
              <div className="form-group">
                <label className="form-label">Case File</label>
                <select
                  className="form-select"
                  value={formData.case_id}
                  onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                  required
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.case_reference} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Event Date (ISO YYYY-MM-DD)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value, original_date_expression: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date Precision</label>
                  <select
                    className="form-select"
                    value={formData.date_precision}
                    onChange={(e) => setFormData({ ...formData, date_precision: e.target.value })}
                  >
                    <option value="exact">Exact Date</option>
                    <option value="approximate">Approximate</option>
                    <option value="range">Date Range</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Event Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. In-person witness examination conducted"
                  value={formData.event_title}
                  onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Description *</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Associated Entities (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Infra, Shri Hiren Joshi"
                  value={formData.associated_entities}
                  onChange={(e) => setFormData({ ...formData, associated_entities: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
