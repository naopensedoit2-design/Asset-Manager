// Todo o texto da página inicial, num lugar só. Cada frase daqui foi aprovada pelo dono.
// Regra: só entra o que o painel (Regras) ou o dono confirmaram. Valores, sinal e prazos vêm do painel
// (ver dados.ts), nunca digitados aqui. Nada de urgência, escassez, número de casamentos ou adjetivo sem prova.
// A equipe é sempre "nossa equipe": o nome do dono não aparece.

import type { ServicoPublico } from "./servicos.ts";

// Espaço que não quebra linha, para "MP Lafer" e "MG TD" nunca se partirem em duas linhas.
const NB = String.fromCharCode(160);
const MP = `MP${NB}Lafer`;

export const MARCA = "Eu Casei de Lafer";
export const REGIAO = "Serra Gaúcha";
export const INSTAGRAM = { usuario: "@eucaseidelafer", url: "https://instagram.com/eucaseidelafer" };

/** O botão tem um nome só, em todos os lugares da página. */
export const BOTAO = "Ver se minha data está livre";
export const LINK_CHAT = "Prefere o chat? Monte o orçamento com a Margot, nossa assistente virtual.";

export const PAGINA = {
  titulo: "Eu Casei de Lafer · Carro de noiva MP Lafer 1980 na Serra Gaúcha",
  descricao: "Carro de noiva MP Lafer 1980 conversível, na Serra Gaúcha. Veja se a sua data está livre.",
};

export const CAPA = {
  titulo: ["Chegue", "de Lafer."] as const,
  sub: `Carro de noiva ${MP}${NB}1980 conversível, na Serra Gaúcha.`,
  campoData: "Data do casamento",
  escolher: "Escolher a data",
  nota: "Abre o WhatsApp com a mensagem pronta. Sem a data também funciona.",
  aPartirDe: "a partir de",
  valores: "Valores",
  alt: "MP Lafer conversível, carro de noiva na Serra Gaúcha",
};

export const FATO = {
  linhas: ["Um carro.", "Uma data.", "Um casamento."] as const,
  texto: `Temos um único ${MP}. Quando uma data é reservada, ela fica só com aquele casal.`,
};

export const PASSAGEM = {
  rotulo: "MP Lafer · 1980",
  frase: "Conversível. Dois lugares. Branco perolado.",
  secao: "O carro em movimento",
};

export const SERVICOS = {
  rotulo: "Serviços e valores",
  titulo: "Três momentos com o carro.",
  tituloGeral: "Momentos com o carro.",
  saidaSemValor: "Adicional ao Carro da Noiva. O valor vai no orçamento.",
  semValor: "O valor vai no orçamento.",
  credito: "Foto:",
  incluso: {
    titulo: "No Carro da Noiva",
    itens: [
      "Deslocamento do carro até o local, ida e volta",
      "Veículo preparado e higienizado",
      "Até 3 horas no local",
      "Acompanhamento do responsável pelo veículo",
      "Traje de motorista e decoração, sob pedido",
    ],
  },
  nota: "O valor final é confirmado pela nossa equipe no orçamento. Fora da Serra Gaúcha, avaliamos caso a caso.",
};

export type ChaveDoMomento = "chegada" | "saida" | "ensaio";

export interface Momento {
  /** Qual foto da curadoria acompanha o serviço. null = serviço que a página não conhece: sem foto própria. */
  chave: ChaveDoMomento | null;
  /** Nome do serviço, como está em Regras. */
  rotulo: string;
  titulo: string;
  texto: string;
  /** Valor-base em centavos; null quando o serviço aparece sem valor. */
  aPartirDeCents: number | null;
  /** Frase no lugar do valor, quando não há valor. */
  semValor: string;
}

const simples = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();

const ORDEM: Record<ChaveDoMomento, number> = { chegada: 0, saida: 1, ensaio: 2 };

