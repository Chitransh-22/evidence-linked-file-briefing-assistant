import React from "react";
import {
  Calendar,
  FileSearch,
  FileText,
  Languages,
  Share2,
  ShieldCheck,
} from "lucide-react";

const CAPABILITIES = [
  {
    title: "Multilingual Processing",
    description:
      "Process digital and scanned government records in Gujarati, Hindi and English while preserving original source references.",
    icon: Languages,
  },
  {
    title: "Government Entity Extraction",
    description:
      "Identify 12 institutional entity categories, including individuals, departments, dates, monetary amounts and legal references.",
    icon: Share2,
  },
  {
    title: "Chronology & Contradictions",
    description:
      "Reconstruct chronological events and identify conflicting information across government records for further review.",
    icon: Calendar,
  },
  {
    title: "Source-Linked Evidence",
    description:
      "Link every extracted claim, event and evidence item to its original document ID, page number and bounding box coordinates.",
    icon: FileSearch,
  },
  {
    title: "Structured Investigation Briefings",
    description:
      "Generate comprehensive 16-section investigation briefings with independent claim verification and PDF/DOCX export.",
    icon: FileText,
  },
  {
    title: "Governance & Auditability",
    description:
      "Enforce maker-checker separation of duties and maintain a tamper-evident SHA-256 hash-chained audit ledger.",
    icon: ShieldCheck,
  },
];

export default function CapabilitiesSection() {
  return (
    <section className="lp-capabilities">
      <div className="lp-container">
        <div className="lp-cap-header">
          <div className="lp-section-eyebrow-center">
            <span className="lp-eyebrow-bar" aria-hidden="true" />
            <span className="lp-eyebrow-text">KEY CAPABILITIES</span>
          </div>

          <h2 className="lp-cap-title">
            A complete investigation intelligence workspace.
          </h2>
        </div>

        <div className="lp-cap-grid">
          {CAPABILITIES.map(({ title, description, icon: Icon }) => (
            <div key={title} className="lp-cap-card">
              <Icon className="lp-cap-icon" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="lp-cap-card-title">{title}</h3>
              <p className="lp-cap-card-desc">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
