import type { Metadata } from "next";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import * as gestor from "@/lib/gestor/service";
import { todayISO } from "@/lib/gestor/rules";
import { datasLivres, fimDoProximoMes, mensagemDaData, mesesAte, origemDaPagina, type DiaLivre } from "@/lib/gestor/datas-livres";
import { margotNumber } from "@/lib/wa/numero-margot";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datas livres · Eu Casei de Lafer",
  description: "Dias livres para a chegada da noiva e para ensaios com o MP Lafer 1980 conversível, na Serra Gaúcha. Escolha a data e fale com a Margot no WhatsApp.",
  openGraph: { title: "Datas livres · Eu Casei de Lafer", images: [{ url: "/hero-desktop.jpg" }] },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

async function livres(): Promise<DiaLivre[]> {
  const hoje = todayISO();
  const ate = fimDoProximoMes(hoje);
  const meses = await Promise.all(mesesAte(hoje, ate).map((m) => gestor.monthAvailability(m.ano, m.mes).catch(() => null)));
  return datasLivres(meses.flatMap((m) => m?.dias ?? []), hoje, ate);
}

export default async function DatasLivres({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const origem = origemDaPagina((await searchParams).origem);
  const [dias, numero] = await Promise.all([livres(), margotNumber()]);
  const link = (d: DiaLivre | null) => getWhatsAppUrl(numero, mensagemDaData(d, origem));
  const porMes = new Map<string, DiaLivre[]>();
  for (const d of dias) {
    const key = d.data.slice(0, 7);
    porMes.set(key, [...(porMes.get(key) ?? []), d]);
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <Link href="/" className="font-sans text-sm text-text-muted hover:text-gold">
          Eu Casei de Lafer
        </Link>
        <h1 className="font-serif text-4xl sm:text-5xl text-gold mt-6 leading-tight">Datas livres</h1>
        <p className="font-sans text-text-secondary mt-4 leading-relaxed">
          Um só MP Lafer 1980 conversível, um evento por data. Escolha o dia e fale com a Margot, nossa assistente no WhatsApp: ela
          confirma a disponibilidade, tira as dúvidas e manda a proposta.
        </p>
        <p className="font-sans text-sm text-text-muted mt-2">Chegada da noiva, saída dos noivos e ensaios pré-wedding, em qualquer dia da semana.</p>

        {[...porMes.entries()].map(([mes, lista]) => {
          const fds = lista.filter((d) => d.fimDeSemana);
          const outros = lista.filter((d) => !d.fimDeSemana);
          return (
            <section key={mes} className="mt-12">
              <h2 className="font-serif text-2xl text-text-primary">
                {cap(MESES[Number(mes.slice(5, 7)) - 1])} de {mes.slice(0, 4)}
              </h2>
              {fds.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fds.map((d) => (
                    <li key={d.data}>
                      <a
                        href={link(d)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Quero ${d.rotulo}`}
                        className="flex flex-col gap-1 border border-gold/40 bg-bg-card px-4 py-3 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                      >
                        <span className="font-sans text-xs text-text-muted">{cap(d.rotulo.split(", ")[0])}</span>
                        <span className="font-serif text-2xl text-text-primary">{d.rotulo.split(", ")[1]}</span>
                        <span className="inline-flex items-center gap-1.5 font-sans text-sm text-gold">
                          <FaWhatsapp aria-hidden="true" /> Quero esta data
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {outros.length > 0 && (
                <p className="font-sans text-sm text-text-secondary mt-4 leading-relaxed">
                  Também livres durante a semana:{" "}
                  {outros.map((d, i) => (
                    <span key={d.data}>
                      <a href={link(d)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-gold">
                        {d.rotulo.split(", ")[1]}
                      </a>
                      {i < outros.length - 1 ? ", " : "."}
                    </span>
                  ))}
                </p>
              )}
            </section>
          );
        })}

        {dias.length === 0 && (
          <p className="font-sans text-text-secondary mt-12">As próximas semanas estão reservadas. Fale com a Margot para ver outras datas.</p>
        )}

        <div className="mt-14 border-t border-border-subtle pt-8">
          <p className="font-sans text-text-secondary">Sua data é mais para frente?</p>
          <a
            href={link(null)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-gold text-bg-primary font-sans font-medium px-6 py-3 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <FaWhatsapp aria-hidden="true" /> Consultar outra data
          </a>
        </div>
      </div>
    </main>
  );
}
