import { INSTAGRAM, MARCA, RODAPE } from "@/lib/landing/conteudo";
import { hrefWhatsapp } from "@/lib/landing/links";
import { linkTexto } from "./estilos";

export default function Rodape({ temWhatsapp }: { temWhatsapp: boolean }) {
  const ano = new Date().getFullYear();
  return (
    <footer className="border-t border-border-subtle bg-bg-primary py-10">
      <div className="container mx-auto flex max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="font-serif text-xl text-gold">{MARCA}</p>
          <p className="text-sm text-text-secondary">{RODAPE.linha}</p>
        </div>
        <nav aria-label="Contato e privacidade" className="flex flex-wrap items-center gap-x-6">
          <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className={linkTexto}>
            {INSTAGRAM.usuario}
          </a>
          {temWhatsapp && (
            <a href={hrefWhatsapp("rodape")} className={linkTexto}>
              {RODAPE.whatsapp}
            </a>
          )}
          <a href="/privacidade" className={linkTexto}>
            {RODAPE.privacidade}
          </a>
        </nav>
      </div>
      <p className="container mx-auto mt-4 max-w-6xl px-4 text-sm text-text-secondary md:px-8">
        &copy; {ano} {MARCA}
      </p>
    </footer>
  );
}
