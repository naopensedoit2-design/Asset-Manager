// A Margot às vezes escreve "deixei pronto, é só tocar em Confirmar" sem ter chamado a ferramenta que manda o botão
// (aconteceu em 18/11 com uma despesa de foto). Regra pura para pegar essa promessa vazia. Testada em promessa.test.ts.

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const PROMESSAS = [
  /\b(toque|tocar|toca|clique|clicar)\s+(em|no)\s+\W*confirmar/,
  /\bbotao\s+(de\s+confirmacao\s+)?(chega|vai|segue|sai|esta\s+pronto|ja\s+esta)/,
  /\bdeixei\s+(pronto|pronta|preparado|preparada)\b/,
  /\bpreparei\s+o\s+(lancamento|botao|registro)/,
];

/** O texto promete um botão Confirmar que deveria ter saído nesta resposta. */
export function prometeBotao(text: string): boolean {
  const t = fold(text);
  // "falta tocar em Confirmar no botão acima": botão de antes, que ainda espera o toque. Não é promessa nova.
  if (/\bbotao\s+(acima|anterior|que\s+(eu\s+)?(ja\s+)?mandei)/.test(t)) return false;
  return PROMESSAS.some((r) => r.test(t));
}

/** O que vai para o modelo quando ele prometeu o botão e não chamou a ferramenta. */
export const LEMBRETE_BOTAO =
  "[sistema] Sua resposta diz que o botão de confirmação está pronto, mas nenhuma ferramenta de preparar foi chamada, então nenhum botão vai sair. Chame agora a ferramenta certa (ex.: lancar_despesa) com os dados que você já tem. Se faltar algum dado, pergunte em vez de prometer o botão. Responda ao Leonardo como se fosse a primeira resposta, sem falar deste aviso.";

/** Se mesmo assim nenhum botão sair, o Leonardo é avisado em vez de procurar um botão que não existe. */
export const SEM_BOTAO = "⚠️ O botão de confirmação não saiu desta vez. Me peça de novo que eu preparo.";
