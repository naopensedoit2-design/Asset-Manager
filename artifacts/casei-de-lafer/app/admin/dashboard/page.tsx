"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import WhatsAppSection from "./sections/WhatsAppSection";
import HeroSection from "./sections/HeroSection";
import GallerySection from "./sections/GallerySection";
import DatesSection from "./sections/DatesSection";
import ConfigSection from "./sections/ConfigSection";
import GestaoView from "@/components/gestor/GestaoView";

function Dashboard() {
  const params = useSearchParams();
  const tab = params.get("aba") === "site" ? "site" : "gestao";

  return (
    <div>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {tab === "gestao" ? (
          <GestaoView />
        ) : (
          <>
            <WhatsAppSection />
            <HeroSection />
            <GallerySection />
            <DatesSection />
            <ConfigSection />
          </>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div />}>
      <Dashboard />
    </Suspense>
  );
}
