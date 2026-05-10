import SectionWrapper from "@/components/ui/SectionWrapper";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { FaWhatsapp } from "react-icons/fa";

const experiences = [
  {
    title: "Chegada da Noiva",
    description:
      "A bordo do nosso MP Lafer impecável, sua chegada à cerimônia será o ápice da emoção. Olhares parados, fotos cinematográficas e um momento que ninguém vai esquecer.",
    icon: "✦",
  },
  {
    title: "Ensaios Pré-Wedding",
    description:
      "Locação do veículo para sessões fotográficas inesquecíveis. O charme vintage perfeito para eternizar o amor de vocês antes do altar — nas serras, vinícolas e caminhos da região.",
    icon: "✦",
  },
  {
    title: "Fuga dos Noivos",
    description:
      "A saída da cerimônia rumo à festa com estilo, glamour e a capota aberta. Brindando com champanhe o início de uma nova vida juntos.",
    icon: "✦",
  },
];

export default function Experiences() {
  const { data: siteConfig } = useSiteConfig();
  const whatsappUrl = getWhatsAppUrl(siteConfig?.whatsappNumber ?? "");

  return (
    <SectionWrapper id="experiences" className="bg-bg-secondary">
      {/* Scroll target label */}
      <div className="flex flex-col items-center mb-16">
        <p className="text-text-muted font-sans tracking-[0.3em] uppercase text-xs mb-4">
          Descubra
        </p>
        <div className="w-px h-10 bg-gradient-to-b from-gold/40 to-transparent" />
      </div>

      <div className="text-center mb-14">
        <h2 className="font-serif text-4xl md:text-5xl text-gold mb-4">
          Experiências Exclusivas
        </h2>
        <p className="font-sans text-text-secondary text-lg max-w-xl mx-auto">
          Cada detalhe pensado para que o seu grande dia seja cinematográfico.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-14">
        {experiences.map((exp) => (
          <div
            key={exp.title}
            className="bg-bg-card border border-border-subtle p-8 group hover:border-border-gold transition-colors duration-300"
          >
            <div className="w-8 h-px bg-gold mb-6" />
            <h3 className="font-serif text-2xl text-text-primary mb-4">
              {exp.title}
            </h3>
            <p className="font-sans text-text-secondary text-sm leading-relaxed">
              {exp.description}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-gold text-black font-semibold uppercase tracking-widest text-sm px-10 py-4 transition-all duration-300 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(201,168,76,0.5)] active:scale-[0.97]"
        >
          <FaWhatsapp size={18} />
          Verificar Disponibilidade
        </a>
      </div>
    </SectionWrapper>
  );
}
