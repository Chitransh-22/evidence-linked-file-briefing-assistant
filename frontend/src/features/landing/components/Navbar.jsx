import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import lekhLogo from "../../../assets/logo.png";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="lp-navbar">
      <div className="lp-container-wide lp-navbar-inner">
        <Link to="/" className="lp-brand-link" aria-label="LEKH — Ledger for Evidence and Knowledge Handling">
          <img src={lekhLogo} alt="LEKH logo" className="lp-brand-logo" />
          <span className="lp-brand-text">
            <span className="lp-brand-name">LEKH</span>
            <span className="lp-brand-fullform">Ledger for Evidence and Knowledge Handling</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="lp-login-btn"
        >
          <User className="lp-login-btn-icon" strokeWidth={2.2} aria-hidden="true" />
          <span>Log In</span>
        </button>
      </div>
    </header>
  );
}
