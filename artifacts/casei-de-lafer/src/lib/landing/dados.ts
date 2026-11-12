// O que a página inicial precisa do banco, lido no servidor: o HTML já sai com a foto do topo, a galeria
// e os valores, sem esperar o navegador buscar nada. Só lê (nunca cria nem altera linha). Se o banco
// falhar, a página ainda abre: as fotos caem nas de reserva e o valor simplesmente não aparece
// (nada é inventado nem digitado aqui). A leitura é refeita na próxima atualização da página.

import { prisma } from "@/lib/prisma";
import { parseSettings } from "@/lib/gestor/rules";
import type { FotoDoPainel } from "./curadoria.ts";
import type { ServicoDoPainel } from "./servicos.ts";
import { diasDeChuva, type RegrasPublicas } from "./textos.ts";

export interface FotoTopo {
  url: string;
  videoUrl: string;
}

/** Foto da galeria do painel. `casal` e `local` são os campos "Tag do casal" e "Local": só a curadoria os lê. */
export type FotoGaleria = FotoDoPainel;

export interface DadosLanding {
  /** Escurecimento da foto do topo (0 a 100), como no painel. */
  heroOpacity: number;
  showCalendar: boolean;
  topo: { desktop: FotoTopo | null; mobile: FotoTopo | null };
  galeria: FotoGaleria[];
  /** Serviços ativos de Regras. Sem banco, a lista vem vazia e a página não mostra valor. */
  servicos: ServicoDoPainel[];
  /** Sinal, saldo e prazos de Regras. Sem banco, valem os padrões do próprio módulo de regras. */
  regras: RegrasPublicas;
  /** O chat da Margot no site está ligado em Regras? Desligado, a página não oferece o chat. */
  chatLigado: boolean;
}

// Só o que a página mostra: nada de Pix, documento ou nome do contratado sai de Regras para cá.
const CHAVES_DE_REGRAS = ["depositPercent", "balanceDaysBefore", "cancellationPolicy", "margotSite"];

function regrasDe(linhas: { key: string; value: string }[]): { regras: RegrasPublicas; chatLigado: boolean } {
  const s = parseSettings(linhas);
  return {
    regras: {
      sinalPercent: s.depositPercent,
      saldoPercent: Math.max(0, 100 - s.depositPercent),
      saldoDiasAntes: s.balanceDaysBefore,
      chuvaDias: diasDeChuva(s.cancellationPolicy),
    },
    chatLigado: s.margotSite,
  };
}


// Mesmo padrão que a página já usava antes de existir configuração no painel.
const VEU_PADRAO = 60;

function vazio(): DadosLanding {
  return {
    heroOpacity: VEU_PADRAO,
    showCalendar: false,
    topo: { desktop: null, mobile: null },
    galeria: [],
    servicos: [],
    ...regrasDe([]),
  };
}


export async function getDadosLanding(): Promise<DadosLanding> {
  try {
    const [config, topos, fotos, servicos, ajustes] = await Promise.all([
      prisma.siteConfig.findFirst(),
      prisma.heroImage.findMany(),
      prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.setting.findMany({ where: { key: { in: CHAVES_DE_REGRAS } } }),
    ]);
    const topo = (tipo: string): FotoTopo | null => {
      const linha = topos.find((t) => t.type === tipo);
      return linha ? { url: linha.url, videoUrl: linha.videoUrl } : null;
    };
    return {
      heroOpacity: config?.heroOpacity ?? VEU_PADRAO,
      // Como antes: o calendário só some quando o dono desliga no painel.
      showCalendar: config?.showCalendar !== false,
      topo: { desktop: topo("desktop"), mobile: topo("mobile") },
      galeria: fotos.map((f) => ({ id: f.id, url: f.url, alt: f.alt, casal: f.coupleTag, local: f.location })),
      servicos: servicos.map((s) => ({
        name: s.name,
        description: s.description,
        priceCents: s.priceCents,
        isAddon: s.isAddon,
      })),
      ...regrasDe(ajustes),
    };
  } catch {
    return vazio();
  }
}
