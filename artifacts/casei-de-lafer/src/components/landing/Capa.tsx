import { CHAT_URL } from "@/lib/landing/links";
import { reais } from "@/lib/landing/reais";
import type { ServicoPublico } from "@/lib/landing/servicos";
import { CAPA, FATO, LINK_CHAT, MARCA, PASSAGEM, REGIAO } from "@/lib/landing/textos";
import type { FotoDaPagina } from "@/lib/landing/curadoria";
import FotoSegura from "./FotoSegura";
import Pedido from "./Pedido";
import TopoFoto from "./TopoFoto";

interface CapaProps {
  desktop: string;
  mobile: string;
  /** Serviços principais, com o valor-base de Regras. Vazio: a tabela de valores não aparece. */
  principais: ServicoPublico[];
  chatLigado: boolean;
}

// Primeira tela: a foto, o título e o pedido de data, que já funciona sem JavaScript.
export function Capa({ desktop, mobile, principais, chatLigado }: CapaProps) {
  return (
    <section className="capa" aria-label="Abertura">
      <p className="marca entra">
        <b>{MARCA}</b>
        <span className="mono">{REGIAO}</span>
      </p>
      <div className="capa-foto">
        <TopoFoto desktop={desktop} mobile={mobile} alt={CAPA.alt} />
      </div>
      <div className="capa-txt g">
        <h1 className="entra e2">
          <span>{CAPA.titulo[0]}</span>
          <span>
            <em>{CAPA.titulo[1]}</em>
          </span>
        </h1>
        <p className="capa-sub entra e3">{CAPA.sub}</p>
        <div className="entra e4">
          <Pedido id="topo" rotuloData={CAPA.campoData} escolher={CAPA.escolher} nota={CAPA.nota} />
        </div>
        {chatLigado && (
          <a className="link entra e4" href={CHAT_URL}>
            {LINK_CHAT}
          </a>
        )}
        {principais.length > 0 && (
          <dl className="tabela entra e4" aria-label={CAPA.valores}>
            {principais.map((s) => (
              <div key={s.nome}>
                <dt>{s.nome}</dt>
                <dd>
                  <small>{CAPA.aPartirDe}</small> {reais(s.aPartirDeCents ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

// O fato central do negócio, em três linhas que acendem com a rolagem.
export function Fato() {
  return (
    <section className="fato g" aria-labelledby="t-fato">
      <div className="miolo">
        <h2 id="t-fato" className="fato-linhas" data-fato>
          {FATO.linhas.map((linha) => (
            <span key={linha}>{linha}</span>
          ))}
        </h2>
        <p className="surge">{FATO.texto}</p>
      </div>
    </section>
  );
}

// A foto deitada do carro em movimento atravessa a tela com a rolagem. Sem JavaScript (ou com movimento
// reduzido), vira uma faixa que se arrasta com o dedo.
export function Passagem({ foto }: { foto: FotoDaPagina }) {
  return (
    <section className="passagem" aria-label={PASSAGEM.secao} data-passagem>
      <div className="passagem-fixo">
        <div className="passagem-trilho" data-trilho tabIndex={0} role="group" aria-label={PASSAGEM.secao}>
          <FotoSegura src={foto.url} alt={foto.alt} larguras={[1200, 1600, 2048]} sizes="(min-width: 900px) 132vw, 150vh" />
        </div>
        <div className="passagem-txt g">
          <p className="mono">{PASSAGEM.rotulo}</p>
          <p>{PASSAGEM.frase}</p>
        </div>
        <span className="passagem-barra" aria-hidden="true">
          <i data-barra />
        </span>
      </div>
    </section>
  );
}
