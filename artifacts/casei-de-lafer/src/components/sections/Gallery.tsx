import { useQuery } from "@tanstack/react-query";
import SectionWrapper from "@/components/ui/SectionWrapper";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { FaWhatsapp } from "react-icons/fa";

interface GalleryImage {
  id: number;
  url: string;
  alt: string;
  coupleTag: string;
  location: string;
}

function useGallery() {
  return useQuery<GalleryImage[]>({
    queryKey: ["gallery"],
    queryFn: () => fetch("/api/gallery").then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });
}

export default function Gallery() {
  const { data: images = [], isLoading } = useGallery();
  const { data: siteConfig } = useSiteConfig();
  const whatsappUrl = getWhatsAppUrl(siteConfig?.whatsappNumber ?? "");

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
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 h-[400px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-bg-elevated animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
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
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {images.slice(0, 6).map((img, i) => (
            <div
              key={img.id}
              className={`overflow-hidden bg-bg-elevated group ${
                i === 1 ? "row-span-2" : ""
              }`}
            >
              <img
                src={img.url}
                alt={img.alt || `Casamento com MP Lafer — ${img.coupleTag}`}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                style={{ minHeight: i === 1 ? "400px" : "200px" }}
              />
            </div>
          ))}
        </div>
      )}
    </SectionWrapper>
  );
}
