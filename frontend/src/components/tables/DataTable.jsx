import React from "react";
import { ChevronLeft, ChevronRight, AlertCircle, Inbox } from "lucide-react";

export function DataTable({
  columns,
  data = [],
  isLoading = false,
  isError = false,
  error = null,
  emptyMessage = "No matching records found in register.",
  pagination = null,
}) {
  if (isLoading) {
    return (
      <div className="gov-table-container" style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
        <div style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid #CBD5E1", borderTopColor: "#183153", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
        <div style={{ marginTop: "12px", fontSize: "13px" }}>Loading government ledger records...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="gov-table-container" style={{ padding: "30px", textAlign: "center", color: "#B91C1C", backgroundColor: "#FEF2F2" }}>
        <AlertCircle size={28} style={{ margin: "0 auto 8px" }} />
        <div style={{ fontWeight: 600, fontSize: "14px" }}>Failed to retrieve records</div>
        <div style={{ fontSize: "12px", marginTop: "4px" }}>{error?.message || "Internal server communication error."}</div>
      </div>
    );
  }

  return (
    <div className="gov-table-container">
      <table className="gov-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width, textAlign: col.align || "left" }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "40px 20px", textAlign: "center", color: "#64748B" }}>
                <Inbox size={32} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                <div>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row.id || row._id || rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={{ textAlign: col.align || "left" }}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && pagination.pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #E2E8F0", backgroundColor: "#F8FAFC", fontSize: "13px" }}>
          <div style={{ color: "#64748B" }}>
            Showing page <b>{pagination.page}</b> of <b>{pagination.pages}</b> ({pagination.total} total items)
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
