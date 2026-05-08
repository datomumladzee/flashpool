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
  // Default to "playing" so the intro overlay is rendered during SSR — that's
  // what kills the red-bg flash before hydration. On revisits the inline
  // script in <head> sets `data-intro-skip` so CSS hides the overlay before
  // first paint; this effect then unmounts it shortly after hydration.
  const [introState, setIntroState] = useState<"playing" | "done">("playing");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setIntroState("done");
    }
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
