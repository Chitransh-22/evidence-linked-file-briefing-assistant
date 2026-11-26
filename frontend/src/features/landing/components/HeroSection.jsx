import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroIllustration from "../../../assets/herosection.png";
import { useAuthStore } from "../../../store/authStore";

export default function HeroSection() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleAccessPlatform = () => {
    navigate(isAuthenticated ? "/dashboard" : "/login");
  };

  const handleLearnHowItWorks = (e) => {
    e.preventDefault();
    const target = document.getElementById("how-it-works");
    if (!target) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <section className="lp-hero">
      <div className="lp-container-wide lp-hero-inner">
        <div className="lp-hero-grid">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lp-hero-copy">
            <div className="lp-hero-eyebrow">
              <span className="lp-eyebrow-bar" aria-hidden="true" />
              <span className="lp-eyebrow-text">EVIDENCE LINKED FILE BRIEFING ASSISTANT</span>
            </div>

            <h1 className="lp-hero-title">
              From complex records
              <br className="lp-hero-br" /> to{" "}
              <span className="lp-hero-title-accent">
                evidence-linked
                <br className="lp-hero-br" /> intelligence.
              </span>
            </h1>

            <p className="lp-hero-desc">
              LEKH transforms complex multilingual government files into structured, source-linked
              evidence and traceable investigation briefings. Powered by AI-assisted document
              analysis, entity extraction, chronology reconstruction and contradiction detection,
              LEKH enables authorized officers to examine records, verify findings and make
              informed, evidence-backed decisions.
            </p>

            <div className="lp-hero-actions">
              <button
                type="button"
                onClick={handleAccessPlatform}
                className="lp-btn-primary"
              >
                <span>Access LEKH</span>
                <ArrowRight className="lp-btn-primary-icon" strokeWidth={2.2} aria-hidden="true" />
              </button>

              <a
                href="#how-it-works"
                onClick={handleLearnHowItWorks}
                className="lp-btn-secondary"
              >
                Learn How It Works
              </a>
            </div>
          </div>

          {/* Right Column: Bounded Hero Illustration */}
          <div className="lp-hero-media">
            <div className="lp-hero-media-frame">
              <img
                src={heroIllustration}
                alt="LEKH government files analysis illustration depicting entity extraction, chronology reconstruction, contradiction detection, source linking, and investigation briefing output"
                className="lp-hero-media-img"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
