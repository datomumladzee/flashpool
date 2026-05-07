"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import HowItWorks from "@/components/HowItWorks";
import WhyOnChain from "@/components/WhyOnChain";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";

export default function Home() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="min-h-screen">
      {!introDone && <Intro onComplete={() => setIntroDone(true)} />}
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
