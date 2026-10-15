// Confere a assinatura que a Meta manda em cada webhook (cabeçalho X-Hub-Signature-256).
// Sem ela, qualquer pessoa poderia fingir ser o WhatsApp e falar com a Margot pela URL pública.
// Puro: testado em wa.test.ts.

import { createHmac, timingSafeEqual } from "node:crypto";

/** "sha256=<hex>" do corpo bruto, assinado com o segredo do app (App Secret). */
export function signBody(rawBody: string | Buffer, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

/** Compara em tempo constante. O corpo precisa ser exatamente o que chegou, antes de qualquer JSON.parse. */
export function isValidSignature(rawBody: string | Buffer, header: string | null | undefined, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const expected = Buffer.from(signBody(rawBody, appSecret));
  const received = Buffer.from(header.trim().toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}
