import SectionWrapper from "@/components/ui/SectionWrapper";
import { COMO_FUNCIONA, passos, type RegrasPublicas } from "@/lib/landing/conteudo";
import { titulo2 } from "./estilos";

// Quatro passos, na ordem em que acontecem (por isso a numeração). Sinal, saldo e validade vêm do painel.
export default function ComoFunciona({ regras }: { regras: RegrasPublicas }) {
  return (
    <SectionWrapper id="como-funciona" tight aria-labelledby="titulo-como" className="bg-bg-secondary">
      <h2 id="titulo-como" className={titulo2}>
        {COMO_FUNCIONA.titulo}
      </h2>
      <ol className="mt-8 max-w-2xl space-y-6">
        {passos(regras).map((passo, i) => (
          <li key={passo.titulo} className="flex items-baseline gap-4">
            <span aria-hidden className="w-8 shrink-0 font-serif text-2xl lining-nums text-text-secondary">
              {i + 1}
            </span>
            <div>
              <p className="text-text-primary">{passo.titulo}</p>
              {passo.texto && <p className="mt-1 text-text-secondary">{passo.texto}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-2xl text-text-secondary">{COMO_FUNCIONA.nota}</p>
    </SectionWrapper>
  );
}
