"use client";

import SectionWrapper from "@/components/ui/SectionWrapper";
import FotoSegura from "@/components/landing/FotoSegura";
import type { FotoGaleria } from "@/lib/landing/dados";
import { WHATSAPP_HREF } from "@/lib/landing/links";
import { FaWhatsapp } from "react-icons/fa";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Texto alternativo quando a foto não tem um no painel (sem nome de casal).
const ALT_PADRAO = "MP Lafer conversível em casamento ou ensaio";

// As fotos chegam do servidor (já no HTML) e cada uma vem do Cloudinary no tamanho da tela.
export default function Gallery({ fotos }: { fotos: FotoGaleria[] }) {
  const whatsappUrl = WHATSAPP_HREF;

  return (
    <SectionWrapper className="bg-bg-secondary">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="font-serif text-4xl md:text-5xl text-gold mb-3">
            Galeria de Memórias
          </h2>
          <p className="font-sans text-text-secondary text-base max-w-md">
            Momentos reais de casais que escolheram o MP Lafer para emoldurar o dia mais feliz de suas vidas.
          </p>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-gold text-gold font-semibold uppercase tracking-widest text-xs px-6 py-3 transition-all duration-300 hover:bg-gold hover:text-black flex-shrink-0"
        >
          <FaWhatsapp size={14} />
          Agendar Minha Data
        </a>
      </div>

      {/* Gallery grid */}
      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-border-subtle">
          <div className="w-8 h-px bg-gold mb-6 mx-auto" />
          <p className="font-serif text-text-secondary text-2xl italic">
            Nenhuma memória registrada ainda.
          </p>
          <p className="font-sans text-text-muted text-sm mt-3">
            Em breve, momentos inesquecíveis de casais apaixonados.
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-4">
              {fotos.map((img) => (
                <CarouselItem
                  key={img.id}
                  className="pl-3 md:pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <div className="overflow-hidden bg-bg-elevated group aspect-[3/4] w-full">
                    <FotoSegura
                      src={img.url}
                      alt={img.alt || ALT_PADRAO}
                      larguras={[480, 720, 960]}
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 85vw"
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="hidden md:flex justify-end gap-3 mt-8">
              <CarouselPrevious className="static translate-x-0 translate-y-0 h-12 w-12 border-gold text-gold hover:bg-gold hover:text-black transition-colors" />
              <CarouselNext className="static translate-x-0 translate-y-0 h-12 w-12 border-gold text-gold hover:bg-gold hover:text-black transition-colors" />
            </div>
          </Carousel>
        </div>
      )}
    </SectionWrapper>
  );
}
