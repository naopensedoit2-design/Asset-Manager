import SectionWrapper from "@/components/ui/SectionWrapper";
import { FOTOS, INSTAGRAM } from "@/lib/landing/conteudo";
import type { FotoGaleria } from "@/lib/landing/dados";
import { foco, linkTexto, titulo2 } from "./estilos";
import FotoSegura from "./FotoSegura";
import VideoSobDemanda from "./VideoSobDemanda";

interface Props {
  /** No máximo 8 (o servidor já entrega só as 8 mais recentes). */
  fotos: FotoGaleria[];
  /** Código do vídeo do YouTube cadastrado no painel; sem ele não aparece o botão. */
  videoId: string | null;
}

// As fotos já vêm no HTML (nada de esqueleto esperando o navegador buscar). No celular é uma fileira que a pessoa
// arrasta, com a próxima foto aparecendo na borda; do tablet para cima são 4 colunas.
export default function Fotos({ fotos, videoId }: Props) {
  return (
    <SectionWrapper id="fotos" tight aria-labelledby="titulo-fotos" className="bg-bg-secondary">
      <h2 id="titulo-fotos" className={titulo2}>
        {FOTOS.titulo}
      </h2>
      <p className="mt-3 max-w-xl text-text-secondary">{FOTOS.linha}</p>

      {fotos.length > 0 ? (
        <ul
          role="list"
          tabIndex={0}
          aria-label={FOTOS.titulo}
          className={`-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:scroll-px-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 ${foco}`}
        >
          {fotos.slice(0, 8).map((foto) => (
            <li key={foto.id} className="w-[78%] shrink-0 snap-start md:w-auto">
              <div className="aspect-[3/4] overflow-hidden bg-bg-elevated">
                <FotoSegura
                  src={foto.url}
                  alt={foto.alt || FOTOS.altPadrao}
                  larguras={[360, 540, 720, 900]}
                  sizes="(min-width: 768px) 25vw, 78vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-text-secondary">{FOTOS.vazio}</p>
      )}

      <div className="mt-6 flex flex-col items-start">
        {videoId && <VideoSobDemanda id={videoId} rotulo={FOTOS.video} />}
        <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className={linkTexto}>
          {FOTOS.instagram}
        </a>
      </div>
    </SectionWrapper>
  );
}
