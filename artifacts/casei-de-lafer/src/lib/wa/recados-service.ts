// Banco dos recados do Leonardo (regras puras em recados.ts).

import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/gestor/rules";
import { gravarRecado, novoRecado, RECADO_MAX, RECADO_PREFIX, recadoKey, recadosDe, recadosValendo, type Recado } from "./recados";

export async function listarRecados(): Promise<Recado[]> {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: RECADO_PREFIX } } });
  return recadosValendo(rows, todayISO());
}

export async function guardarRecado(cliente: string, texto: string): Promise<Recado | string> {
  const atuais = await listarRecados();
  if (atuais.length >= RECADO_MAX) return `Já há ${RECADO_MAX} recados guardados. Apague algum antes (apagar_recado).`;
  const r = novoRecado(cliente, texto, todayISO(), Date.now().toString(36));
  if (typeof r === "string") return r;
  const g = gravarRecado(r);
  await prisma.setting.create({ data: g });
  return r;
}

export async function apagarRecado(id: string): Promise<boolean> {
  const { count } = await prisma.setting.deleteMany({ where: { key: recadoKey(id) } });
  return count > 0;
}

/** Recados que combinam com o nome da cliente; falha de banco nunca atrapalha o atendimento. */
export async function recadosDaCliente(nome: string): Promise<Recado[]> {
  try {
    return recadosDe(await listarRecados(), nome);
  } catch (e) {
    console.error("[whatsapp] recados", e);
    return [];
  }
}
