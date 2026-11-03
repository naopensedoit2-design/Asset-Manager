import SectionWrapper from "@/components/ui/SectionWrapper";
import { FINAL } from "@/lib/landing/conteudo";
import type { Canais } from "@/lib/landing/links";
import CalendarioPublico from "./CalendarioPublico";
import CtaBloco from "./CtaBloco";
import { titulo2 } from "./estilos";

interface Props {
  canais: Canais;
  /** Datas já reservadas (aaaa-mm-dd). Vazio = não mostra calendário (um calendário vazio diria "tudo livre"). */
  datasReservadas: string[];
}

export default function Final({ canais, datasReservadas }: Props) {
  const calendario = datasReservadas.length > 0;
  return (
    <SectionWrapper id="data" tight aria-labelledby="titulo-final" className="bg-bg-secondary">
      <div className={calendario ? "grid items-start gap-10 md:grid-cols-2" : ""}>
        <div className="max-w-xl">
          <h2 id="titulo-final" className={titulo2}>
            {FINAL.titulo}
          </h2>
          <p className="mt-4 text-text-secondary">{FINAL.texto}</p>
          <CtaBloco slot="final" canais={canais} className="mt-8" />
        </div>
        {calendario && <CalendarioPublico reservadas={datasReservadas} />}
      </div>
    </SectionWrapper>
  );
}
