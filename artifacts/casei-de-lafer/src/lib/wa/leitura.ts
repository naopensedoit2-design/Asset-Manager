// Leitura da conversa do dono com a Margot (modo secretária) para o Claude analisar e melhorar a Margot.
// Puro, sem banco: decide quem pode ler e esconde documentos pessoais antes de sair do servidor.

/**
 * Só responde pelos endereços *.vercel.app, que ficam atrás da Vercel Authentication do projeto
 * ("all_except_custom_domains"): quem entra é a conta Vercel do dono. Pelo domínio próprio, que é público, nunca.
 * E só se o dono ligou a leitura (LEITURA_SECRETARIA=1).
 */
export function leituraPermitida(host: string | null | undefined, flag: string | undefined): boolean {
  if (flag !== "1") return false;
  const h = (host ?? "").toLowerCase().split(":")[0].trim();
  return /^[a-z0-9-]+\.vercel\.app$/.test(h);
}

/** Esconde CPF, RG, passaporte, e-mail e números longos que não são telefone. */
export function semDocumentos(text: string): string {
  return text
    .replace(/\b(CPF|RG|passaporte|identidade|CNH)\s*[:nº.]*\s*[\w.\-/]+/gi, "$1: [oculto]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF oculto]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail oculto]")
    .replace(/\b(CEP)\s*:?\s*[\d.\-]+/gi, "$1: [oculto]");
}

export interface LinhaConversa {
  id: number;
  em: string;
  de: "leonardo" | "margot" | "sistema";
  tipo: string;
  texto: string;
  /** Mensagem com botão de confirmação: o que foi proposto e se ele confirmou. */
  acao?: string;
}

export function linha(m: {
  id: number;
  createdAt: Date;
  direction: string;
  author: string;
  type: string;
  text: string;
  fileName: string;
  action: string;
  actionDoneAt: Date | null;
}): LinhaConversa {
  const de = m.direction === "in" ? "leonardo" : m.author === "sistema" ? "sistema" : "margot";
  const texto = semDocumentos(m.text || (m.fileName ? `[arquivo: ${m.fileName}]` : `[${m.type}]`)).slice(0, 4000);
  const out: LinhaConversa = { id: m.id, em: m.createdAt.toISOString(), de, tipo: m.type, texto };
  if (m.action) {
    let tipo = "";
    try {
      tipo = String(JSON.parse(m.action)?.tipo ?? "");
    } catch {
      tipo = "?";
    }
    out.acao = `${tipo}: ${m.actionDoneAt ? "resolvida" : "pendente"}`;
  }
  return out;
}
