import { MARCA, TOPO } from "@/lib/landing/conteudo";
import type { DadosLanding } from "@/lib/landing/dados";
import type { Canais } from "@/lib/landing/links";
import CtaBloco from "./CtaBloco";
import TopoFoto from "./TopoFoto";

interface Props {
  topo: DadosLanding["topo"];
  /** Escurecimento da foto, de 0 a 100, ajustado no painel. Só vale onde o texto fica por cima da foto. */
  heroOpacity: number;
  canais: Canais;
}

// Primeira tela: diz o que é, para quem e como pedir, e mostra o carro inteiro. Em celular e tablet a foto fica em
// cima, numa faixa horizontal, e o texto embaixo (nada por cima do carro); só em tela larga (xl, 1280 px) o texto
// passa para cima da foto, do lado esquerdo, com o escurecimento só onde há texto. A faixa corta a foto: por isso o
// enquadramento puxa para baixo e (no tablet) para a direita, onde o carro costuma estar. Foto vertical no painel
// perde parte de cima e de baixo; o ideal para o celular é uma foto horizontal com o carro inteiro.
export default function Topo({ topo, heroOpacity, canais }: Props) {
  const desktop = topo.desktop?.url || "/hero-desktop.jpg";
  const mobile = topo.mobile?.url || topo.desktop?.url || "/hero-mobile.jpg";
  const veu = Math.min(100, Math.max(0, heroOpacity)) / 100;

  return (
    <section
      aria-labelledby="titulo-topo"
      className="relative isolate overflow-hidden bg-bg-primary xl:flex xl:min-h-[min(46rem,88svh)] xl:items-center"
    >
      <div className="relative h-[33svh] max-h-[420px] min-h-[200px] w-full md:h-[48svh] md:max-h-[560px] md:min-h-[360px] xl:absolute xl:inset-0 xl:h-auto xl:max-h-none xl:min-h-0">
        <TopoFoto
          desktop={desktop}
          mobile={mobile}
          alt={TOPO.altFoto}
          className="h-full w-full object-cover object-[50%_70%] md:object-[75%_70%] xl:object-[80%_center]"
        />
        <div aria-hidden className="absolute inset-0 hidden xl:block" style={{ backgroundColor: `rgba(0, 0, 0, ${veu.toFixed(2)})` }} />
        <div
          aria-hidden
          className="absolute inset-0 hidden xl:block"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.66) 32%, rgba(0,0,0,0) 56%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-4 md:px-8 md:pt-8 xl:py-20">
        <div className="max-w-2xl">
          <p className="font-serif text-base leading-6 text-gold">{MARCA}</p>
          <h1
            id="titulo-topo"
            className="mt-2 font-serif text-[1.625rem] leading-tight text-balance lining-nums text-text-primary md:text-4xl xl:text-[3.25rem]"
          >
            {TOPO.titulo}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-snug text-pretty text-text-secondary md:text-base md:leading-relaxed xl:text-lg">
            {TOPO.subtitulo}
          </p>
          <CtaBloco slot="topo" canais={canais} className="mt-4 md:mt-6 xl:mt-8" />
        </div>
      </div>
    </section>
  );
}
