"use client";

import { useRouter } from "next/navigation";
import WhatsAppSection from "./sections/WhatsAppSection";
import HeroSection from "./sections/HeroSection";
import GallerySection from "./sections/GallerySection";
import DatesSection from "./sections/DatesSection";
import ConfigSection from "./sections/ConfigSection";

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="sticky top-0 z-50 bg-bg-secondary border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="font-serif text-lg text-text-primary">
            Painel — Casei de Lafer
          </h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Ver site ↗
            </a>
            <button
              onClick={handleLogout}
              className="font-sans text-sm text-text-muted hover:text-destructive transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <WhatsAppSection />
        <HeroSection />
        <GallerySection />
        <DatesSection />
        <ConfigSection />
      </main>
    </div>
  );
}
