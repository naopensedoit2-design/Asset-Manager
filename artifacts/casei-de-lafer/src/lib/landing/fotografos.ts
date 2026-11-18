// Fotógrafos já usados nas fotos da galeria, para o painel sugerir em vez de pedir para digitar de novo.
// Sem tabela nova: a lista sai dos créditos gravados no campo "Local" de cada foto (curadoria.ts).

import { lerLocal } from "./curadoria.ts";

interface FotoComCredito {
  local: string;
  casal: string;
}

const chave = (t: string) => t.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/^@/, "").replace(/\s+/g, " ").trim();

export interface Fotografos {
  /** Do mais usado para o menos usado; nomes repetidos com maiúscula diferente contam como um. */
  lista: string[];
  /** Fotógrafo mais usado em cada casal (pela tag do casal), para já vir preenchido. */
  doCasal: (casal: string) => string;
}

export function fotografosConhecidos(fotos: readonly FotoComCredito[]): Fotografos {
  const total = new Map<string, { nome: string; vezes: number }>();
  const porCasal = new Map<string, Map<string, number>>();
  for (const f of fotos) {
    const { credito } = lerLocal(f.local);
    if (!credito) continue;
    const k = chave(credito);
    const atual = total.get(k);
    total.set(k, { nome: atual?.nome ?? credito, vezes: (atual?.vezes ?? 0) + 1 });
    const casal = chave(f.casal);
    if (!casal) continue;
    const doCasal = porCasal.get(casal) ?? new Map<string, number>();
    doCasal.set(k, (doCasal.get(k) ?? 0) + 1);
    porCasal.set(casal, doCasal);
  }
  const lista = [...total.values()].sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, "pt-BR")).map((v) => v.nome);
  return {
    lista,
    doCasal(casal) {
      const contagem = porCasal.get(chave(casal));
      if (!contagem) return "";
      const [k] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]!;
      return total.get(k)?.nome ?? "";
    },
  };
}
