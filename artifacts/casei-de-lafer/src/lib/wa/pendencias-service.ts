// Banco das pendências da Margot (regras puras em pendencias.ts).

import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/gestor/rules";
import { concluir, gravarPendencia, lerPendencia, novaPendencia, PENDENCIA_PREFIX, pendenciaKey, pendenciasVisiveis, type Pendencia } from "./pendencias";

async function linhas() {
  return prisma.setting.findMany({ where: { key: { startsWith: PENDENCIA_PREFIX } } });
}

export async function listarPendencias(): Promise<Pendencia[]> {
  return pendenciasVisiveis(await linhas(), todayISO());
}

export async function anotarPendencia(texto: string): Promise<Pendencia | string> {
  const todas = (await linhas()).map((r) => lerPendencia(r.key, r.value)).filter((p): p is Pendencia => !!p);
  const p = novaPendencia(texto, todayISO(), todas);
  if (typeof p === "string") return p;
  await prisma.setting.create({ data: gravarPendencia(p) });
  return p;
}

export async function concluirPendencia(numero: number, nota: string): Promise<Pendencia | null> {
  const row = await prisma.setting.findUnique({ where: { key: pendenciaKey(numero) } });
  const atual = row ? lerPendencia(row.key, row.value) : null;
  if (!atual) return null;
  const feita = concluir(atual, todayISO(), nota);
  await prisma.setting.update({ where: { key: row!.key }, data: { value: gravarPendencia(feita).value } });
  return feita;
}
