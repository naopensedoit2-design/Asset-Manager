// Reserva da Margot quando a API do Claude falha (chave recusada, sem crédito, fora do ar ou limite do mês).
// Decisão do dono em 24/11/2026 (opção A): a reserva só acolhe. Ela cumprimenta, mostra que entendeu o pedido e
// diz que nossa equipe já foi avisada. Não fala de preço, data livre, reserva nem pagamento, e não usa ferramentas,
// porque um modelo menor erraria nisso. O dono recebe um aviso com o motivo (motivoFalhaIA).
//
// Provedor: qualquer API compatível com a da OpenAI. Por padrão, a Groq (plano grátis), com a mesma chave que já
// serve de reserva para ouvir áudios (VOICE_FALLBACK_API_KEY), ou MARGOT_FALLBACK_API_KEY se existir.
// Partes puras testadas em reserva.test.ts.

function env(k: string) {
  return (process.env[k] ?? "").trim();
}

export function reservaConfig(): { key: string; base: string; model: string } | null {
  const key = env("MARGOT_FALLBACK_API_KEY") || env("VOICE_FALLBACK_API_KEY");
  if (!key) return null;
  return {
    key,
    base: (env("MARGOT_FALLBACK_API_BASE") || env("VOICE_FALLBACK_API_BASE") || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
    model: env("MARGOT_FALLBACK_MODEL") || "llama-3.3-70b-versatile",
  };
}

/** Texto fixo quando nem a reserva responde (ou responde algo que não pode ir à pessoa). */
export const RESERVA_TEXTO_FIXO =
  "Olá! Recebemos a sua mensagem e já avisamos a nossa equipe, que te responde por aqui em breve. Agradecemos a paciência!";

export const RESERVA_PROMPT = `Você é a Margot, assistente virtual da Eu Casei de Lafer (aluguel de um carro clássico conversível para casamentos e ensaios pré-wedding na Serra Gaúcha).
Agora o sistema principal está fora do ar. Sua única tarefa é acolher a pessoa em português do Brasil:
- Cumprimente com cordialidade e mostre, em poucas palavras, que entendeu o que ela pediu.
- Diga que nossa equipe já foi avisada e responde por aqui em breve.
- Nunca diga valores, preços, descontos, se uma data está livre ou ocupada, nem confirme reserva ou pagamento.
- Não faça perguntas, não invente informação, não use a palavra "inesquecível" nem "sonho".
- Fale sempre "nossa equipe", nunca o nome de uma pessoa.
- No máximo 3 frases, tom de anfitriã, sem pressa e sem pressionar.`;

/**
 * A resposta da reserva pode ir à pessoa? Barra o que só o sistema principal pode dizer: valores, números
 * (datas, horários, chaves), confirmação de data ou de pagamento. Na dúvida, vai o texto fixo.
 */
export function respostaReservaSegura(texto: string): boolean {
  const t = texto.trim();
  if (t.length < 10 || t.length > 600) return false;
  if (/R\$|reais|\d/.test(t)) return false;
  const plano = t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/\b(disponi|livre|ocupad|reserv|confirm|garant|descont|pix|sinal\b)/.test(plano)) return false;
  if (/inesquec|sonho|conto de fadas/.test(plano)) return false;
  return true;
}

/** Motivo da falha da API do Claude, em palavras do dono, a partir da mensagem de erro. */
export function motivoFalhaIA(erro: string): string {
  const e = erro.toLowerCase();
  if (e.includes("sem chave")) return "a chave da API do Claude não está configurada na Vercel";
  if (e.includes("limite do mês")) return "o limite mensal de gasto da Margot (em Regras) foi atingido";
  if (!e.includes("claude api")) return "erro inesperado no sistema da Margot (veja os registros da Vercel)";
  if (e.includes("credit balance") || e.includes("billing") || e.includes("crédito")) return "acabou o crédito da API do Claude (platform.claude.com → Billing)";
  if (e.includes(" 401") || e.includes("invalid x-api-key") || e.includes("authentication")) {
    return "a chave da API do Claude foi recusada (apagada, desativada ou trocada): crie outra e atualize ANTHROPIC_API_KEY na Vercel, depois faça Redeploy";
  }
  if (e.includes(" 403") || e.includes("permission")) return "a chave da API do Claude não tem permissão para este uso";
  if (e.includes(" 429") || e.includes("rate_limit")) return "a API do Claude está limitando as chamadas (muitas em pouco tempo)";
  if (e.includes(" 529") || e.includes(" 500") || e.includes(" 503") || e.includes("overloaded")) return "a API do Claude está fora do ar ou sobrecarregada";
  return "a API do Claude falhou";
}

/** De quanto em quanto tempo o dono recebe de novo o aviso de que a Margot está sem IA. */
export const AVISO_SEM_IA_MS = 3 * 3_600_000;

/** Pode avisar o dono de novo? Avisa se nunca avisou, se o motivo mudou ou se já passou o intervalo. */
export function deveAvisarSemIA(ultimo: { at: number; motivo: string } | null, agora: number, motivo: string): boolean {
  if (!ultimo) return true;
  if (ultimo.motivo !== motivo) return true;
  return agora - ultimo.at >= AVISO_SEM_IA_MS;
}

/** Resposta da reserva para a última fala da pessoa; null se não houver reserva configurada ou ela falhar. */
export async function responderPelaReserva(mensagemDaPessoa: string, primeiroContato: boolean): Promise<string | null> {
  const c = reservaConfig();
  if (!c) return null;
  try {
    const res = await fetch(`${c.base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${c.key}` },
      body: JSON.stringify({
        model: c.model,
        max_tokens: 200,
        temperature: 0.3,
        messages: [
          { role: "system", content: `${RESERVA_PROMPT}\n${primeiroContato ? "É o primeiro contato: apresente-se em meia frase." : "Vocês já conversaram: não se apresente de novo."}` },
          { role: "user", content: mensagemDaPessoa.slice(0, 2000) || "(a pessoa mandou uma foto, áudio ou arquivo)" },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`[margot] reserva ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("[margot] reserva", e);
    return null;
  }
}
