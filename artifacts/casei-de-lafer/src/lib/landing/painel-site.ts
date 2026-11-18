// O que cada botão da página Site do painel grava no campo "Local" das fotos. Regra pura (sem banco nem React),
// para poder testar. O formato do campo é o de curadoria.ts (lerLocal/montarLocal).

import { CAPAS_MAXIMO, lerLocal, montarLocal, type FotoDoPainel, type Lugar } from "./curadoria.ts";

/** Uma mudança a gravar: a foto `id` passa a ter este "Local". */
export interface Mudanca {
  id: number;
  local: string;
}

/** Lugares com uma foto só (a capa e os detalhes aceitam várias). */
export const LUGARES_UNICOS = ["passagem", "chegada", "saida", "ensaio", "carro", "cenario", "final"] as const;
export type LugarUnico = (typeof LUGARES_UNICOS)[number];

const so = (lista: Mudanca[], fotos: readonly FotoDoPainel[]) =>
  lista.filter((m) => fotos.find((f) => f.id === m.id)?.local !== m.local);

/** Põe a foto num lugar de uma foto só. Quem estava lá fica sem lugar (o crédito continua). */
export function colocarNoLugar(fotos: readonly FotoDoPainel[], id: number, lugar: LugarUnico): Mudanca[] {
  const mudancas: Mudanca[] = [];
  for (const f of fotos) {
    const lido = lerLocal(f.local);
    if (f.id === id) mudancas.push({ id, local: montarLocal(lugar, lido.credito) });
    else if (lido.lugar === lugar) mudancas.push({ id: f.id, local: montarLocal(null, lido.credito) });
  }
  // Saindo da capa, as outras fotos da capa fecham o buraco na numeração.
  const vinha = fotos.find((f) => f.id === id);
  if (vinha && lerLocal(vinha.local).lugar === "capa") mudancas.push(...renumerarCapa(fotos.filter((x) => x.id !== id)));
  return so(mudancas, fotos);
}

/** Tira a foto do lugar em que está (capa, detalhe ou outro). O crédito continua. */
export function tirarDoLugar(fotos: readonly FotoDoPainel[], id: number): Mudanca[] {
  const f = fotos.find((x) => x.id === id);
  if (!f) return [];
  const mudancas = [{ id, local: montarLocal(null, lerLocal(f.local).credito) }];
  // Saindo da capa, as outras fotos da capa fecham o buraco na numeração.
  if (lerLocal(f.local).lugar === "capa") return so([...mudancas, ...renumerarCapa(fotos.filter((x) => x.id !== id))], fotos);
  return so(mudancas, fotos);
}

/** Fotos da capa na ordem em que aparecem (a mesma regra da página). */
export function fotosDaCapa(fotos: readonly FotoDoPainel[]): FotoDoPainel[] {
  return fotos
    .map((f, i) => ({ f, l: lerLocal(f.local), i }))
    .filter((x) => x.l.lugar === "capa")
    .sort((a, b) => (a.l.ordem || 1000) * 10_000 + a.i - ((b.l.ordem || 1000) * 10_000 + b.i))
    .map((x) => x.f);
}

function renumerarCapa(fotos: readonly FotoDoPainel[], ordem?: number[]): Mudanca[] {
  const ids = ordem ?? fotosDaCapa(fotos).map((f) => f.id);
  return ids.map((id, i) => {
    const f = fotos.find((x) => x.id === id)!;
    return { id, local: montarLocal("capa", lerLocal(f.local).credito, i + 1) };
  });
}

/** Põe a foto no fim do carrossel da capa. Não passa do máximo de fotos. */
export function colocarNaCapa(fotos: readonly FotoDoPainel[], id: number): Mudanca[] {
  const atuais = fotosDaCapa(fotos).map((f) => f.id).filter((x) => x !== id);
  if (atuais.length >= CAPAS_MAXIMO) return [];
  return so(renumerarCapa(fotos, [...atuais, id]), fotos);
}

/** Sobe (-1) ou desce (+1) a foto uma posição no carrossel. */
export function moverNaCapa(fotos: readonly FotoDoPainel[], id: number, direcao: -1 | 1): Mudanca[] {
  const ids = fotosDaCapa(fotos).map((f) => f.id);
  const i = ids.indexOf(id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= ids.length) return [];
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  return so(renumerarCapa(fotos, ids), fotos);
}

/** Põe a foto na faixa de detalhes. */
export function colocarNosDetalhes(fotos: readonly FotoDoPainel[], id: number): Mudanca[] {
  const f = fotos.find((x) => x.id === id);
  if (!f) return [];
  const lido = lerLocal(f.local);
  const mudancas = [{ id, local: montarLocal("detalhe", lido.credito) }];
  if (lido.lugar === "capa") mudancas.push(...renumerarCapa(fotos.filter((x) => x.id !== id)));
  return so(mudancas, fotos);
}

/** Troca só o crédito da foto, sem mexer no lugar. */
export function trocarCredito(foto: FotoDoPainel, credito: string): string {
  const lido = lerLocal(foto.local);
  return montarLocal(lido.lugar, credito, lido.ordem);
}

/** Nome de cada lugar no painel, na ordem da página. */
export const NOME_DO_LUGAR: Record<Lugar, string> = {
  capa: "Capa",
  passagem: "O carro em movimento",
  chegada: "A chegada (Carro da Noiva)",
  saida: "A saída (Saída dos Noivos)",
  ensaio: "O ensaio",
  carro: "O carro",
  cenario: "Fotógrafos",
  final: "Convite final",
  detalhe: "Detalhes",
};
