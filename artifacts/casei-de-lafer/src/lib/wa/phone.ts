// Números de telefone no WhatsApp. Puro: testado em wa.test.ts.
//
// No Brasil, celulares têm 9 dígitos depois do DDD, mas o WhatsApp ainda identifica muitas
// contas antigas sem o nono dígito (55 51 8888-7777 em vez de 55 51 98888-7777). Por isso
// toda comparação de números aceita as duas formas.

export function onlyDigits(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** O número e sua variação com/sem o nono dígito (só para celulares brasileiros). */
export function phoneVariants(raw: string): string[] {
  const international = (raw ?? "").trim().startsWith("+");
  let d = onlyDigits(raw);
  if (!d) return [];
  // Brasileiro digitado sem o DDI: DDD + 8 dígitos, ou DDD + 9 + 8 dígitos (celular).
  if (!international && (d.length === 10 || (d.length === 11 && d[2] === "9"))) d = `55${d}`;
  const out = new Set([d]);
  if (d.startsWith("55")) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.length === 9 && rest.startsWith("9")) out.add(`55${ddd}${rest.slice(1)}`);
    // 8 dígitos começando com 6 a 9 é celular no formato antigo; 2 a 5 é fixo e fica como está.
    if (rest.length === 8 && /^[6-9]/.test(rest)) out.add(`55${ddd}9${rest}`);
  }
  return [...out];
}

export function samePhone(a: string, b: string): boolean {
  if (!a || !b) return false;
  const left = phoneVariants(a);
  return phoneVariants(b).some((v) => left.includes(v));
}

/** Forma completa (com o nono dígito, quando é celular brasileiro), para o cadastro do cliente. */
export function canonicalPhone(raw: string): string {
  const variants = phoneVariants(raw);
  return variants.find((v) => v.startsWith("55") && v.length === 13) ?? variants[0] ?? "";
}

/** "+55 (51) 98888-7777" para mostrar na tela. */
export function formatPhone(raw: string): string {
  const d = canonicalPhone(raw);
  if (d.startsWith("55") && (d.length === 13 || d.length === 12)) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    const cut = rest.length - 4;
    return `+55 (${ddd}) ${rest.slice(0, cut)}-${rest.slice(cut)}`;
  }
  return d ? `+${d}` : "";
}
