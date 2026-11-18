"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Estatísticas de visita da Vercel (sem cookies). Só contam as páginas públicas: o painel e os links
// de proposta e Termo (/p/<código>, /t/<código>) ficam de fora, porque o código no endereço dá acesso ao documento.
const FORA = /^\/(admin|p|t)(\/|$)/;

function filtrar(evento: BeforeSendEvent): BeforeSendEvent | null {
  try {
    return FORA.test(new URL(evento.url).pathname) ? null : evento;
  } catch {
    return null;
  }
}

export default function Estatisticas() {
  return <Analytics beforeSend={filtrar} />;
}
