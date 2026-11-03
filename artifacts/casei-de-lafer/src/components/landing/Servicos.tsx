import SectionWrapper from "@/components/ui/SectionWrapper";
import { normalizar, SERVICOS } from "@/lib/landing/conteudo";
import type { ServicoPublico } from "@/lib/landing/dados";
import type { Canais } from "@/lib/landing/links";
import { reais } from "@/lib/landing/reais";
import CtaBloco from "./CtaBloco";
import { titulo2 } from "./estilos";

interface Props {
  servicos: ServicoPublico[];
  canais: Canais;
}

// Lista de preços como texto, não como cartões. Os valores vêm do painel (Regras); aqui só se escolhe como mostrar.
// Sem valores do painel (banco fora do ar), a página não mostra preço nenhum em vez de mostrar um número digitado.
export default function Servicos({ servicos, canais }: Props) {
  return (
    <SectionWrapper id="valores" tight aria-labelledby="titulo-valores" className="bg-bg-primary">
      <h2 id="titulo-valores" className={titulo2}>
        {SERVICOS.titulo}
      </h2>

      {servicos.length > 0 ? (
        <ul role="list" className="mt-8 divide-y divide-border-subtle border-y border-border-subtle">
          {servicos.map((servico) => {
            const descricao = SERVICOS.descricoes[normalizar(servico.name)] || servico.description;
            return (
              <li
                key={servico.name}
                className="flex flex-col gap-2 py-5 md:flex-row md:items-baseline md:justify-between md:gap-10 md:py-6"
              >
                <div className="max-w-xl">
                  <h3 className="font-serif text-xl text-text-primary">{servico.name}</h3>
                  {descricao && <p className="mt-1 text-text-secondary">{descricao}</p>}
                </div>
                <p className="shrink-0 md:text-right">
                  {!servico.isAddon && <span className="text-sm text-text-secondary">{SERVICOS.aPartirDe} </span>}
                  <span className="font-serif text-2xl lining-nums text-gold">
                    {servico.isAddon ? "+ " : ""}
                    {reais(servico.priceCents)}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-text-secondary">{SERVICOS.semValores}</p>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h3 className="font-serif text-xl text-text-primary">{SERVICOS.incluso.titulo}</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-text-secondary">
            {SERVICOS.incluso.itens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-serif text-xl text-text-primary">{SERVICOS.extrasTitulo}</h3>
          <dl className="mt-4 space-y-3">
            {SERVICOS.extras.map((extra) => (
              <div key={extra.titulo}>
                <dt className="text-text-primary">{extra.titulo}</dt>
                <dd className="text-text-secondary">{extra.texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <p className="mt-10 max-w-2xl text-text-secondary">{SERVICOS.nota}</p>
      <CtaBloco slot="valores" canais={canais} nota={false} className="mt-8" />
    </SectionWrapper>
  );
}
