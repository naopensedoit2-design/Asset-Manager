import type { FotoDaPagina } from "@/lib/landing/curadoria";
import { CHAT_URL, WHATSAPP_HREF } from "@/lib/landing/links";
import { BOTAO, CAPA, CONVITE, INSTAGRAM, LINK_CHAT, MARCA, RODAPE } from "@/lib/landing/textos";
import FotoSegura from "./FotoSegura";
import Pedido from "./Pedido";

// Fecho da página: a mesma pergunta da capa, agora com data e cidade.
export function Convite({ foto, chatLigado }: { foto: FotoDaPagina | null; chatLigado: boolean }) {
  return (
    <section className={foto ? "convite" : "convite sem-foto"} id="convite" aria-labelledby="t-conv" data-convite>
      {foto && (
        <figure className="convite-foto">
          <FotoSegura src={foto.url} alt={foto.alt} larguras={[640, 1080, 1600]} sizes="(min-width: 900px) 50vw, 100vw" />
        </figure>
      )}
      <div className="convite-txt g">
        <h2 id="t-conv">{CONVITE.titulo}</h2>
        <p>{CONVITE.texto}</p>
        <Pedido
          id="final"
          rotuloData={CONVITE.campoData}
          escolher={CAPA.escolher}
          nota={CONVITE.nota}
          local={{ rotulo: CONVITE.campoLocal, exemplo: CONVITE.exemploLocal }}
        />
        {chatLigado && (
          <a className="link" href={CHAT_URL}>
            {LINK_CHAT}
          </a>
        )}
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="rodape g">
      <b>{MARCA}</b>
      <p>{RODAPE.linha}</p>
      <nav aria-label="Rodapé">
        <a href={INSTAGRAM.url} rel="noopener noreferrer">
          {INSTAGRAM.usuario}
        </a>
        <a href="/privacidade">{RODAPE.privacidade}</a>
      </nav>
    </footer>
  );
}

// Barra do polegar, só no celular: o pedido sempre a um toque. É um link comum para /whatsapp
// (funciona sem JavaScript); com JavaScript, ela some enquanto um formulário de data está na tela
// e passa a levar a data que a pessoa já escolheu.
export function BarraFixa() {
  return (
    <div className="barra" data-barra-fixa>
      <a className="botao" href={WHATSAPP_HREF} data-link-barra>
        <span data-rotulo-barra>{BOTAO}</span>{" "}
        <span className="seta" aria-hidden="true">
          →
        </span>
      </a>
    </div>
  );
}
