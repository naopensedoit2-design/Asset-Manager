// De qual botão e campanha da página inicial a conversa do chat veio. O /conversar repassa ?b=botão&c=campanha no
// endereço do chat; o chat guarda isso no começo do código da conversa, que já é gravado em AiUsage (até 64
// caracteres): "topo.nome-da-campanha.<uuid>". Sem tabela nova e sem cookie. Este arquivo é pequeno de propósito:
// ele vai no pacote do chat, então não importa o texto da página nem outras regras da landing.

// Mesma lista de BOTOES em links.ts mais "outro" (o teste confere que não saíram do passo).
export const BOTOES_CONHECIDOS = ["topo", "valores", "final", "rodape", "outro"] as const;

/** 7 (maior botão) + 18 + 2 pontos + 36 (uuid) = 63, abaixo dos 64 caracteres que o banco guarda. */
export const MAX_CAMPANHA = 18;
export const MAX_CODIGO = 64;

/** Começo do código da conversa ("topo.campanha."), ou "" se a pessoa não chegou por um botão da página. */
export function origemDaConversa(search: string): string {
  const params = new URLSearchParams(search);
  const botao = params.get("b");
  if (!botao) return "";
  const conhecido = (BOTOES_CONHECIDOS as readonly string[]).includes(botao) ? botao : "outro";
  const campanha = (params.get("c") ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, MAX_CAMPANHA);
  return `${conhecido}.${campanha || "sem-campanha"}.`;
}

/** Código da conversa: a origem (se houver) na frente do uuid, sempre dentro do limite do banco. */
export const codigoDaConversa = (search: string, uuid: string): string => `${origemDaConversa(search)}${uuid}`.slice(0, MAX_CODIGO);
