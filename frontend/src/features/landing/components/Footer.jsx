import React from "react";
import lekhLogo from "../../../assets/logo.png";

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <img src={lekhLogo} alt="LEKH logo" className="lp-footer-logo" />
            <span className="lp-font-display lp-footer-brand-name">LEKH</span>
          </div>

          <div className="lp-footer-system">
            Ledger for Evidence and Knowledge Handling
          </div>

          <div className="lp-footer-meta lp-tabular">
            SFIC 2026 <span className="lp-footer-sep">|</span> PS000234
          </div>
        </div>

        <p className="lp-footer-note">
          Designed for authorized government officers and law enforcement agencies.
        </p>
      </div>
    </footer>
  );
}
