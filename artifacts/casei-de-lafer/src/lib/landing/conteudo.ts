// Todo o texto público da página inicial, num lugar só.
// Regra: só entra o que o orçamento, o painel (Regras) ou o dono confirmaram. Valores e prazos vêm do painel
// (ver dados.ts), nunca digitados aqui. Nada de urgência, escassez ou número de casamentos sem comprovação.

import { reais } from "./reais.ts";

/** O que o botão grande faz: abre o chat da Margot ("chat") ou o WhatsApp com mensagem pronta ("whatsapp"). */
export const ACAO_PRINCIPAL: "chat" | "whatsapp" = "chat";

export const MARCA = "Eu Casei de Lafer";
// "MP Lafer" e "MP Lafer 1980" não quebram em duas linhas (espaço sem quebra); só nos textos da página.
const MP = "MP\u00A0Lafer";
const MP_1980 = `${MP}\u00A01980`;
export const CHAT_URL = "/orcamento/detalhado";
export const INSTAGRAM = { usuario: "@eucaseidelafer", url: "https://instagram.com/eucaseidelafer" };

/** O botão tem um nome só, em todos os lugares da página. */
export const BOTAO = "Ver se minha data está livre";

export const MENSAGEM_WHATSAPP = [
  "Olá! Quero ver se o MP Lafer está livre no meu casamento.",
  "Data:",
  "Cidade ou local:",
  "Serviço (Carro da Noiva, Saída dos Noivos ou Ensaio):",
].join("\n");

export const TOPO = {
  titulo: `Chegue ao seu casamento em um ${MP_1980} conversível`,
  subtitulo: "Carro de noiva na Serra Gaúcha. Temos um único carro: cada data atende um só casamento.",
  notaChat: "Você conversa com a Margot, nossa assistente virtual. Ela confere a agenda e monta o orçamento.",
  linkWhatsapp: "Prefere o WhatsApp? Fale com a nossa equipe.",
  notaWhatsapp: "Abre o WhatsApp com a mensagem pronta. É só preencher data, cidade e serviço.",
  linkChat: "Prefere o chat? Monte o orçamento com a Margot, nossa assistente virtual.",
  altFoto: "MP Lafer conversível, carro de noiva na Serra Gaúcha",
};

export const FOTOS = {
  titulo: "O carro em ensaios e casamentos",
  linha: `${MP_1980}, conversível, inspirado no MG\u00A0TD inglês.`,
  instagram: `Mais fotos e vídeos no Instagram: ${INSTAGRAM.usuario}`,
  video: "Ver o carro em movimento",
  vazio: "As fotos estão no nosso Instagram.",
  // Quando a foto não tem texto alternativo no painel. O ideal é uma frase por foto, dita no painel.
  altPadrao: "MP Lafer conversível em casamento ou ensaio",
};

export const SERVICOS = {
  titulo: "Serviços e valores",
  incluso: {
    titulo: "Incluso no Carro da Noiva",
    itens: [
      "Deslocamento do carro até o local, ida e volta",
      "Veículo preparado e higienizado",
      "Até 3 horas no local",
      "Acompanhamento e suporte do responsável pelo veículo",
    ],
  },
  extrasTitulo: "Sob pedido",
  extras: [
    { titulo: "Traje de motorista", texto: "Sem custo, se você pedir." },
    { titulo: "Decoração", texto: "Opcional, combinada com a nossa equipe." },
  ],
  nota: "O valor final depende do local do casamento e é confirmado pela nossa equipe no orçamento. Fora da Serra Gaúcha, avaliamos caso a caso.",
  semValores: "Os valores são confirmados pela nossa equipe no orçamento.",
  // Descrição de cada serviço pelo nome cadastrado no painel (sem diferenciar maiúsculas e acentos).
  descricoes: {
    "carro da noiva": `A noiva chega ao local da cerimônia no ${MP}.`,
    "saida dos noivos": "Adicional ao Carro da Noiva: o carro permanece depois da chegada da noiva para um segundo deslocamento no mesmo local.",
    "ensaio pre-wedding": "Até 3 horas com o carro, em um único local. O traje de motorista é reservado para o casamento.",
  } as Record<string, string>,
  aPartirDe: "a partir de",
};

