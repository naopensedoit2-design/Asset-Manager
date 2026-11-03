// O que a página inicial precisa do banco, lido no servidor: assim o HTML já sai com a foto do topo, a galeria,
// os valores e as regras, sem esperar o navegador buscar nada. Só lê (nunca cria nem altera linha). Se o banco
// falhar, a página ainda abre: o chat funciona sem dado nenhum, e valores e calendário simplesmente não aparecem
// (nada é inventado nem digitado aqui). A leitura é refeita na próxima atualização da página.

import { prisma } from "@/lib/prisma";
import { parseSettings } from "@/lib/gestor/rules";
import { overMonthlyLimit } from "@/lib/margot/usage";
import type { RegrasPublicas } from "./conteudo.ts";

export interface FotoTopo {
  url: string;
  videoUrl: string;
}

export interface FotoGaleria {
  id: number;
  url: string;
  alt: string;
}

export interface ServicoPublico {
  name: string;
  description: string;
  priceCents: number;
  isAddon: boolean;
}

export interface DadosLanding {
  /** Escurecimento da foto do topo (0 a 100), só usado onde o texto fica por cima dela. */
  heroOpacity: number;
  showCalendar: boolean;
  /** Datas reservadas (aaaa-mm-dd), só quando o calendário está ligado no painel. */
  datasReservadas: string[];
  /** Há número de WhatsApp cadastrado? O número em si não vai para o HTML: o botão passa por /whatsapp. */
  temWhatsapp: boolean;
  /** O chat da Margot está de pé: ligado no painel, com a chave da API e dentro do limite do mês. */
  chatDisponivel: boolean;
  topo: { desktop: FotoTopo | null; mobile: FotoTopo | null };
  galeria: FotoGaleria[];
  /** Os valores vêm só do painel. Sem painel (banco fora), a lista vem vazia e a página não mostra preço. */
  servicos: ServicoPublico[];
  regras: RegrasPublicas;
}

export const soDigitos = (valor: string | null | undefined) => (valor ?? "").replace(/\D/g, "");

const CHAVES_DO_PAINEL = ["depositPercent", "balanceDaysBefore", "proposalValidityDays", "margotSite", "margotLimitUsd"];
const FOTOS_NA_PAGINA = 8;
const VEU_PADRAO = 10;

function regrasDe(s: ReturnType<typeof parseSettings>): RegrasPublicas {
  return {
    sinalPercent: s.depositPercent,
    saldoPercent: Math.max(0, 100 - s.depositPercent),
    saldoDiasAntes: s.balanceDaysBefore,
    validadeDias: s.proposalValidityDays,
  };
}

const temChaveDaMargot = () => Boolean(process.env["ANTHROPIC_API_KEY"]);

function vazio(): DadosLanding {
  return {
    heroOpacity: VEU_PADRAO,
    showCalendar: false,
    datasReservadas: [],
    temWhatsapp: Boolean(soDigitos(process.env["WHATSAPP_NUMBER"])),
    chatDisponivel: temChaveDaMargot(),
    topo: { desktop: null, mobile: null },
    galeria: [],
    servicos: [],
    regras: regrasDe(parseSettings([])),
  };
}

/** Número de WhatsApp para o botão: o do painel e, se não houver, o da variável de ambiente. Vazio se nenhum. */
export async function getNumeroWhatsapp(): Promise<string> {
  try {
    const config = await prisma.siteConfig.findFirst();
    return soDigitos(config?.whatsappNumber) || soDigitos(process.env["WHATSAPP_NUMBER"]);
  } catch {
    return soDigitos(process.env["WHATSAPP_NUMBER"]);
  }
}

export async function getDadosLanding(): Promise<DadosLanding> {
  try {
    const [config, topos, fotos, servicos, ajustes] = await Promise.all([
      prisma.siteConfig.findFirst(),
      prisma.heroImage.findMany(),
      prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" }, take: FOTOS_NA_PAGINA }),
      prisma.service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      prisma.setting.findMany({ where: { key: { in: CHAVES_DO_PAINEL } } }),
    ]);
    const painel = parseSettings(ajustes);
    const topo = (tipo: string): FotoTopo | null => {
      const linha = topos.find((t) => t.type === tipo);
      return linha ? { url: linha.url, videoUrl: linha.videoUrl } : null;
    };

    // Mesma regra do /api/margot: desligada no painel, sem chave da API ou acima do limite do mês = o chat não responde.
    const chatDisponivel =
      painel.margotSite && temChaveDaMargot() && !(await overMonthlyLimit(painel.margotLimitUsd).catch(() => false));

    // Só quando o dono liga o calendário no painel; mostra as datas reservadas pelo negócio, nunca a Google Agenda.
    const showCalendar = config?.showCalendar === true;
    const reservadas = showCalendar
      ? await prisma.blockedDate.findMany({ where: { date: { gte: new Date() } }, orderBy: { date: "asc" } })
      : [];

    return {
      heroOpacity: config?.heroOpacity ?? VEU_PADRAO,
      showCalendar,
      datasReservadas: reservadas.map((d) => d.date.toISOString().slice(0, 10)),
      temWhatsapp: Boolean(soDigitos(config?.whatsappNumber) || soDigitos(process.env["WHATSAPP_NUMBER"])),
      chatDisponivel,
      topo: { desktop: topo("desktop"), mobile: topo("mobile") },
      galeria: fotos.map((f) => ({ id: f.id, url: f.url, alt: f.alt })),
      servicos: servicos.map((s) => ({ name: s.name, description: s.description, priceCents: s.priceCents, isAddon: s.isAddon })),
      regras: regrasDe(painel),
    };
  } catch {
    return vazio();
  }
}
