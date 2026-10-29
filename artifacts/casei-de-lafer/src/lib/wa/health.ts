// Estado de envio do número da Margot na Meta (`health_status`) e textos em português para o cartão de Regras.
// Puro: testado em wa.test.ts. A Meta pode mudar ou omitir campos, então nada aqui lança erro.

export type CanSend = "AVAILABLE" | "LIMITED" | "BLOCKED" | "";

export interface HealthIssue {
  code: string; // código do erro da Meta, quando houver
  text: string; // o que a Meta disse (em inglês)
  solution: string; // o que a Meta recomenda (em inglês)
}

export interface PhoneHealth {
  canSend: CanSend;
  issues: HealthIssue[];
}

const s = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/**
 * Lê a resposta da Meta para `?fields=health_status`: o estado geral (`can_send_message`) e os problemas
 * (`errors` e `additional_info`) do número e dos itens ligados a ele, sem repetir o mesmo aviso.
 */
export function parseHealth(raw: unknown): PhoneHealth {
  const hs = obj(obj(raw).health_status);
  const top = s(hs.can_send_message).toUpperCase();
  const canSend: CanSend = top === "AVAILABLE" || top === "LIMITED" || top === "BLOCKED" ? top : "";

  const issues: HealthIssue[] = [];
  const seen = new Set<string>();
  const add = (issue: HealthIssue) => {
    if (!issue.code && !issue.text && !issue.solution) return;
    const key = `${issue.code}|${issue.text}|${issue.solution}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push(issue);
  };

  for (const node of [hs, ...arr(hs.entities).map(obj)]) {
    for (const e of arr(node.errors)) {
      const o = obj(e);
      add({ code: s(o.error_code), text: s(o.error_description), solution: s(o.possible_solution) });
    }
    const info = Array.isArray(node.additional_info) ? node.additional_info : node.additional_info ? [node.additional_info] : [];
    for (const i of info) {
      const o = obj(i);
      add({ code: "", text: typeof i === "string" ? i : s(o.description) || s(o.message), solution: "" });
    }
  }
  return { canSend, issues };
}

const NAME_STATUS: Record<string, string> = {
  APPROVED: "aprovado",
  AVAILABLE_WITHOUT_REVIEW: "pronto para uso, sem revisão",
  PENDING_REVIEW: "em análise pela Meta",
  DECLINED: "recusado pela Meta",
  EXPIRED: "expirado",
  NONE: "sem nome aprovado",
};

/** Estado do nome de exibição em português (valores definidos pela Meta); um valor desconhecido volta como veio. */
export function nameStatusText(status: string | undefined): string {
  return NAME_STATUS[(status ?? "").toUpperCase()] ?? status ?? "";
}

/** "Pode enviar?" em português, com um tom para a cor do cartão. */
export function canSendText(h: PhoneHealth | null | undefined): { tone: "ok" | "warn" | "bad" | "none"; text: string } {
  switch (h?.canSend) {
    case "AVAILABLE":
      return { tone: "ok", text: "sim (a Meta confirma que o número cumpre os requisitos)" };
    case "LIMITED":
      return { tone: "warn", text: "com limites (veja abaixo)" };
    case "BLOCKED":
      return { tone: "bad", text: "não: a Meta bloqueou o envio por este número (veja abaixo)" };
    default:
      return { tone: "none", text: "a Meta não informou" };
  }
}

const ACCOUNT_MODE: Record<string, string> = {
  SANDBOX: "número de teste da Meta",
  LIVE: "número de produção",
};

/** Tipo do número (a Meta só devolve este campo para algumas contas); valor desconhecido volta como veio. */
export function accountModeText(mode: string | undefined): string {
  return ACCOUNT_MODE[(mode ?? "").toUpperCase()] ?? mode ?? "";
}

/** Erros da Meta que o painel ainda não traduzia (cada código vem da tabela oficial de erros da Meta). */
export const EXTRA_ERROR_TEXT: Record<number, string> = {
  131037:
    "A Meta recusou o envio: o número da Margot ainda não tem nome de exibição aprovado. Veja o status do nome neste cartão (Regras) ou em Telefones, no Gerenciador do WhatsApp.",
  131045: "O número da Margot ainda não está registrado na API. Use \"Registrar o número na API\" em Regras.",
  133005: "O PIN de 6 números está incorreto. Se o número já tinha verificação em duas etapas, use o PIN dela.",
  131031: "A Meta restringiu ou desativou a conta do WhatsApp por violar uma política da plataforma. Veja os avisos da conta no Gerenciador do WhatsApp.",
};