export const normalizar = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export interface RegrasPublicas {
  sinalPercent: number;
  saldoPercent: number;
  saldoDiasAntes: number;
  validadeDias: number;
}

export const diasAntes = (n: number) => (n <= 0 ? "no dia do evento" : n === 1 ? "1 dia antes" : `${n} dias antes`);

export function passos(r: RegrasPublicas): { titulo: string; texto?: string }[] {
  return [
    { titulo: "Você manda data, cidade e serviço." },
    { titulo: "Conferimos a agenda e enviamos o orçamento.", texto: `Ele vale ${r.validadeDias} dias.` },
    { titulo: "Você aprova e assina o Termo Simplificado." },
    {
      titulo: `Você paga o sinal de ${r.sinalPercent}% por Pix e a data fica garantida.`,
      texto: `O saldo, ${r.saldoPercent}%, vence ${diasAntes(r.saldoDiasAntes)}.`,
    },
  ];
}

export const COMO_FUNCIONA = {
  titulo: "Como funciona",
  nota: "A data só fica garantida depois do sinal.",
};

export function perguntas(r: RegrasPublicas, precoEnsaioCentavos: number | null): { pergunta: string; resposta: string }[] {
  return [
    {
      pergunta: "Quais cidades vocês atendem?",
      resposta: "A Serra Gaúcha. Fora dela, a nossa equipe avalia caso a caso e confirma o valor.",
    },
    {
      pergunta: "Como funciona o ensaio pré-wedding?",
      resposta:
        "O carro fica até 3 horas com vocês, em um único local" +
        (precoEnsaioCentavos ? `, a partir de ${reais(precoEnsaioCentavos)}.` : "."),
    },
    {
      pergunta: "Posso pedir decoração ou traje de motorista?",
      resposta:
        "A decoração é opcional e combinada com a nossa equipe, caso a caso. O traje de motorista não tem custo: é só pedir.",
    },
    {
      pergunta: "Quantos lugares tem o carro?",
      resposta: `O ${MP} é um conversível de 2 lugares.`,
    },
    {
      pergunta: "Como reservo a minha data?",
      resposta: `Você aprova o orçamento, assina o Termo Simplificado e paga o sinal de ${r.sinalPercent}% por Pix. O saldo, ${r.saldoPercent}%, vence ${diasAntes(r.saldoDiasAntes)}. A data só fica garantida depois do sinal.`,
    },
  ];
}

export const PERGUNTAS_TITULO = "Perguntas frequentes";

/** Nenhum dos dois canais está de pé (chat desligado e sem WhatsApp): aviso no lugar do botão. */
export const SEM_CANAIS = {
  texto: "Atendimento temporariamente indisponível.",
  instagram: `Escreva para ${INSTAGRAM.usuario} no Instagram.`,
};

export const FINAL = {
  titulo: "Qual é a data do seu casamento?",
  texto: "Conte a data, a cidade e o serviço. Conferimos a agenda e respondemos com o orçamento.",
};

export const CALENDARIO = {
  titulo: "Datas já reservadas",
  nota: "As demais datas ainda precisam de confirmação na conversa.",
  legenda: "Reservado",
};

export const RODAPE = {
  linha: "Carro de noiva MP Lafer 1980 na Serra Gaúcha.",
  privacidade: "Política de privacidade",
  whatsapp: "WhatsApp",
};

export const META = {
  titulo: "Eu Casei de Lafer | Carro de noiva MP Lafer 1980 na Serra Gaúcha",
  descricao:
    "Alugue um MP Lafer 1980 conversível como carro de noiva na Serra Gaúcha. Carro da Noiva, Saída dos Noivos e Ensaio Pré-Wedding. Um casamento por data.",
  tituloCurto: "Eu Casei de Lafer | Carro de noiva MP Lafer 1980",
};

/** Pré-visualização do link (WhatsApp, Instagram, redes): o mesmo conteúdo no layout e na página inicial. */
export const OG = {
  title: META.tituloCurto,
  description: META.descricao,
  type: "website" as const,
  siteName: MARCA,
  locale: "pt_BR",
  images: [{ url: "/og-landing.jpg", width: 1200, height: 630, alt: TOPO.altFoto }],
};