/** Cada serviço de Regras vira um momento da página. Os três conhecidos têm título e frase próprios. */
export function momentos(servicos: readonly ServicoPublico[]): Momento[] {
  const lista = servicos.map((s): Momento => {
    const nome = simples(s.nome);
    const base = { rotulo: s.nome, aPartirDeCents: s.aPartirDeCents };
    if (s.adicional) {
      return {
        ...base,
        chave: "saida",
        titulo: "A saída",
        texto: "Depois da chegada da noiva, o carro fica para um segundo deslocamento no mesmo local.",
        semValor: SERVICOS.saidaSemValor,
      };
    }
    if (nome.includes("ensaio")) {
      return { ...base, chave: "ensaio", titulo: "O ensaio", texto: "Até 3 horas com o carro, em um único local.", semValor: SERVICOS.semValor };
    }
    if (nome.includes("noiva")) {
      return { ...base, chave: "chegada", titulo: "A chegada", texto: `A noiva chega ao local da cerimônia no ${MP}.`, semValor: SERVICOS.semValor };
    }
    return { ...base, chave: null, titulo: s.nome, texto: s.descricao, semValor: SERVICOS.semValor };
  });
  // Um momento por chave (dois serviços parecidos no painel não repetem a mesma foto e o mesmo título).
  const vistos = new Set<string>();
  return lista
    .filter((m) => {
      if (!m.chave) return true;
      if (vistos.has(m.chave)) return false;
      vistos.add(m.chave);
      return true;
    })
    .sort((a, b) => (a.chave ? ORDEM[a.chave] : 9) - (b.chave ? ORDEM[b.chave] : 9));
}

export const CARRO = {
  rotulo: "O carro",
  titulo: ["Nasceu numa ", "fábrica de móveis", "."] as const,
  historia: `O ${MP} foi feito pela Lafer, uma indústria de móveis, inspirado no MG${NB}TD inglês. Foram cerca de 4.300 unidades, de 1974 a 1990.`,
  nosso: "O nosso é de 1980: conversível, 2 lugares, branco perolado.",
  ficha: [
    ["Modelo", "MP Lafer"],
    ["Ano", "1980"],
    ["Carroceria", "Conversível"],
    ["Lugares", "2"],
    ["Cor", "Branco perolado"],
    ["Desenho", "Inspirado no MG TD inglês"],
    ["Produção", "Cerca de 4.300 unidades, 1974 a 1990"],
  ] as const,
  fichaNome: "Ficha do carro",
  fontes: [
    { nome: "Autoentusiastas, 2020", url: "https://autoentusiastas.com.br/2020/04/mp-lafer-um-fora-de-serie-brasileiro-ao-estilo-ingles/" },
    { nome: "iCarros, 2020", url: "https://www.icarros.com.br/noticias/geral/mp-lafer-foi-concebido-por-um-fabricante-de-moveis/28736.html" },
  ],
  detalhes: "Detalhes do carro",
};

/** O que a página precisa das Regras do painel. */
export interface RegrasPublicas {
  sinalPercent: number;
  saldoPercent: number;
  saldoDiasAntes: number;
  /** Prazo para remarcar o ensaio por chuva forte, lido do texto de cancelamento de Regras. null = o texto não diz. */
  chuvaDias: number | null;
}

/** Acha "chuva ... N dias" no texto de cancelamento de Regras. Se o dono mudar ou tirar a regra, a página acompanha. */
export function diasDeChuva(politica: string): number | null {
  const achado = /chuva[^.]*?\bsem custo\b[^.]*?\b(\d{1,3})\s*dias\b/i.exec(politica);
  return achado ? Number(achado[1]) : null;
}

export const diasAntes = (n: number) => (n <= 0 ? "no dia do evento" : n === 1 ? "1 dia antes" : `${n} dias antes`);

export const OFICIOS = {
  rotulo: "Para quem faz o casamento",
  titulo: "Você organiza ou fotografa?",
  texto: "O que você precisa saber antes de indicar o carro a um casal.",
  cerimonial: { rotulo: "Cerimonialistas", titulo: "Como funciona no dia", link: "Indicar ou reservar para um casal" },
  fotografo: { rotulo: "Fotógrafos", titulo: "O carro como cenário", link: "Combinar um ensaio com o carro" },
};

type Item = { forte: string; texto: string };

