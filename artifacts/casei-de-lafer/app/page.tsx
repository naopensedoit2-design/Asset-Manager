import type { Metadata } from "next";
import "./landing.css";
import { Capa, Fato, Passagem } from "@/components/landing/Capa";
import { BarraFixa, Convite, Rodape } from "@/components/landing/Convite";
import { Carro, Momentos } from "@/components/landing/Momentos";
import Movimento from "@/components/landing/Movimento";
import Pratica from "@/components/landing/Pratica";
import { fontesDaLanding } from "@/components/landing/fontes";
import { curar, type FotoDaPagina } from "@/lib/landing/curadoria";
import { getDadosLanding } from "@/lib/landing/dados";
import { WHATSAPP_HREF } from "@/lib/landing/links";
import { reais } from "@/lib/landing/reais";
import { servicosPublicos } from "@/lib/landing/servicos";
import { BOTAO, BOTAO_COM_DATA, PAGINA, momentos } from "@/lib/landing/textos";

// Montada no servidor e guardada por até 1 minuto. Mudar foto do topo, galeria, configuração ou datas no
// painel a refaz na hora (src/lib/landing/revalidar.ts); valores de Regras chegam em até 1 minuto.
export const revalidate = 60;

export const metadata: Metadata = {
  title: PAGINA.titulo,
  description: PAGINA.descricao,
  openGraph: { title: PAGINA.titulo, description: PAGINA.descricao, type: "website", images: [{ url: "/hero-desktop.jpg" }] },
  twitter: { card: "summary_large_image", title: PAGINA.titulo, description: PAGINA.descricao },
};

// Roda antes de a página aparecer: liga as classes do movimento sem piscar. Se o resto do JavaScript não
// chegar em 7 segundos (rede ruim), desliga de novo e a página fica parada, com tudo à mostra.
const ANTES_DE_PINTAR =
  "(function(){var r=document.documentElement;r.classList.add('lafer-js');" +
  "try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)r.classList.add('lafer-mov')}catch(e){}" +
  "setTimeout(function(){if(r.getAttribute('data-lafer')!=='vivo')r.classList.remove('lafer-js','lafer-mov')},7000)})()";

// Foto de reserva do topo, para quando o painel ainda não tem nenhuma.
const TOPO_DE_RESERVA = "/hero-desktop.jpg";

export default async function Page() {
  const dados = await getDadosLanding();
  const fotos = curar(dados.galeria);
  const publicos = servicosPublicos(dados.servicos);
  const lista = momentos(publicos);

  const reserva = fotos.capa?.url ?? TOPO_DE_RESERVA;
  const desktop = dados.topo.desktop?.url ?? dados.topo.mobile?.url ?? reserva;
  const mobile = dados.topo.mobile?.url ?? dados.topo.desktop?.url ?? reserva;

  // A página só promete "crédito em cada foto" quando todas as fotos dos momentos têm crédito no painel.
  const fotosDosMomentos = lista.map((m) => (m.chave ? fotos[m.chave] : null)).filter((f): f is FotoDaPagina => f !== null);
  const comCredito = fotosDosMomentos.length > 0 && fotosDosMomentos.every((f) => f.credito !== "");
  const ensaio = lista.find((m) => m.chave === "ensaio")?.aPartirDeCents ?? null;

  return (
    <div className={`lafer ${fontesDaLanding}`}>
      <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />
      <main>
        <Capa
          desktop={desktop}
          mobile={mobile}
          principais={publicos.filter((s) => !s.adicional && s.aPartirDeCents !== null)}
          chatLigado={dados.chatLigado}
        />
        <Fato />
        {fotos.passagem && <Passagem foto={fotos.passagem} />}
        <Momentos lista={lista} fotos={fotos} />
        <Carro foto={fotos.carro} detalhes={fotos.detalhes} />
        <Pratica regras={dados.regras} cenario={fotos.cenario} comCredito={comCredito} ensaio={ensaio !== null ? reais(ensaio) : null} />
        <Convite foto={fotos.final} chatLigado={dados.chatLigado} />
      </main>
      <Rodape />
      <BarraFixa />
      <Movimento botao={BOTAO} botaoComData={BOTAO_COM_DATA} whatsapp={WHATSAPP_HREF} />
    </div>
  );
}
