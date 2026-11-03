"use client";

import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CALENDARIO } from "@/lib/landing/conteudo";
import { foco } from "./estilos";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const seta = "flex h-11 w-11 items-center justify-center text-text-secondary transition-colors hover:text-gold " + foco;

// "2026-11" -> 1º de novembro de 2026 no fuso de quem está lendo. Sem new Date() aqui: o servidor roda em UTC e o
// navegador no Brasil, e nas últimas 3 horas do mês eles discordam de qual mês é.
const primeiroDia = (aaaaMm: string) => {
  const [ano, mes] = aaaaMm.split("-").map(Number);
  return new Date(ano, mes - 1, 1);
};

// Só mostra o que é verdade: as datas já reservadas pelo negócio (as datas vêm do servidor). O resto do mês não é
// prometido como livre, porque a agenda também depende de compromissos que o público não vê.
export default function CalendarioPublico({ reservadas, mesInicial }: { reservadas: string[]; mesInicial: string }) {
  const [mes, setMes] = useState(() => primeiroDia(mesInicial));
  const ocupadas = new Set(reservadas);

  const dias = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) });
  const vazios = Array.from({ length: getDay(startOfMonth(mes)) });

  return (
    <div className="border border-border-subtle bg-bg-card p-5">
      <h3 className="font-serif text-xl text-text-primary">{CALENDARIO.titulo}</h3>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => setMes((m) => subMonths(m, 1))} className={seta} aria-label="Mês anterior">
          <span aria-hidden>&lsaquo;</span>
        </button>
        <p className="capitalize text-text-primary" aria-live="polite">
          {format(mes, "MMMM yyyy", { locale: ptBR })}
        </p>
        <button type="button" onClick={() => setMes((m) => addMonths(m, 1))} className={seta} aria-label="Próximo mês">
          <span aria-hidden>&rsaquo;</span>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-sm text-text-secondary">
        {DIAS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {vazios.map((_, i) => (
          <div key={`v${i}`} />
        ))}
        {dias.map((dia) => {
          const ocupado = ocupadas.has(format(dia, "yyyy-MM-dd"));
          return (
            <div
              key={dia.toISOString()}
              className={`flex aspect-square items-center justify-center text-sm ${
                ocupado ? "bg-bg-elevated text-text-secondary line-through decoration-2" : "text-text-primary"
              }`}
            >
              {format(dia, "d")}
              {ocupado && <span className="sr-only">, {CALENDARIO.legenda.toLowerCase()}</span>}
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-border-subtle pt-4 text-sm text-text-secondary">
        <span className="line-through decoration-2">00</span> {CALENDARIO.legenda}. {CALENDARIO.nota}
      </p>
    </div>
  );
}
