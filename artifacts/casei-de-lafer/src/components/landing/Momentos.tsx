import type { Curadoria, FotoDaPagina } from "@/lib/landing/curadoria";
import { reais } from "@/lib/landing/reais";
import { CAPA, CARRO, SERVICOS, type Momento } from "@/lib/landing/textos";
import FotoSegura from "./FotoSegura";

const TAMANHOS = "(min-width: 900px) 50vw, 100vw";

function Cena({ momento, foto }: { momento: Momento; foto: FotoDaPagina | null }) {
  return (
    <article className={foto ? "cena" : "cena sem-foto"} data-cena>
      {foto && (
        <figure className="cena-foto">
          <FotoSegura src={foto.url} alt={foto.alt} larguras={[480, 828, 1200]} sizes={TAMANHOS} />
          {foto.credito && (
            <figcaption className="credito">
              {SERVICOS.credito} {foto.credito}
            </figcaption>
          )}
        </figure>
      )}
      <div className="cena-txt">
        <p className="mono">{momento.rotulo}</p>
        <h3>{momento.titulo}</h3>
        {momento.texto && <p>{momento.texto}</p>}
        {momento.aPartirDeCents !== null ? (
          <p className="preco">
            <span>{CAPA.aPartirDe}</span> {reais(momento.aPartirDeCents)}
          </p>
        ) : (
          <p className="preco sem">{momento.semValor}</p>
        )}
      </div>
    </article>
  );
}

// Serviços e valores: cada serviço de Regras é um momento, com foto cheia e o valor-base embaixo.
export function Momentos({ lista, fotos }: { lista: Momento[]; fotos: Curadoria }) {
  if (lista.length === 0) return null;
  return (
    <section className="servicos claro g" aria-labelledby="t-serv">
      <div className="miolo">
        <header className="cab">
          <p className="mono">{SERVICOS.rotulo}</p>
          <h2 id="t-serv" className="surge">
            {lista.length === 3 ? SERVICOS.titulo : SERVICOS.tituloGeral}
          </h2>
        </header>
        <div className="cenas">
          {lista.map((m) => (
            <Cena key={m.rotulo} momento={m} foto={m.chave ? fotos[m.chave] : null} />
          ))}
        </div>
        <div className="incluso">
          <h3 className="surge">{SERVICOS.incluso.titulo}</h3>
          <div>
            <ul>
              {SERVICOS.incluso.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="nota">{SERVICOS.nota}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// O carro: a história (com fontes), a ficha e a faixa de detalhes que passa devagar.
export function Carro({ foto, detalhes }: { foto: FotoDaPagina | null; detalhes: FotoDaPagina[] }) {
  return (
    <section className="carro verde" aria-labelledby="t-carro">
      <div className="g">
        <div className={foto ? "miolo carro-grade" : "miolo carro-grade sem-foto"}>
          {foto && (
            <div className="carro-lado">
              <figure className="carro-foto">
                <FotoSegura src={foto.url} alt={foto.alt} larguras={[480, 828, 1200]} sizes={TAMANHOS} />
              </figure>
            </div>
          )}
          <div className="carro-txt">
            <p className="mono rotulo-madeira">{CARRO.rotulo}</p>
            <h2 id="t-carro" className="surge">
              {CARRO.titulo[0]}
              <em>{CARRO.titulo[1]}</em>
              {CARRO.titulo[2]}
            </h2>
            <p>{CARRO.historia}</p>
            <p className="nosso">{CARRO.nosso}</p>
            <dl className="ficha" aria-label={CARRO.fichaNome}>
              {CARRO.ficha.map(([campo, valor]) => (
                <div key={campo}>
                  <dt>{campo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            <p className="fontes">
              <span>Fontes:</span>
              {CARRO.fontes.map((f) => (
                <a key={f.url} href={f.url} rel="noopener noreferrer">
                  {f.nome}
                </a>
              ))}
            </p>
          </div>
        </div>
      </div>
      {detalhes.length > 0 ? (
        <div className="faixa" aria-label={CARRO.detalhes}>
          <div className="faixa-trilho">
            {detalhes.map((d) => (
              <FotoSegura key={d.id} src={d.url} alt={d.alt} larguras={[320, 480, 640]} sizes="(min-width: 900px) 254px, 160px" />
            ))}
            {/* a segunda volta existe só para a faixa emendar sem salto; leitores de tela não a leem */}
            {detalhes.map((d) => (
              <span key={`copia-${d.id}`} data-copia aria-hidden="true">
                <FotoSegura src={d.url} alt="" larguras={[320, 480, 640]} sizes="(min-width: 900px) 254px, 160px" />
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="carro-fim" />
      )}
    </section>
  );
}
