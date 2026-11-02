import "./theme.css";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { prePaintScript } from "@/lib/admin/look";

export const metadata: Metadata = {
  title: "Painel · Eu casei de Lafer",
  robots: "noindex, nofollow",
};

/**
 * Moldura de todas as telas do painel. O script abaixo roda antes da primeira pintura e já marca o <html>
 * com o tema escolhido neste aparelho (sem ele a tela piscaria no visual padrão). Fica aqui, num componente
 * de servidor, porque o React não executa <script> renderizado no navegador.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: prePaintScript() }} />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
