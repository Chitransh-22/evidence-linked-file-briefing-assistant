import React from "react";

export function StatusBadge({ status, label }) {
  const text = label || status || "Unknown";
  let variant = "badge-neutral";

  const lower = String(text).toLowerCase();
  if (
    lower.includes("ready") ||
    lower.includes("completed") ||
    lower.includes("verified") ||
    lower.includes("supported") ||
    lower.includes("approved") ||
    lower.includes("active")
  ) {
    variant = "badge-success";
  } else if (
    lower.includes("pending") ||
    lower.includes("processing") ||
    lower.includes("review") ||
    lower.includes("warning") ||
    lower.includes("draft")
  ) {
    variant = "badge-warning";
  } else if (
    lower.includes("failed") ||
    lower.includes("conflict") ||
    lower.includes("rejected") ||
    lower.includes("unsupported") ||
    lower.includes("disabled")
  ) {
    variant = "badge-danger";
  } else if (
    lower.includes("digital") ||
    lower.includes("indexed") ||
    lower.includes("extracted")
  ) {
    variant = "badge-info";
  }

  return <span className={`badge ${variant}`}>{text}</span>;
}
