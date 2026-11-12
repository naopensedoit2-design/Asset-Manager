"use client";

import { useEffect } from "react";

interface Props {
  /** Nome do botão sem data ("Ver se minha data está livre"). */
  botao: string;
  /** As duas pontas do nome do botão com data: "Ver se " + 13/03/2027 + " está livre". */
  botaoComData: readonly [string, string];
  /** Endereço do botão de WhatsApp ("/whatsapp"). */
  whatsapp: string;
}

const br = (iso: string) => iso.split("-").reverse().join("/");

function porExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return "";
  const texto = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(ano, mes - 1, dia),
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1) + ".";
}

const limite = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// Todo o movimento da página inicial. Não desenha nada: só anima o que o servidor já entregou pronto.
// Sem JavaScript a página funciona igual, parada. Com "reduzir movimento" ligado no aparelho, fica só
// o que é útil (a data por extenso e a barra do celular), sem animação.
export default function Movimento({ botao, botaoComData, whatsapp }: Props) {
  useEffect(() => {
    const raiz = document.documentElement;
    const pagina = document.querySelector<HTMLElement>(".lafer");
    if (!pagina) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    raiz.dataset.lafer = "vivo";
    raiz.classList.add("lafer-js");
    raiz.classList.toggle("lafer-mov", !reduz);

    const desfazer: (() => void)[] = [
      () => {
        raiz.classList.remove("lafer-js", "lafer-mov");
        delete raiz.dataset.lafer;
      },
    ];
    const ouvir = (alvo: EventTarget, tipo: string, fn: EventListener, opcoes?: AddEventListenerOptions) => {
      alvo.addEventListener(tipo, fn, opcoes);
      desfazer.push(() => alvo.removeEventListener(tipo, fn, opcoes));
    };
    const todos = <T extends Element>(seletor: string) => Array.from(pagina.querySelectorAll<T>(seletor));

    // A data escolhida vale para a página toda: o outro formulário e a barra do celular já saem com ela.
    const datas = todos<HTMLInputElement>('input[type="date"]');
    const linhas = todos<HTMLElement>("[data-escolhida]");
    const rotuloBarra = pagina.querySelector<HTMLElement>("[data-rotulo-barra]");
    const linkBarra = pagina.querySelector<HTMLAnchorElement>("[data-link-barra]");
    const agora = new Date();
    const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
    const espalhar = (origem: HTMLInputElement) => {
      const valor = origem.value;
      for (const d of datas) if (d !== origem) d.value = valor;
      const extenso = valor ? porExtenso(valor) : "";
      for (const l of linhas) l.textContent = extenso;
      if (rotuloBarra) rotuloBarra.textContent = valor ? botaoComData[0] + br(valor) + botaoComData[1] : botao;
      if (linkBarra) linkBarra.href = valor ? `${whatsapp}?data=${encodeURIComponent(valor)}` : whatsapp;
    };
    for (const d of datas) {
      d.min = hoje;
      ouvir(d, "change", () => espalhar(d));
    }
    // O navegador pode devolver a data que a pessoa tinha escolhido antes de voltar para a página.
    const jaEscolhida = datas.find((d) => d.value);
    if (jaEscolhida) espalhar(jaEscolhida);

    // Entradas ao rolar e a barra do celular, que some enquanto um formulário de data (ou a passagem) está na tela.
    const barra = pagina.querySelector<HTMLElement>("[data-barra-fixa]");
    const alvos = todos<HTMLElement>(".surge, [data-cena]");
    if ("IntersectionObserver" in window) {
      const olho = new IntersectionObserver(
        (itens) => {
          for (const it of itens) {
            if (!it.isIntersecting) continue;
            it.target.classList.add("dentro");
            olho.unobserve(it.target);
          }
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
      );
      for (const el of alvos) olho.observe(el);
      desfazer.push(() => olho.disconnect());

      const naTela = new Set<Element>();
      const vigia = new IntersectionObserver(
        (itens) => {
          for (const it of itens) {
            if (it.isIntersecting) naTela.add(it.target);
            else naTela.delete(it.target);
          }
          barra?.classList.toggle("visivel", naTela.size === 0 && window.scrollY > 200);
        },
        { threshold: 0.2 },
      );
      for (const el of todos("[data-pedido], .passagem-fixo")) vigia.observe(el);
      desfazer.push(() => vigia.disconnect());
    } else {
      for (const el of alvos) el.classList.add("dentro");
      barra?.classList.add("visivel");
    }
    desfazer.push(() => {
      for (const el of alvos) el.classList.remove("dentro");
      barra?.classList.remove("visivel");
    });

    if (!reduz) {
      // Movimento ligado à rolagem: a passagem do carro, as linhas do fato, o traço dos passos e a foto final.
      const passagem = pagina.querySelector<HTMLElement>("[data-passagem]");
      const trilho = pagina.querySelector<HTMLElement>("[data-trilho]");
      const barraPassagem = pagina.querySelector<HTMLElement>("[data-barra]");
      const fato = pagina.querySelector<HTMLElement>("[data-fato]");
      const linhasDoFato = fato ? Array.from(fato.querySelectorAll<HTMLElement>("span")) : [];
      const passosEl = pagina.querySelector<HTMLElement>("[data-passos]");
      const convite = pagina.querySelector<HTMLElement>("[data-convite]");
      let percurso = 0;
      let fim = 0;

      const medir = () => {
        if (!passagem || !trilho) return;
        const fixo = trilho.parentElement;
        if (!fixo) return;
        percurso = Math.max(0, trilho.scrollWidth - fixo.clientWidth);
        // não vai até a borda da foto: para com a frente do carro em quadro
        fim = Math.min(percurso, trilho.scrollWidth * 0.09);
        // a rolagem vertical rende mais ou menos o mesmo que a foto anda de lado
        passagem.style.height = `${Math.round(fixo.clientHeight + Math.max(percurso * 0.95, window.innerHeight * 0.7))}px`;
      };

      let pedido = 0;
      const quadro = () => {
        pedido = 0;
        const vh = window.innerHeight;
        if (passagem && trilho) {
          const r = passagem.getBoundingClientRect();
          const p = limite(-r.top / Math.max(1, r.height - vh));
          // começa no fim do véu e vai até a frente do carro
          trilho.style.transform = `translate3d(${(-(fim + (percurso - fim) * (1 - p))).toFixed(1)}px,0,0)`;
          if (barraPassagem) barraPassagem.style.transform = `scaleX(${p.toFixed(3)})`;
        }
        if (fato) {
          const f = fato.getBoundingClientRect();
          const pf = limite((vh * 0.92 - f.top) / (vh * 0.62));
          linhasDoFato.forEach((l, i) => {
            const parte = limite(pf * linhasDoFato.length - i);
            l.style.opacity = (0.22 + 0.78 * parte).toFixed(3);
            l.style.transform = `translate3d(${((1 - parte) * -18).toFixed(1)}px,0,0)`;
          });
        }
        if (passosEl) {
          const s = passosEl.getBoundingClientRect();
          passosEl.style.setProperty("--traco", limite((vh * 0.82 - s.top) / Math.max(1, s.height + vh * 0.12)).toFixed(3));
        }
        if (convite) {
          const c = convite.getBoundingClientRect();
          convite.style.setProperty("--zoom", (1.14 - 0.14 * limite((vh - c.top) / (vh * 0.9))).toFixed(3));
        }
      };
      const pedir = () => {
        if (!pedido) pedido = requestAnimationFrame(quadro);
      };
      const pronto = () => {
        medir();
        quadro();
      };

      const foto = trilho?.querySelector("img");
      if (foto && !foto.complete) ouvir(foto, "load", pronto);
      ouvir(window, "scroll", pedir, { passive: true });
      ouvir(window, "resize", pronto);
      pronto();

      desfazer.push(() => {
        if (pedido) cancelAnimationFrame(pedido);
        if (passagem) passagem.style.height = "";
        if (trilho) trilho.style.transform = "";
        if (barraPassagem) barraPassagem.style.transform = "";
        for (const l of linhasDoFato) {
          l.style.opacity = "";
          l.style.transform = "";
        }
        passosEl?.style.removeProperty("--traco");
        convite?.style.removeProperty("--zoom");
      });
    }

    return () => {
      for (const fn of desfazer.reverse()) fn();
    };
  }, [botao, botaoComData, whatsapp]);

  return null;
}
