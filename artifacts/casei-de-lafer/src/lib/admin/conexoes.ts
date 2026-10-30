// Tela "Conexões": o estado real de cada canal e serviço ligado ao negócio. Regra pura (sem rede nem banco),
// testada em conexoes.test.ts. Nada aqui finge que algo está conectado: o que roda fora do painel ou ainda
// não existe aparece como tal, com o passo a passo para resolver.

import { diffDays, formatBRL, formatDateBR, TIMEZONE, todayISO } from "../gestor/rules.ts";
import { agoLabel } from "./hoje.ts";
import type { RoutineRecord } from "./routine.ts";

/** ok = funcionando · atencao = funciona, mas pede um olhar · falta = não funciona até você agir · fora = vive fora do painel. */
export type ConnState = "ok" | "atencao" | "falta" | "fora";

export type ConnKey = "whatsapp" | "agenda" | "financeiro" | "rotina" | "ia" | "instagram" | "metricool" | "gmail" | "api" | "fotos";

export interface Connection {
  key: ConnKey;
  name: string;
  state: ConnState;
  /** Frase curta do estado: "Conectado", "Falta configurar"… */
  headline: string;
  /** O que isso faz pelo negócio e o que está acontecendo agora. */
  detail: string;
  /** Nomes das variáveis que faltam na Vercel (só os nomes, nunca os valores). */
  missing: string[];
  /** Passo a passo para conectar ou consertar. */
  steps: string[];
  link?: { label: string; href: string; external?: boolean };
  /** Botão "Conferir agora": faz uma checagem ao vivo na Meta ou no Google. */
  check?: "whatsapp" | "agenda";
}

export interface ConexoesInput {
  now: Date;
  whatsapp: { missing: string[]; margotOn: boolean; ownerPhoneSet: boolean };
  agenda: { missing: string[] };
  financeiro: { openBills: number; openBillsCents: number };
  rotina: { record: RoutineRecord | null; cronSecret: boolean };
  ia: { keySet: boolean; usageUsd: number; limitUsd: number };
  fotos: { missing: string[] };
  api: { enabled: boolean };
  /** Link do painel do Instagram (variável opcional INSTAGRAM_PANEL_URL; vazio se não existir). */
  instagram: { panelUrl: string };
}

/** A Vercel (plano Hobby) roda a rotina "dentro da hora" marcada, então o intervalo entre rodadas pode passar de 24h. */
export const ROUTINE_STALE_HOURS = 26;

/** Resumo desligado ou sem nada para avisar não é problema: a rotina rodou. */
const BENIGN_ROUTINE_NOTES = ["Nada para avisar hoje", "Resumo diário desligado em Regras"];

const usd = (n: number) => `US$ ${n.toFixed(2).replace(".", ",")}`;

const hm = (d: Date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE }).format(d);

/** "hoje às 07:01", "ontem às 07:01" ou "29/10 às 07:01" (horário de Brasília). */
export function whenLabel(at: Date | string, now: Date): string {
  const d = new Date(at);
  const days = diffDays(todayISO(d), todayISO(now));
  if (days === 0) return `hoje às ${hm(d)}`;
  if (days === 1) return `ontem às ${hm(d)}`;
  const [y, m, day] = todayISO(d).split("-");
  return `${formatDateBR(`${y}-${m}-${day}`).slice(0, 5)} às ${hm(d)}`;
}

function conn(c: Omit<Connection, "missing" | "steps"> & Partial<Pick<Connection, "missing" | "steps">>): Connection {
  return { missing: [], steps: [], ...c };
}

