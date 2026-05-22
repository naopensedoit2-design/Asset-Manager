"use client";

import { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const whatsappUrl = getWhatsAppUrl(siteConfig?.whatsappNumber ?? "");

  // Select appropriate image based on screen size
  const heroImage = isMobile ? hero?.mobile : hero?.desktop;
  const backgroundUrl = heroImage?.url ?? (isMobile ? "/hero-mobile.jpg" : "/hero-desktop.jpg");
  const videoId = heroImage?.videoUrl;

  const scrollToNext = () => {
    const next = document.getElementById("experiences");
    next?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full h-[100dvh] min-h-[650px] flex items-center justify-center overflow-hidden pb-16 md:pb-0">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />

      {/* YouTube: 16:9 cover (crop overflow) so viewport fills without letterboxing */}
      {mounted && videoId && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <iframe
            className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-screen w-screen min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 border-0"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&playsinline=1&rel=0&fs=0`}
            title="Hero Video"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-8 text-center mt-8 md:mt-0">
        {/* Desktop Content */}
        <div className="hidden md:block">
          {/* Badge */}
          <p className="text-gold font-sans tracking-[0.35em] uppercase text-xs mb-8 opacity-90">
            MP Lafer &bull; Experiência para Casamentos
          </p>

          {/* Title */}
          <h1 className="font-serif text-7xl lg:text-8xl font-medium text-text-primary leading-tight mb-6">
            Uma chegada à altura<br /> do seu casamento
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-text-secondary text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Um clássico que valoriza o momento mais esperado do seu dia com elegância, presença e naturalidade.
          </p>

          {/* Urgency badge */}
          <p className="text-gold font-sans text-sm font-medium mb-8 tracking-wide">
            Agenda 2026 em fase final
          </p>

          {/* CTA buttons */}
          <div className="flex flex-row items-center justify-center gap-4 mb-8">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gold text-black font-semibold uppercase tracking-widest text-sm px-10 py-4 transition-all duration-300 hover:bg-gold-light hover:shadow-[0_20px_25px_-5px_rgba(201,168,76,0.3)] cursor-pointer"
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

        {/* Mobile Content */}
        <div className="block md:hidden flex flex-col mt-12">
          {/* Eyebrow */}
          <p className="text-gold font-sans tracking-[0.35em] uppercase text-[10px] mb-5 opacity-90 font-medium">
            CASEI DE LAFER
          </p>

          {/* Title */}
          <h1 className="font-serif text-[2.75rem] leading-[1.1] text-text-primary mb-5">
            <span className="font-bold">A chegada que</span><br />
            <span className="italic text-gold font-medium">todos vão lembrar</span>
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-text-secondary text-[15px] leading-relaxed mb-8 px-2">
            Um clássico elegante para o momento mais importante do seu casamento.
          </p>

          {/* CTA button */}
          <div className="w-full mb-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-gold text-black font-bold uppercase tracking-widest text-[11px] py-4 rounded-[2px] active:bg-gold-light transition-colors"
            >
              <FaWhatsapp size={18} />
              Consultar disponibilidade no WhatsApp
            </a>
          </div>

          {/* Below CTA */}
          <p className="font-sans text-text-muted text-[11px] leading-relaxed px-4">
            Disponível para chegada da noiva e ensaios pré-wedding.
          </p>
        </div>
      </div>

      {/* Scroll hint */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-muted hover:text-gold transition-colors duration-200 group cursor-pointer"
      >
        <span className="font-sans tracking-[0.3em] uppercase text-[10px] md:text-xs">Descubra</span>
        <span className="block w-px h-8 md:h-10 bg-gradient-to-b from-gold/60 to-transparent group-hover:h-12 md:group-hover:h-14 transition-all duration-500" />
      </button>
    </section>
  );
}
