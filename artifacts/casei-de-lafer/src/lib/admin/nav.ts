// Navegação do painel: qual aba está ligada em cada rota e quando o menu inferior some. Regra pura.

export type TabKey = "hoje" | "pedidos" | "conversas" | "dinheiro" | "mais";

/** Aba ligada na rota atual. Tudo que não é uma das quatro principais cai em "Mais". */
export function activeTab(pathname: string): TabKey {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/admin/hoje" || p.startsWith("/admin/hoje/")) return "hoje";
  if (p === "/admin/pedidos" || p.startsWith("/admin/pedidos/")) return "pedidos";
  if (p === "/admin/conversas" || p.startsWith("/admin/conversas/")) return "conversas";
  if (p === "/admin/financeiro" || p.startsWith("/admin/financeiro/")) return "dinheiro";
  return "mais";
}

/** Dentro de uma conversa o menu inferior some: o espaço é do teclado e da caixa de resposta. */
export function hidesTabBar(pathname: string): boolean {
  return /^\/admin\/conversas\/[^/]+\/?$/.test(pathname);
}

/** Telas sem moldura do painel (a de entrada). */
export function isBare(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}