export function whatsappConnection(i: ConexoesInput["whatsapp"]): Connection {
  const base = { key: "whatsapp" as const, name: "WhatsApp da Margot" };
  if (i.missing.length) {
    return conn({
      ...base,
      state: "falta",
      headline: "Falta configurar",
      detail: "Sem isso a Margot não atende clientes nem avisa você pelo WhatsApp.",
      missing: i.missing,
      steps: [
        "Siga o guia do WhatsApp (o link está em Regras, no cartão “WhatsApp da Margot”).",
        "Cadastre na Vercel as variáveis listadas abaixo e faça um novo deploy.",
        "Volte aqui e toque em Conferir agora.",
      ],
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  if (!i.margotOn) {
    return conn({
      ...base,
      state: "atencao",
      headline: "Conectado, mas a Margot está pausada",
      detail: "As mensagens dos clientes só chegam para você. Ligue a Margot de novo quando quiser que ela volte a atender.",
      link: { label: "Abrir Conversas", href: "/admin/conversas" },
      check: "whatsapp",
    });
  }
  if (!i.ownerPhoneSet) {
    return conn({
      ...base,
      state: "atencao",
      headline: "Falta o seu número",
      detail: "Sem o seu WhatsApp pessoal, a Margot não consegue te avisar nem receber suas ordens. Preencha em Regras, em “Seu número e avisos”.",
      link: { label: "Abrir Regras", href: "/admin/regras" },
      check: "whatsapp",
    });
  }
  return conn({
    ...base,
    state: "ok",
    headline: "Conectado",
    detail: "A Margot atende os clientes e avisa você. Conferir agora testa a ligação com a Meta de verdade.",
    link: { label: "Abrir Conversas", href: "/admin/conversas" },
    check: "whatsapp",
  });
}

export function agendaConnection(i: ConexoesInput["agenda"]): Connection {
  const base = { key: "agenda" as const, name: "Google Agenda" };
  if (i.missing.length) {
    return conn({
      ...base,
      state: "falta",
      headline: "Falta configurar",
      detail: "Sem ela, os casamentos confirmados não entram na sua agenda e os dias ocupados não travam o site.",
      missing: i.missing,
      steps: [
        "No Google Cloud, crie uma conta de serviço e baixe a chave (arquivo JSON).",
        "Compartilhe a sua agenda com o e-mail dessa conta de serviço, com a permissão “Fazer alterações nos eventos”.",
        "Cadastre na Vercel as variáveis listadas abaixo e faça um novo deploy.",
      ],
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  return conn({
    ...base,
    state: "ok",
    headline: "Configurada",
    detail: "Casamentos confirmados vão para a sua agenda, e os dias ocupados travam o site e a Margot. Conferir agora faz um teste de verdade.",
    link: { label: "Abrir Regras", href: "/admin/regras" },
    check: "agenda",
  });
}

export function financeiroConnection(i: ConexoesInput["financeiro"]): Connection {
  const bills =
    i.openBills > 0
      ? `${i.openBills} conta${i.openBills > 1 ? "s" : ""} a pagar, ${formatBRL(i.openBillsCents)} no total.`
      : "Nenhuma conta a pagar agora.";
  return conn({
    key: "financeiro",
    name: "Financeiro",
    state: "ok",
    headline: "Funcionando",
    detail: `${bills} A Margot lança despesas pelo seu WhatsApp e só grava depois do seu “sim”.`,
    link: { label: "Abrir Dinheiro", href: "/admin/financeiro" },
  });
}

export function rotinaConnection(i: ConexoesInput["rotina"], now: Date): Connection {
  const base = { key: "rotina" as const, name: "Rotina das 7h (resumo do dia)" };
  if (!i.cronSecret) {
    return conn({
      ...base,
      state: "falta",
      headline: "Sem a chave da rotina",
      detail: "Sem ela, a Vercel não consegue chamar a rotina que confere alertas e manda o resumo do dia.",
      missing: ["CRON_SECRET"],
      steps: ["Cadastre CRON_SECRET na Vercel (um texto longo e aleatório) e faça um novo deploy."],
    });
  }
  const r = i.record;
  if (!r) {
    return conn({
      ...base,
      state: "atencao",
      headline: "Ainda sem registro",
      detail: "A rotina roda todo dia por volta das 7h. Depois da próxima rodada, o registro aparece aqui.",
    });
  }
  const hours = (now.getTime() - new Date(r.at).getTime()) / 3_600_000;
  if (hours > ROUTINE_STALE_HOURS) {
    return conn({
      ...base,
      state: "atencao",
      headline: `Última rodada ${agoLabel(r.at, now)}`,
      detail: "Era para rodar todo dia por volta das 7h. Confira na Vercel (Cron Jobs) se ela está ativa.",
    });
  }
  const when = whenLabel(r.at, now);
  if (r.resumoEnviado) {
    return conn({
      ...base,
      state: "ok",
      headline: `Rodou ${when}`,
      detail: r.detalhe?.includes("modelo") ? "Mandou o aviso modelo, porque a conversa com você estava fechada." : "Mandou o resumo do dia no seu WhatsApp.",
    });
  }
  if (r.detalhe === "Nada para avisar hoje") {
    return conn({ ...base, state: "ok", headline: `Rodou ${when}`, detail: "Não havia nada para avisar, então não mandou resumo." });
  }
  if (r.detalhe === "Resumo diário desligado em Regras") {
    return conn({
      ...base,
      state: "ok",
      headline: `Rodou ${when}`,
      detail: "O resumo diário está desligado em Regras. Os alertas continuam aparecendo no painel.",
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  if (r.detalhe && !BENIGN_ROUTINE_NOTES.includes(r.detalhe)) {
    return conn({
      ...base,
      state: "atencao",
      headline: `Rodou ${when}, mas não mandou o resumo`,
      detail: `${r.detalhe}.`,
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  return conn({ ...base, state: "ok", headline: `Rodou ${when}`, detail: "Conferiu os alertas do dia." });
}

export function iaConnection(i: ConexoesInput["ia"]): Connection {
  const base = { key: "ia" as const, name: "IA da Margot" };
  if (!i.keySet) {
    return conn({
      ...base,
      state: "falta",
      headline: "Falta a chave da IA",
      detail: "Sem ela a Margot não responde ninguém, nem no WhatsApp nem no site.",
      missing: ["ANTHROPIC_API_KEY"],
      steps: ["Crie uma chave de API no console da Anthropic.", "Cadastre ANTHROPIC_API_KEY na Vercel e faça um novo deploy."],
    });
  }
  if (i.limitUsd <= 0) {
    return conn({
      ...base,
      state: "atencao",
      headline: "Desligada (limite do mês em zero)",
      detail: "Com o limite em zero a Margot não responde. Mude o limite em Regras.",
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  const used = `${usd(i.usageUsd)} de ${usd(i.limitUsd)} no mês`;
  if (i.usageUsd >= i.limitUsd) {
    return conn({
      ...base,
      state: "atencao",
      headline: "Limite do mês atingido",
      detail: `Gastou ${used}. A Margot pausa até o mês virar ou até você subir o limite em Regras.`,
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  if (i.usageUsd >= i.limitUsd * 0.9) {
    return conn({
      ...base,
      state: "atencao",
      headline: "Perto do limite do mês",
      detail: `Gastou ${used}. Se chegar ao limite, a Margot pausa.`,
      link: { label: "Abrir Regras", href: "/admin/regras" },
    });
  }
  return conn({ ...base, state: "ok", headline: "Pronta", detail: `Gastou ${used}.`, link: { label: "Ver o custo", href: "/admin/financeiro" } });
}

export function fotosConnection(i: ConexoesInput["fotos"]): Connection {
  const base = { key: "fotos" as const, name: "Fotos do site" };
  if (i.missing.length) {
    return conn({
      ...base,
      state: "falta",
      headline: "Falta configurar",
      detail: "Sem isso não dá para enviar fotos novas para o site.",
      missing: i.missing,
      steps: ["Crie uma conta no Cloudinary e copie o nome da conta, a chave e o segredo.", "Cadastre as variáveis listadas abaixo na Vercel e faça um novo deploy."],
    });
  }
  return conn({
    ...base,
    state: "ok",
    headline: "Configurado",
    detail: "Você envia e organiza as fotos do site pelo painel.",
    link: { label: "Abrir Site", href: "/admin/dashboard?aba=site" },
  });
}

export function apiConnection(i: ConexoesInput["api"]): Connection {
  const base = { key: "api" as const, name: "API para a Claude e outras ferramentas" };
  if (i.enabled) {
    return conn({
      ...base,
      state: "ok",
      headline: "Ativa",
      detail: "A Claude e outras ferramentas podem consultar pedidos, datas e regras (caminho /api/v1), protegidas por um token.",
    });
  }
  return conn({
    ...base,
    state: "fora",
    headline: "Desligada (opcional)",
    detail: "Só precisa ligar se uma ferramenta de fora for ler os dados do negócio.",
    missing: ["AGENT_API_TOKEN"],
    steps: ["Cadastre AGENT_API_TOKEN na Vercel (no mínimo 24 caracteres) e faça um novo deploy."],
  });
}

/**
 * Instagram: não passa pelo painel. A Claude agenda os posts no Metricool e guarda o calendário no painel do Instagram.
 * O link desse painel não fica no código (o repositório é público): vem da variável opcional INSTAGRAM_PANEL_URL.
 */
export function instagramConnection(panelUrl = ""): Connection {
  const url = /^https:\/\/\S+$/.test(panelUrl.trim()) ? panelUrl.trim() : "";
  return conn({
    key: "instagram",
    name: "Instagram @eucaseidelafer",
    state: "fora",
    headline: "Funciona fora do painel",
    detail: "A Claude agenda os posts no Metricool, só os que você aprova. O calendário e a aprovação ficam no painel do Instagram.",
    ...(url
      ? { link: { label: "Abrir o painel do Instagram", href: url, external: true } }
      : { steps: ["Para abrir o painel do Instagram direto daqui, cadastre INSTAGRAM_PANEL_URL na Vercel com o link dele (opcional) e faça um novo deploy."] }),
  });
}

export function metricoolConnection(): Connection {
  return conn({
    key: "metricool",
    name: "Metricool",
    state: "fora",
    headline: "Conectado ao Instagram",
    detail: "É ele que publica na hora marcada. A Claude acessa por uma conexão própria; este painel ainda não mostra os números dele (alcance, curtidas, cliques).",
    steps: [
      "No Metricool, gere o token de acesso à API (vale conferir se o seu plano libera a API).",
      "Guarde o token e o ID da marca na Vercel, como variáveis novas.",
      "Peça à Claude para montar a tela de resultados aqui no painel.",
    ],
  });
}

/** E-mail: hoje não passa pelo painel. Os caminhos possíveis estão descritos para você escolher. */
export function gmailConnection(): Connection {
  return conn({
    key: "gmail",
    name: "Gmail",
    state: "falta",
    headline: "Ainda não conectado",
    detail: "O painel não lê nem envia e-mail. Pedidos e contatos que chegam por e-mail ficam só no Gmail.",
    steps: [
      "Escolha o caminho. (A) A Claude lê e responde o seu Gmail quando você pedir, por um conector próprio: é rápido, mas fica fora do painel. (B) O painel recebe os e-mails e a Margot trata como as mensagens do WhatsApp: exige criar um app no Google Cloud e a sua autorização.",
      "Nos dois caminhos, quem autoriza o acesso é você, na sua conta Google. Nenhuma senha passa pelo painel.",
      "Diga à Claude qual caminho prefere, que ela prepara o resto.",
    ],
  });
}

export function buildConnections(input: ConexoesInput): Connection[] {
  return [
    whatsappConnection(input.whatsapp),
    agendaConnection(input.agenda),
    financeiroConnection(input.financeiro),
    rotinaConnection(input.rotina, input.now),
    iaConnection(input.ia),
    instagramConnection(input.instagram.panelUrl),
    metricoolConnection(),
    gmailConnection(),
    apiConnection(input.api),
    fotosConnection(input.fotos),
  ];
}

/** Separa o que pede ação do que está em dia e do que vive fora do painel. */
export function groupConnections(list: Connection[]) {
  return {
    atencao: list.filter((c) => c.state === "falta" || c.state === "atencao"),
    funcionando: list.filter((c) => c.state === "ok"),
    fora: list.filter((c) => c.state === "fora"),
  };
}

/** Quantas conexões pedem ação (o número do aviso em "Mais"). Instagram e Metricool não contam: funcionam fora do painel. */
export function attentionCount(list: Connection[]): number {
  return list.filter((c) => c.state === "falta" || c.state === "atencao").length;
}
