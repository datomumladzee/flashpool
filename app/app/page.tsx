"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import HowItWorks from "@/components/HowItWorks";
import WhyOnChain from "@/components/WhyOnChain";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";

const SESSION_KEY = "flashpool_intro_seen";

export default function Home() {
  // Tri-state so neither Intro nor "no Intro" flashes before the
  // sessionStorage check runs in the effect.
  const [introState, setIntroState] = useState<"pending" | "playing" | "done">(
    "pending",
  );

  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY) === "1";
    setIntroState(seen ? "done" : "playing");
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setIntroState("done");
  };

  return (
    <div className="min-h-screen">
      {introState === "playing" && <Intro onComplete={handleIntroComplete} />}
      <Navbar />
      <Hero />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <WhyOnChain />
      <SectionDivider />
      <FinalCTA />
      <SectionDivider />
      <Footer />
    </div>
  );
}
