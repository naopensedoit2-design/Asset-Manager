import { Bot, ClipboardList, LayoutDashboard, Globe, Menu, MessageCircle, Plug, Sun, Wallet, type LucideIcon } from "lucide-react";
import type { TabKey } from "@/lib/admin/nav";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
}

/** As cinco abas do menu inferior. */
export const TABS: (NavItem & { key: TabKey })[] = [
  { key: "hoje", label: "Hoje", href: "/admin/hoje", icon: Sun },
  { key: "pedidos", label: "Pedidos", href: "/admin/pedidos", icon: ClipboardList },
  { key: "conversas", label: "Conversas", href: "/admin/conversas", icon: MessageCircle },
  { key: "dinheiro", label: "Dinheiro", href: "/admin/financeiro", icon: Wallet },
  { key: "mais", label: "Mais", href: "/admin/mais", icon: Menu },
];

/** O que fica atrás do "Mais" (e aparece direto no menu lateral do computador). */
export const MORE: NavItem[] = [
  { key: "conexoes", label: "Conexões", hint: "WhatsApp, Agenda, Instagram, e-mail e o que roda sozinho", href: "/admin/conexoes", icon: Plug },
  { key: "regras", label: "Margot e regras", hint: "Preços, prazos e como a Margot atende", href: "/admin/regras", icon: Bot },
  { key: "painel", label: "Painel completo", hint: "Indicadores, funil e calendário", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "site", label: "Site", hint: "Fotos, datas e textos do site público", href: "/admin/dashboard?aba=site", icon: Globe },
];
