import type { Metadata } from "next";
import "./chat.css";
import { fontesDaLanding } from "@/components/landing/fontes";

export const metadata: Metadata = {
  title: "Orçamento detalhado — Eu Casei de Lafer",
  description:
    "Converse com a Margot, confira se a sua data está livre e receba o orçamento do MP Lafer para o seu casamento na Serra Gaúcha.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  // As fontes da página inicial chegam por variável; o visual fica em chat.css.
  return <div className={fontesDaLanding}>{children}</div>;
}
