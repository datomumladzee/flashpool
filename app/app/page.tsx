"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";

export default function Home() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="min-h-screen">
      {!introDone && <Intro onComplete={() => setIntroDone(true)} />}
      <Navbar />
      <Hero />
    </div>
  );
}
