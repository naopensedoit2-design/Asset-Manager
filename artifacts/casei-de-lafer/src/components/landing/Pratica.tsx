import type { FotoDaPagina } from "@/lib/landing/curadoria";
import { hrefParceiro } from "@/lib/landing/links";
import {
  OFICIOS,
  PERGUNTAS,
  RESERVA,
  itensDoCerimonial,
  itensDoFotografo,
  passos,
  perguntas,
  type RegrasPublicas,
} from "@/lib/landing/textos";
import FotoSegura from "./FotoSegura";

interface Props {
  regras: RegrasPublicas;
  /** Foto do bloco dos fotógrafos, se o painel tiver uma marcada. */
  cenario: FotoDaPagina | null;
  /** Todas as fotos dos momentos têm crédito no painel? Só então a página promete crédito em cada foto. */
  comCredito: boolean;
  /** Valor-base do ensaio já escrito, ou null. */
  ensaio: string | null;
}

function Lista({ itens }: { itens: { forte: string; texto: string }[] }) {
  return (
    <ul>
      {itens.map((i) => (
        <li key={i.forte}>
          <b>{i.forte}</b> {i.texto}
        </li>
      ))}
    </ul>
  );
}

// A parte prática, em pérola: quem faz o casamento (cerimonialistas e fotógrafos), como reservar e perguntas.
export default function Pratica({ regras, cenario, comCredito, ensaio }: Props) {
  return (
    <div className="pratica claro g">
      <div className="miolo">
        <section aria-labelledby="t-oficio">
          <header className="cab">
            <p className="mono">{OFICIOS.rotulo}</p>
            <h2 id="t-oficio" className="surge">
              {OFICIOS.titulo}
            </h2>
            <p>{OFICIOS.texto}</p>
          </header>
          <div className="oficios">
            <div className="oficio">
              <p className="mono">{OFICIOS.cerimonial.rotulo}</p>
              <h3>{OFICIOS.cerimonial.titulo}</h3>
              <Lista itens={itensDoCerimonial(regras)} />
              <a className="link" href={hrefParceiro("cerimonial")}>
                {OFICIOS.cerimonial.link}
              </a>
            </div>
            <div className="oficio">
              <p className="mono">{OFICIOS.fotografo.rotulo}</p>
              <h3>{OFICIOS.fotografo.titulo}</h3>
              {cenario && (
                <figure className="oficio-foto">
                  <FotoSegura src={cenario.url} alt={cenario.alt} larguras={[480, 828, 1200]} sizes="(min-width: 900px) 50vw, 100vw" />
                </figure>
              )}
              <Lista itens={itensDoFotografo(regras, comCredito)} />
              <a className="link" href={hrefParceiro("fotografo")}>
                {OFICIOS.fotografo.link}
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="t-passos">
          <header className="cab">
            <p className="mono">{RESERVA.rotulo}</p>
            <h2 id="t-passos" className="surge">
              {RESERVA.titulo}
            </h2>
          </header>
          <ol className="passos" data-passos>
            {passos(regras).map((p) => (
              <li key={p.texto}>
                <p>
                  {p.texto}
                  {p.apoio && <small>{p.apoio}</small>}
                </p>
              </li>
            ))}
          </ol>
          <p className="nota nota-passos">{RESERVA.nota}</p>
        </section>

        <section className="perguntas dupla" aria-labelledby="t-perg">
          <header className="cab">
            <p className="mono">{PERGUNTAS.rotulo}</p>
            <h2 id="t-perg" className="surge">
              {PERGUNTAS.titulo}
            </h2>
          </header>
          <div>
            {perguntas(regras, ensaio).map((p) => (
              <details key={p.pergunta}>
                <summary>
                  {p.pergunta}
                  <i aria-hidden="true">+</i>
                </summary>
                <p className="resposta">{p.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
