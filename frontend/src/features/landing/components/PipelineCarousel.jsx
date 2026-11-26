import React, { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const PIPELINE_STAGES = [
  {
    number: "01",
    title: "Document Intake & Routing",
    description:
      "Government PDF records are uploaded individually or in batches. Each document is assigned a SHA-256 checksum to detect duplicates and preserve the integrity of original records.",
    highlights: [
      "Single and batch PDF ingestion",
      "SHA-256 checksum and duplicate detection",
      "Immutable original document storage",
      "Document metadata registration",
    ],
  },
  {
    number: "02",
    title: "Format Extraction & Dispatch",
    description:
      "The system identifies whether a document contains digital text or scanned pages and applies the appropriate extraction method to capture its content for further processing.",
    highlights: [
      "Digital PDF parsing using PyMuPDF",
      "OCR for scanned documents using Tesseract",
      "Gujarati, Hindi and English text extraction",
      "Asynchronous processing and task dispatch",
    ],
  },
  {
    number: "03",
    title: "Normalization & Multilingual NLP",
    description:
      "Extracted text is normalized and organized before language-specific processing. Gujarati and Hindi content is translated using IndicTrans2, while English content bypasses translation to preserve legal nuance.",
    highlights: [
      "Unicode NFKC normalization",
      "Gujarati, Hindi and English language detection",
      "IndicTrans2 multilingual translation",
      "NLP preprocessing and lemmatization",
    ],
  },
  {
    number: "04",
    title: "AI Extraction & Vector Indexing",
    description:
      "Government-specific entity recognition and structured AI extraction identify relevant entities and evidence claims. Semantic embeddings enable efficient retrieval of related information across case documents.",
    highlights: [
      "Government NER across 12 entity categories",
      "Schema-grounded AI evidence extraction",
      "Semantic chunking and dense embeddings",
      "Qdrant vector database indexing",
    ],
  },
  {
    number: "05",
    title: "Central Evidence Ledger & Intelligence",
    description:
      "Extracted evidence is consolidated into a centralized ledger. The system reconstructs chronological events, identifies contradictions between records and retrieves relevant source-linked evidence.",
    highlights: [
      "Centralized MongoDB evidence ledger",
      "Chronological event reconstruction",
      "Pairwise contradiction detection",
      "Hybrid semantic evidence retrieval",
    ],
  },
  {
    number: "06",
    title: "Briefing Synthesis & Supervisory Review",
    description:
      "The system synthesizes extracted evidence into a structured 16-section investigation briefing. Independent supervisory reviewers verify individual claims against original source documents before approving the final briefing.",
    highlights: [
      "Structured 16-section briefing generation",
      "Independent atomic claim verification",
      "Maker-checker supervisory approval",
      "PDF and DOCX export",
    ],
  },
];

function StageIllustration({ index }) {
  if (index === 0) {
    return (
      <svg
        viewBox="0 0 260 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="lp-stage-svg"
        aria-hidden="true"
      >
        <path
          d="M84 18H166L194 46V160C194 166.627 188.627 172 182 172H84C77.3726 172 72 166.627 72 160V30C72 23.3726 77.3726 18 84 18Z"
          fill="#F9FAFB"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <path
          d="M166 18V46H194"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M52 38H140L170 68V182C170 188.627 164.627 194 158 194H52C45.3726 194 40 188.627 40 182V50C40 43.3726 45.3726 38 52 38Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <path
          d="M140 38V68H170"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="56" y="56" width="44" height="24" rx="4" fill="#EA580C" />
        <text
          x="78"
          y="72"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          PDF
        </text>
        <rect x="56" y="96" width="96" height="7" rx="3.5" fill="#E2E8F0" />
        <rect x="56" y="114" width="96" height="7" rx="3.5" fill="#E2E8F0" />
        <rect x="56" y="132" width="76" height="7" rx="3.5" fill="#E2E8F0" />
        <rect x="56" y="150" width="90" height="7" rx="3.5" fill="#E2E8F0" />
        <rect
          x="144"
          y="128"
          width="76"
          height="58"
          rx="10"
          fill="#FFF7F2"
          stroke="#EA580C"
          strokeWidth="2"
        />
        <path
          d="M162 146H202M162 157H202M162 168H186"
          stroke="#EA580C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="206" cy="172" r="17" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2" />
        <path
          d="M199 172L204 177L213 167"
          stroke="#EA580C"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg
        viewBox="0 0 260 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="lp-stage-svg"
        aria-hidden="true"
      >
        <path
          d="M36 42H106L124 60V164C124 169.523 119.523 174 114 174H36C30.4772 174 26 169.523 26 164V52C26 46.4772 30.4772 42 36 42Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <path
          d="M106 42V60H124"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="40" y="62" width="38" height="18" rx="4" fill="#EA580C" />
        <text
          x="59"
          y="74"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          PDF
        </text>
        <rect x="40" y="92" width="68" height="6" rx="3" fill="#E2E8F0" />
        <rect x="40" y="106" width="58" height="6" rx="3" fill="#FDBA74" />
        <rect x="40" y="120" width="68" height="6" rx="3" fill="#E2E8F0" />
        <rect x="40" y="134" width="50" height="6" rx="3" fill="#E2E8F0" />
        <line
          x1="20"
          y1="109"
          x2="130"
          y2="109"
          stroke="#EA580C"
          strokeWidth="2"
          strokeDasharray="4 3"
        />

        <path
          d="M132 108H150M150 108L145 103M150 108L145 113"
          stroke="#EA580C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <rect
          x="156"
          y="42"
          width="84"
          height="132"
          rx="10"
          fill="#FFF7F2"
          stroke="#EA580C"
          strokeWidth="2"
        />
        <text
          x="198"
          y="64"
          textAnchor="middle"
          fill="#EA580C"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          OCR · TEXT
        </text>
        <rect x="170" y="78" width="56" height="6" rx="3" fill="#EA580C" fillOpacity="0.35" />
        <rect x="170" y="94" width="48" height="6" rx="3" fill="#CBD5E1" />
        <rect x="170" y="110" width="56" height="6" rx="3" fill="#CBD5E1" />
        <rect x="170" y="126" width="42" height="6" rx="3" fill="#EA580C" fillOpacity="0.35" />
        <rect x="170" y="142" width="52" height="6" rx="3" fill="#CBD5E1" />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg
        viewBox="0 0 260 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="lp-stage-svg"
        aria-hidden="true"
      >
        <rect
          x="20"
          y="28"
          width="82"
          height="36"
          rx="8"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <text
          x="61"
          y="50"
          textAnchor="middle"
          fill="#111827"
          fontSize="11"
          fontWeight="700"
          fontFamily="DM Sans, sans-serif"
        >
          Gujarati
        </text>

        <rect
          x="20"
          y="86"
          width="82"
          height="36"
          rx="8"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <text
          x="61"
          y="108"
          textAnchor="middle"
          fill="#111827"
          fontSize="11"
          fontWeight="700"
          fontFamily="DM Sans, sans-serif"
        >
          Hindi
        </text>

        <rect
          x="20"
          y="144"
          width="82"
          height="36"
          rx="8"
          fill="#FFFFFF"
          stroke="#EA580C"
          strokeWidth="2"
        />
        <text
          x="61"
          y="166"
          textAnchor="middle"
          fill="#EA580C"
          fontSize="11"
          fontWeight="700"
          fontFamily="DM Sans, sans-serif"
        >
          English
        </text>

        <path
          d="M102 46H128V104H148"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M102 104H148" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M102 162H128V104H148"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <rect
          x="148"
          y="46"
          width="92"
          height="118"
          rx="12"
          fill="#FFF7F2"
          stroke="#EA580C"
          strokeWidth="2"
        />
        <rect x="164" y="64" width="60" height="18" rx="4" fill="#EA580C" />
        <text
          x="194"
          y="76"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="9"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          NFKC · NLP
        </text>
        <rect x="164" y="96" width="60" height="6.5" rx="3.25" fill="#CBD5E1" />
        <rect x="164" y="112" width="48" height="6.5" rx="3.25" fill="#FDBA74" />
        <rect x="164" y="128" width="56" height="6.5" rx="3.25" fill="#CBD5E1" />
        <rect x="164" y="144" width="40" height="6.5" rx="3.25" fill="#CBD5E1" />
      </svg>
    );
  }

  if (index === 3) {
    return (
      <svg
        viewBox="0 0 260 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="lp-stage-svg"
        aria-hidden="true"
      >
        <rect
          x="22"
          y="48"
          width="76"
          height="110"
          rx="10"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <rect x="34" y="66" width="48" height="7" rx="3.5" fill="#EA580C" />
        <rect x="34" y="84" width="52" height="6" rx="3" fill="#E2E8F0" />
        <rect x="34" y="98" width="44" height="6" rx="3" fill="#FDBA74" />
        <rect x="34" y="112" width="52" height="6" rx="3" fill="#E2E8F0" />
        <rect x="34" y="126" width="38" height="6" rx="3" fill="#E2E8F0" />

        <path d="M98 76H134" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M98 104H134" stroke="#EA580C" strokeWidth="2" />
        <path d="M98 134H134" stroke="#CBD5E1" strokeWidth="2" />

        <rect
          x="134"
          y="34"
          width="102"
          height="32"
          rx="8"
          fill="#FFF7F2"
          stroke="#EA580C"
          strokeWidth="1.8"
        />
        <text
          x="185"
          y="54"
          textAnchor="middle"
          fill="#EA580C"
          fontSize="10"
          fontWeight="700"
          fontFamily="DM Sans, sans-serif"
        >
          12 Entity Tags
        </text>

        <rect
          x="134"
          y="82"
          width="102"
          height="34"
          rx="8"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <text
          x="185"
          y="103"
          textAnchor="middle"
          fill="#111827"
          fontSize="10"
          fontWeight="700"
          fontFamily="DM Sans, sans-serif"
        >
          Evidence Claims
        </text>

        <path
          d="M144 142C144 136.477 162.356 132 185 132C207.644 132 226 136.477 226 142V170C226 175.523 207.644 180 185 180C162.356 180 144 175.523 144 170V142Z"
          fill="#FFF7F2"
          stroke="#EA580C"
          strokeWidth="2"
        />
        <ellipse cx="185" cy="142" rx="41" ry="10" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2" />
        <text
          x="185"
          y="167"
          textAnchor="middle"
          fill="#EA580C"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          Qdrant Vector DB
        </text>
      </svg>
    );
  }

  if (index === 4) {
    return (
      <svg
        viewBox="0 0 260 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="lp-stage-svg"
        aria-hidden="true"
      >
        <rect
          x="34"
          y="24"
          width="192"
          height="62"
          rx="10"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <rect x="48" y="38" width="52" height="7" rx="3.5" fill="#EA580C" />
        <rect x="110" y="38" width="102" height="7" rx="3.5" fill="#E2E8F0" />
        <rect x="48" y="54" width="44" height="7" rx="3.5" fill="#CBD5E1" />
        <rect x="110" y="54" width="84" height="7" rx="3.5" fill="#E2E8F0" />
        <rect x="48" y="70" width="52" height="6" rx="3" fill="#CBD5E1" />
        <rect x="110" y="70" width="94" height="6" rx="3" fill="#FDBA74" />

        <path d="M84 86V112" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M178 86V112" stroke="#EA580C" strokeWidth="2" />

        <rect
          x="26"
          y="112"
          width="102"
          height="72"
          rx="10"
          fill="#F9FAFB"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <line x1="44" y1="128" x2="44" y2="170" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="44" cy="134" r="4.5" fill="#EA580C" />
        <rect x="56" y="130" width="58" height="7" rx="3.5" fill="#E2E8F0" />
        <circle cx="44" cy="150" r="4.5" fill="#EA580C" />
        <rect x="56" y="146" width="46" height="7" rx="3.5" fill="#E2E8F0" />
        <circle cx="44" cy="166" r="4.5" fill="#EA580C" />
        <rect x="56" y="162" width="52" height="7" rx="3.5" fill="#E2E8F0" />

        <rect
          x="138"
          y="112"
          width="96"
          height="72"
          rx="10"
          fill="#FFF7F2"
          stroke="#EA580C"
          strokeWidth="2"
        />
        <rect
          x="150"
          y="126"
          width="72"
          height="8"
          rx="4"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        <rect
          x="150"
          y="162"
          width="72"
          height="8"
          rx="4"
          fill="#FFFFFF"
          stroke="#EA580C"
          strokeWidth="1.5"
        />
        <path d="M186 139L194 153H178L186 139Z" fill="#EA580C" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 260 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="lp-stage-svg"
      aria-hidden="true"
    >
      <rect
        x="24"
        y="42"
        width="66"
        height="90"
        rx="8"
        fill="#F9FAFB"
        stroke="#CBD5E1"
        strokeWidth="2"
      />
      <rect x="34" y="56" width="32" height="6" rx="3" fill="#CBD5E1" />
      <rect x="34" y="70" width="46" height="6" rx="3" fill="#E2E8F0" />
      <rect x="34" y="84" width="42" height="6" rx="3" fill="#FDBA74" />
      <rect x="34" y="98" width="46" height="6" rx="3" fill="#E2E8F0" />

      <path d="M90 88H116" stroke="#EA580C" strokeWidth="2" strokeDasharray="3 3" />

      <path
        d="M122 28H198L222 52V156C222 161.523 217.523 166 212 166H122C116.477 166 112 161.523 112 156V38C112 32.4772 116.477 28 122 28Z"
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="2"
      />
      <path
        d="M198 28V52H222"
        fill="#F1F5F9"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="128" y="46" width="60" height="20" rx="4" fill="#EA580C" />
      <text
        x="158"
        y="59.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9.5"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        16-SEC
      </text>
      <rect x="128" y="80" width="76" height="7" rx="3.5" fill="#E2E8F0" />
      <rect x="128" y="96" width="66" height="7" rx="3.5" fill="#E2E8F0" />
      <rect x="128" y="112" width="76" height="7" rx="3.5" fill="#FDBA74" />
      <rect x="128" y="128" width="54" height="7" rx="3.5" fill="#E2E8F0" />

      <path
        d="M198 118L226 130V154C226 171 214 185 198 190C182 185 170 171 170 154V130L198 118Z"
        fill="#FFFFFF"
        stroke="#EA580C"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M187 154L194 161L209 146"
        stroke="#EA580C"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PipelineCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const current = PIPELINE_STAGES[activeIndex];

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + PIPELINE_STAGES.length) % PIPELINE_STAGES.length);
  };

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % PIPELINE_STAGES.length);
  };

  const handleSelect = (idx) => {
    if (idx === activeIndex) return;
    setDirection(idx > activeIndex ? 1 : -1);
    setActiveIndex(idx);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const slideVariants = shouldReduceMotion
    ? {
        enter: { opacity: 1, x: 0 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 1, x: 0 },
      }
    : {
        enter: (dir) => ({ opacity: 0, x: dir > 0 ? 18 : -18 }),
        center: { opacity: 1, x: 0 },
        exit: (dir) => ({ opacity: 0, x: dir > 0 ? -18 : 18 }),
      };

  return (
    <section id="how-it-works" className="lp-pipeline">
      <div className="lp-container">
        {/* Section Header */}
        <div className="lp-section-header">
          <div className="lp-section-eyebrow-center">
            <span className="lp-eyebrow-bar" aria-hidden="true" />
            <span className="lp-eyebrow-text">THE PIPELINE</span>
          </div>

          <h2 className="lp-section-title">How It Works</h2>

          <p className="lp-section-subtitle">
            A six-stage intelligence architecture that transforms raw government documents
            into structured, traceable and independently reviewed investigation briefings.
          </p>
        </div>

        {/* Interactive Carousel Row */}
        <div
          className="lp-carousel-row"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              handlePrev();
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              handleNext();
            }
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous pipeline stage"
            className="lp-carousel-arrow-prev"
          >
            <ChevronLeft className="lp-carousel-arrow-icon" strokeWidth={2.2} aria-hidden="true" />
          </button>

          <div
            role="region"
            aria-roledescription="carousel"
            aria-label={`Stage ${current.number}: ${current.title}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="lp-carousel-card"
          >
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={current.number}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
                className="lp-carousel-slide"
              >
                {/* Stage Text Details */}
                <div className="lp-stage-content">
                  <div className="lp-font-display lp-stage-number lp-tabular">
                    {current.number}
                  </div>

                  <div>
                    <h3 className="lp-stage-title">{current.title}</h3>
                    <p className="lp-stage-desc">{current.description}</p>

                    <ul className="lp-stage-highlights">
                      {current.highlights.map((item) => (
                        <li key={item} className="lp-stage-highlight-item">
                          <span className="lp-stage-check-badge" aria-hidden="true">
                            <Check className="lp-stage-check-icon" strokeWidth={2.5} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Vertical Hairline Divider */}
                <div className="lp-stage-divider" aria-hidden="true" />

                {/* Stage Vector Illustration */}
                <div className="lp-stage-illustration-wrap">
                  <StageIllustration index={activeIndex} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next pipeline stage"
            className="lp-carousel-arrow-next"
          >
            <ChevronRight className="lp-carousel-arrow-icon" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div
          className="lp-carousel-dots"
          role="tablist"
          aria-label="Pipeline stage selector"
        >
          {PIPELINE_STAGES.map((stage, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={stage.number}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Go to stage ${stage.number}: ${stage.title}`}
                onClick={() => handleSelect(idx)}
                className={`lp-carousel-dot${isSelected ? " is-selected" : ""}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
