import React from "react";
import CapabilitiesSection from "./components/CapabilitiesSection.jsx";
import Footer from "./components/Footer.jsx";
import HeroSection from "./components/HeroSection.jsx";
import Navbar from "./components/Navbar.jsx";
import PipelineCarousel from "./components/PipelineCarousel.jsx";
import WorkingFlow from "./components/WorkingFlow.jsx";
import "./styles/landing.css";

export function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <main className="lp-main">
        <HeroSection />
        <PipelineCarousel />
        <WorkingFlow />
        <CapabilitiesSection />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
