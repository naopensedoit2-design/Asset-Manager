"use client";

import { useSiteConfig } from "@/hooks/useSiteConfig";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { FaWhatsapp } from "react-icons/fa";

export default function Footer() {
  const { data: siteConfig } = useSiteConfig();
  const whatsappUrl = getWhatsAppUrl(
    siteConfig?.whatsappNumber ?? "",
    "Olá! Gostaria de garantir minha data exclusiva com o MP Lafer para o meu casamento.",
  );
  const year = new Date().getFullYear();

  return (
    <footer>
      {/* CTA Final */}
      <section className="relative py-28 overflow-hidden">
        {/* Dark textured background */}
        <div className="absolute inset-0 bg-bg-secondary" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(201,168,76,0.3) 39px, rgba(201,168,76,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(201,168,76,0.3) 39px, rgba(201,168,76,0.3) 40px)`,
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-5xl md:text-6xl text-gold mb-6 leading-tight">
            A sua vez chegou.
          </h2>
          <p className="font-sans text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            Nossa agenda de casamentos é concorrida. Entre em contato para verificar a disponibilidade da sua data e receber um orçamento personalizado.
          </p>
          <p className="text-gold font-sans text-sm font-medium mb-10">
            Agenda aberta para 2026 e 2027. Poucas datas restantes.
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gold text-black font-semibold uppercase tracking-widest text-sm px-12 py-5 text-base transition-all duration-300 hover:bg-gold-light hover:shadow-[0_0_48px_rgba(201,168,76,0.5)] active:scale-[0.97]"
          >
            <FaWhatsapp size={20} />
            Garantir Minha Data Exclusiva
          </a>
        </div>
      </section>

      {/* Footer bar */}
      <div className="bg-bg-primary border-t border-border-subtle py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div>
            <p className="font-serif text-gold text-xl">Casei de Lafer</p>
            <p className="font-sans text-text-muted text-xs mt-0.5">
              Transformando chegadas em cenas de cinema.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-gold transition-colors flex items-center gap-2"
              title="WhatsApp"
            >
              <FaWhatsapp size={18} />
            </a>
            <a
              href="https://instagram.com/eucaseidelafer"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-text-muted hover:text-gold transition-colors text-sm"
            >
              @eucaseidelafer
            </a>
            <a
              href="/admin"
              className="font-sans text-text-muted hover:text-gold transition-colors text-xs"
            >
              Admin
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-6 pt-4 border-t border-border-subtle">
          <p className="font-sans text-text-muted text-xs text-center">
            &copy; {year} Casei de Lafer. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
