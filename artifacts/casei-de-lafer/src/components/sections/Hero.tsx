"use client";

import { useQuery } from "@tanstack/react-query";
import { FaWhatsapp } from "react-icons/fa";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { getWhatsAppUrl } from "@/lib/whatsapp";

interface HeroImage {
  id: number;
  type: string;
  url: string;
  videoUrl: string;
}

interface HeroData {
  desktop: HeroImage | null;
  mobile: HeroImage | null;
}

function useHeroImage() {
  return useQuery<HeroData>({
    queryKey: ["hero"],
    queryFn: () => fetch("/api/hero").then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });
}

export default function Hero() {
  const { data: hero } = useHeroImage();
  const { data: siteConfig } = useSiteConfig();

  const whatsappUrl = getWhatsAppUrl(siteConfig?.whatsappNumber ?? "");

  const desktopUrl = hero?.desktop?.url ?? "/hero-desktop.jpg";

  const scrollToNext = () => {
    const next = document.getElementById("experiences");
    next?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${desktopUrl})` }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-8 text-center">
        {/* Badge */}
        <p className="text-gold font-sans tracking-[0.35em] uppercase text-xs mb-8 opacity-90">
          MP Lafer &bull; Experiência para Casamentos
        </p>

        {/* Title */}
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium text-text-primary leading-tight mb-6">
          Uma chegada à altura<br className="hidden md:block" /> do seu casamento
        </h1>

        {/* Subtitle */}
        <p className="font-sans text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Um clássico que valoriza o momento mais esperado do seu dia com elegância, presença e naturalidade.
        </p>

        {/* Urgency badge */}
        <p className="text-gold font-sans text-sm font-medium mb-8 tracking-wide">
          Agenda 2026 em fase final
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gold text-black font-semibold uppercase tracking-widest text-sm px-10 py-4 transition-all duration-300 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(201,168,76,0.5)] active:scale-[0.97]"
          >
            <FaWhatsapp size={18} />
            Consultar Disponibilidade
          </a>
          <a
            href="/orcamento/detalhado"
            className="font-sans text-text-secondary text-sm hover:text-gold transition-colors duration-200 underline underline-offset-4"
          >
            &rsaquo; Fazer orçamento detalhado
          </a>
        </div>

        {/* Footer info */}
        <p className="font-sans text-text-muted text-xs tracking-widest uppercase">
          Região Sul &bull; 3 anos de experiência em casamentos
        </p>
      </div>

      {/* Scroll hint */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-muted hover:text-gold transition-colors duration-200 group cursor-pointer"
      >
        <span className="font-sans tracking-[0.3em] uppercase text-xs">Descubra</span>
        <span className="block w-px h-10 bg-gradient-to-b from-gold/60 to-transparent group-hover:h-14 transition-all duration-500" />
      </button>
    </section>
  );
}