export function itensDoCerimonial(r: RegrasPublicas): Item[] {
  return [
    { forte: "Uma data, um casamento.", texto: "O carro não divide o dia com outro evento." },
    { forte: "Ida, volta e até 3 horas no local.", texto: "O carro vai até a cerimônia e volta." },
    { forte: "Responsável junto do carro.", texto: "Alguém da nossa equipe acompanha o veículo." },
    { forte: "Tudo por escrito.", texto: `Orçamento, Termo Simplificado e sinal de ${r.sinalPercent}% por Pix.` },
  ];
}

/** `comCredito`: só promete crédito em cada foto quando todas as fotos dos momentos têm crédito no painel. */
export function itensDoFotografo(r: RegrasPublicas, comCredito: boolean): Item[] {
  const itens: Item[] = [{ forte: "Até 3 horas no ensaio,", texto: "em um único local. Um segundo local entra no orçamento." }];
  if (r.chuvaDias) itens.push({ forte: "Chuva forte no dia?", texto: `O ensaio pode ser remarcado sem custo em até ${r.chuvaDias} dias.` });
  if (comCredito) itens.push({ forte: "Crédito em cada foto.", texto: "Toda foto desta página leva o nome de quem fotografou." });
  return itens;
}

export const RESERVA = {
  rotulo: "Como reservar",
  titulo: "Da data ao sinal, em quatro passos.",
  nota: "A data só fica garantida depois do sinal.",
};

export function passos(r: RegrasPublicas): { texto: string; apoio?: string }[] {
  return [
    { texto: "Você manda data, cidade e serviço." },
    { texto: "Conferimos a agenda e enviamos o orçamento." },
    { texto: "Você aprova e assina o Termo Simplificado." },
    {
      texto: `Você paga o sinal de ${r.sinalPercent}% por Pix e a data fica garantida.`,
      apoio: `O saldo, ${r.saldoPercent}%, vence ${diasAntes(r.saldoDiasAntes)}.`,
    },
  ];
}

export const PERGUNTAS = { rotulo: "Perguntas frequentes", titulo: "Antes de perguntar." };

/** `ensaio`: o valor-base do ensaio já escrito ("R$ ..."), ou null se o painel não tiver o serviço. */
export function perguntas(r: RegrasPublicas, ensaio: string | null): { pergunta: string; resposta: string }[] {
  return [
    {
      pergunta: "Quais cidades vocês atendem?",
      resposta: "A Serra Gaúcha. Fora dela, a nossa equipe avalia caso a caso e confirma o valor.",
    },
    {
      pergunta: "Como funciona o ensaio pré-wedding?",
      resposta: "O carro fica até 3 horas com vocês, em um único local" + (ensaio ? `, a partir de ${ensaio}.` : "."),
    },
    {
      pergunta: "Posso pedir decoração ou traje de motorista?",
      resposta: "A decoração é opcional e combinada com a nossa equipe, caso a caso. O traje de motorista não tem custo: é só pedir.",
    },
    { pergunta: "Quantos lugares tem o carro?", resposta: `O ${MP} é um conversível de 2 lugares.` },
    {
      pergunta: "Como reservo a minha data?",
      resposta:
        `Você aprova o orçamento, assina o Termo Simplificado e paga o sinal de ${r.sinalPercent}% por Pix. ` +
        `O saldo, ${r.saldoPercent}%, vence ${diasAntes(r.saldoDiasAntes)}. A data só fica garantida depois do sinal.`,
    },
  ];
}

export const CONVITE = {
  titulo: "Qual é a data do seu casamento?",
  texto: "Conte a data e a cidade. Conferimos a agenda e respondemos com o orçamento.",
  campoData: "Data",
  campoLocal: "Cidade ou local",
  exemploLocal: "Ex.: Gramado",
  nota: "Abre o WhatsApp com a mensagem pronta.",
};

export const RODAPE = {
  linha: "Carro de noiva MP Lafer 1980 na Serra Gaúcha.",
  privacidade: "Política de privacidade",
};

/** Barra fixa do celular quando a pessoa já escolheu a data: "Ver se 13/03/2027 está livre". */
export const BOTAO_COM_DATA = ["Ver se ", " está livre"] as const;
