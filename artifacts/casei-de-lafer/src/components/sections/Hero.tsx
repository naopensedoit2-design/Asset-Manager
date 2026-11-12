import { FaWhatsapp } from "react-icons/fa";
import TopoFoto from "@/components/landing/TopoFoto";
import HeroVideo from "@/components/landing/HeroVideo";
import type { FotoTopo } from "@/lib/landing/dados";
import { CHAT_URL, WHATSAPP_HREF } from "@/lib/landing/links";

interface Props {
  topo: { desktop: FotoTopo | null; mobile: FotoTopo | null };
  /** Escurecimento da foto (0 a 100), como no painel. */
  heroOpacity: number;
}

// Foto de reserva do repositório, para quando o painel ainda não tem foto do topo.
const RESERVA = "/hero-desktop.jpg";

// Montado no servidor: a foto certa (celular ou computador) e o botão do WhatsApp já vêm no HTML,
// sem esperar o JavaScript nem buscar nada depois que a página abre.
export default function Hero({ topo, heroOpacity }: Props) {
  const desktop = topo.desktop?.url || RESERVA;
  const mobile = topo.mobile?.url || desktop;
  const veu = (Math.min(100, Math.max(0, heroOpacity)) / 100).toFixed(2);

  return (
    <section className="relative w-full h-[100dvh] min-h-[650px] flex items-center justify-center overflow-hidden pb-16 md:pb-0">
      {/* Background image */}
      <TopoFoto
        desktop={desktop}
        mobile={mobile}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Vídeo do topo, quando cadastrado no painel */}
      <HeroVideo desktop={topo.desktop?.videoUrl ?? ""} mobile={topo.mobile?.videoUrl ?? ""} />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0, 0, 0, ${veu})` }} />

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
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gold text-black font-semibold uppercase tracking-widest text-sm px-10 py-4 transition-all duration-300 hover:bg-gold-light hover:shadow-[0_20px_25px_-5px_rgba(201,168,76,0.3)] cursor-pointer"
            >
              <FaWhatsapp size={18} />
              Consultar Disponibilidade
            </a>
            <a
              href={CHAT_URL}
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
              href={WHATSAPP_HREF}
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

      {/* Scroll hint: link para a próxima seção, funciona sem JavaScript */}
      <a
        href="#experiences"
        className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-muted hover:text-gold transition-colors duration-200 group cursor-pointer"
      >
        <span className="font-sans tracking-[0.3em] uppercase text-[10px] md:text-xs">Descubra</span>
        <span className="block w-px h-8 md:h-10 bg-gradient-to-b from-gold/60 to-transparent group-hover:h-12 md:group-hover:h-14 transition-all duration-500" />
      </a>
    </section>
  );
}
