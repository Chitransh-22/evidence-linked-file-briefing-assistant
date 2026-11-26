import React from "react";
import { motion, useReducedMotion } from "motion/react";

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Register Case & Upload Documents",
    description: "Create an investigation case and upload relevant government PDF records.",
  },
  {
    number: "02",
    title: "Extract & Normalize Content",
    description:
      "Extract digital or scanned text, detect languages and normalize multilingual records.",
  },
  {
    number: "03",
    title: "Identify Entities & Evidence",
    description:
      "Extract institutional entities, atomic claims and relevant source references.",
  },
  {
    number: "04",
    title: "Analyze & Organize Evidence",
    description:
      "Build chronological timelines, detect contradictions and consolidate evidence into a centralized ledger.",
  },
  {
    number: "05",
    title: "Generate Investigation Briefing",
    description:
      "Synthesize source-linked evidence into a structured 16-section investigation report.",
  },
  {
    number: "06",
    title: "Verify, Approve & Export",
    description:
      "Enable independent supervisory claim verification, briefing approval and final PDF or DOCX export.",
  },
];

export default function WorkingFlow() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="lp-flow">
      <div className="lp-container">
        <div className="lp-flow-box">
          <div className="lp-flow-grid">
            {/* Left Heading Block */}
            <div>
              <div className="lp-flow-eyebrow">
                <span className="lp-eyebrow-bar" aria-hidden="true" />
                <span className="lp-eyebrow-text">THE WORKING FLOW</span>
              </div>

              <h2 className="lp-flow-title">From records to a verified briefing.</h2>

              <p className="lp-flow-desc">
                A structured investigation workflow with traceable evidence and independent
                officer oversight.
              </p>
            </div>

            {/* Right Vertical Step Timeline */}
            <ol className="lp-flow-steps">
              {/* Connecting Vertical Line */}
              <div className="lp-flow-line" aria-hidden="true" />

              {WORKFLOW_STEPS.map((step, idx) => (
                <motion.li
                  key={step.number}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.28,
                    delay: shouldReduceMotion ? 0 : idx * 0.06,
                    ease: "easeOut",
                  }}
                  className="lp-flow-step"
                >
                  <span className="lp-flow-step-num lp-tabular">{step.number}</span>

                  <p className="lp-flow-step-text">
                    <span className="lp-flow-step-title">{step.title}</span>{" "}
                    <span className="lp-flow-step-desc" aria-hidden="true">
                      —
                    </span>{" "}
                    <span className="lp-flow-step-desc">{step.description}</span>
                  </p>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
