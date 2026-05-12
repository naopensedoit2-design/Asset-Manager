"use client";

import SectionWrapper from "@/components/ui/SectionWrapper";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { FaWhatsapp } from "react-icons/fa";

const features = [
  "Carro impecavelmente conservado e preparado para cada cerimônia",
  "Motorista trajado a rigor — elegância do primeiro ao último minuto",
  "Flexibilidade de horários para ensaios e cerimônias",
  "Estética perfeita para fotografia em filme e digital",
  "Interior em couro creme original e detalhes em madeira de lei",
];

export default function AboutCar() {
  const { data: siteConfig } = useSiteConfig();
  const whatsappUrl = getWhatsAppUrl(siteConfig?.whatsappNumber ?? "");

  return (
    <SectionWrapper className="bg-bg-primary">
      <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Text side */}
        <div>
          <p className="text-gold font-sans tracking-[0.3em] uppercase text-xs mb-6">
            O Veículo
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-text-primary mb-6 leading-tight">
            Uma Joia Rara
          </h2>
          <p className="font-sans text-text-secondary text-base leading-relaxed mb-6">
            O MP Lafer é mais do que um carro antigo — é um pedaço da história automotiva. Com suas linhas inspiradas no clássico{" "}
            <strong className="text-text-primary">MG TD britânico de 1950</strong>, seu interior em{" "}
            <strong className="text-text-primary">couro creme legítimo</strong> e{" "}
            <strong className="text-text-primary">acabamentos em madeira de lei</strong>, ele oferece uma estética romântica inigualável.
          </p>

          <ul className="space-y-3 mb-10">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 font-sans text-text-secondary text-sm">
                <span className="text-gold mt-0.5 flex-shrink-0">●</span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 border border-gold text-gold font-semibold uppercase tracking-widest text-sm px-8 py-3.5 transition-all duration-300 hover:bg-gold hover:text-black active:scale-[0.97]"
          >
            <FaWhatsapp size={16} />
            Consultar Data no WhatsApp
          </a>
        </div>

        {/* Image side */}
        <div className="relative">
          <div className="absolute -inset-4 border border-border-gold opacity-40" />
          <img
            src="/hero-desktop.jpg"
            alt="MP Lafer — carro clássico para casamentos na Serra Gaúcha"
            className="w-full h-[480px] object-cover object-center relative z-10"
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-bg-primary to-transparent z-20" />
        </div>
      </div>
    </SectionWrapper>
  );
}
