import SectionWrapper from "@/components/ui/SectionWrapper";
import { perguntas, PERGUNTAS_TITULO, type RegrasPublicas } from "@/lib/landing/conteudo";
import { foco, titulo2 } from "./estilos";

interface Props {
  regras: RegrasPublicas;
  precoEnsaioCentavos: number | null;
}

// <details> do próprio navegador: abre e fecha sem JavaScript, com teclado e leitor de tela.
export default function Perguntas({ regras, precoEnsaioCentavos }: Props) {
  return (
    <SectionWrapper id="perguntas" tight aria-labelledby="titulo-perguntas" className="bg-bg-primary">
      <h2 id="titulo-perguntas" className={titulo2}>
        {PERGUNTAS_TITULO}
      </h2>
      <div className="mt-8 max-w-3xl divide-y divide-border-subtle border-y border-border-subtle">
        {perguntas(regras, precoEnsaioCentavos).map((item) => (
          <details key={item.pergunta} className="group">
            <summary
              className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden ${foco}`}
            >
              <span className="font-serif text-lg leading-snug text-text-primary">{item.pergunta}</span>
              <span aria-hidden className="shrink-0 text-2xl leading-none text-gold transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-5 pr-8 leading-relaxed text-text-secondary">{item.resposta}</p>
          </details>
        ))}
      </div>
    </SectionWrapper>
  );
}
