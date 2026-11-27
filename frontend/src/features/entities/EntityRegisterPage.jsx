import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ExternalLink, X, Building, User, Calendar, MapPin, Tag } from "lucide-react";
import { apiClient } from "../../services/api/client";
import { DataTable } from "../../components/tables/DataTable";

export function EntityRegisterPage() {
  const navigate = useNavigate();

  const [entities, setEntities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityDetail, setEntityDetail] = useState(null);

  const loadEntities = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.append("search", search);
      if (typeFilter) params.append("entity_type", typeFilter);

      const res = await apiClient.get(`/entities?${params.toString()}`);
      setEntities(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, [page, typeFilter]);

  const handleOpenDetail = async (entity) => {
    setSelectedEntity(entity);
    try {
      const res = await apiClient.get(`/entities/${entity._id}`);
      setEntityDetail(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getEntityIcon = (type) => {
    if (type === "Person") return <User size={14} color="var(--color-primary)" />;
    if (type === "Organization" || type === "Government Department") return <Building size={14} color="var(--color-primary)" />;
    if (type === "Date") return <Calendar size={14} color="var(--color-primary)" />;
    if (type === "Location") return <MapPin size={14} color="var(--color-primary)" />;
    return <Tag size={14} color="var(--color-primary)" />;
  };

  const columns = [
    {
      header: "Entity Name",
      accessor: "entity_name",
      render: (r) => (
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
          onClick={() => handleOpenDetail(r)}
        >
          {getEntityIcon(r.entity_type)}
          <span>{r.entity_name}</span>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "entity_type",
      width: "180px",
      render: (r) => <span className="badge badge-info">{r.entity_type}</span>,
    },
    {
      header: "Case File",
      accessor: "case_id",
      width: "180px",
      render: (r) => <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{r.case_id}</span>,
    },
    {
      header: "Occurrences",
      accessor: "occurrence_count",
      width: "110px",
      align: "center",
      render: (r) => <b>{r.occurrence_count || 1}</b>,
    },
    {
      header: "Actions",
      width: "110px",
      align: "right",
      render: (r) => (
        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenDetail(r)}>
          Occurrences
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Named Entity Intelligence Register</h1>
          <div className="page-subtitle">Discovered persons, organizations, departments, amounts, and dates</div>
        </div>
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
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); loadEntities(); }} style={{ display: "flex", gap: "8px", flex: 1 }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "32px" }}
              placeholder="Search entity name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <select
          className="form-select"
          style={{ width: "200px" }}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Entity Categories</option>
          <option value="Person">Person</option>
          <option value="Organization">Organization</option>
          <option value="Government Department">Government Department</option>
          <option value="Location">Location</option>
          <option value="Monetary Amount">Monetary Amount</option>
          <option value="Date">Date</option>
          <option value="Reference Number">Reference Number</option>
          <option value="Vehicle Identifier">Vehicle Identifier</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={entities}
        isLoading={isLoading}
        pagination={{
          page,
          pages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {selectedEntity && (
        <div className="modal-backdrop">
          <div className="gov-card" style={{ width: "100%", maxWidth: "600px" }}>
            <div className="gov-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge badge-primary">{selectedEntity.entity_type}</span>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {selectedEntity.entity_name}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedEntity(null); setEntityDetail(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "14px" }}>
                Case File: <b>{selectedEntity.case_id}</b>
              </div>

              <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>Source Document Occurrences</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                {(selectedEntity.source_occurrences || []).map((occ, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--color-hover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                    }}
                  >
                    <span>Document: <b>{occ.document_id}</b></span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/documents/${occ.document_id}`)}
                    >
                      <ExternalLink size={12} /> Open Page {occ.page_number}
                    </button>
                  </div>
                ))}
              </div>

              {entityDetail?.evidence_records?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>Connected Evidence Records</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {entityDetail.evidence_records.map((ev) => (
                      <div
                        key={ev._id}
                        style={{
                          padding: "10px",
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "4px",
                          fontSize: "12.5px",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                          {ev._id} • Page {ev.page_number}
                        </div>
                        <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                          {ev.translated_text || ev.source_excerpt}
                        </div>
                        {ev.translated_text && ev.source_excerpt && ev.translated_text !== ev.source_excerpt && (
                          <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                            Original: {ev.source_excerpt}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
