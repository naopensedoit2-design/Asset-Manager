"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import SectionWrapper from "@/components/ui/SectionWrapper";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { FaWhatsapp, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface BlockedDate {
  id: number;
  date: string;
  label: string;
}

function useBlockedDates() {
  return useQuery<BlockedDate[]>({
    queryKey: ["dates"],
    queryFn: () => fetch("/api/dates").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarWidget({ blockedDates }: { blockedDates: BlockedDate[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  const startWeekday = getDay(start);
  const paddingDays = Array.from({ length: startWeekday });

  const isBlocked = (day: Date) =>
    blockedDates.some((d) => isSameDay(new Date(d.date + "T12:00:00"), day));

  const isSaturday = (day: Date) => getDay(day) === 6;
  const isPast = (day: Date) => isBefore(day, today);

  return (
    <div className="bg-bg-card border border-border-subtle p-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="text-text-muted hover:text-gold transition-colors p-1"
          aria-label="Mês anterior"
        >
          <FaChevronLeft size={14} />
        </button>
        <h3 className="font-serif text-text-primary text-lg capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="text-text-muted hover:text-gold transition-colors p-1"
          aria-label="Próximo mês"
        >
          <FaChevronRight size={14} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className={`text-center text-xs font-sans py-1 ${
              d === "Sáb" ? "text-gold" : "text-text-muted"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const blocked = isBlocked(day);
          const sat = isSaturday(day);
          const past = isPast(day);
          const todayDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              title={blocked ? "Reservado" : sat ? "Sábado disponível" : undefined}
              className={[
                "aspect-square flex items-center justify-center text-xs font-sans transition-colors rounded-sm",
                past && !todayDay ? "opacity-25 cursor-default" : "",
                todayDay ? "ring-1 ring-gold/60" : "",
                blocked
                  ? "bg-red-900/40 text-red-400 line-through cursor-default"
                  : sat && !past
                  ? "bg-gold/10 text-gold font-semibold cursor-default"
                  : "text-text-secondary cursor-default",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gold/10 border border-gold/30" />
          <span className="text-text-muted text-xs">Sábado disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-900/40" />
          <span className="text-text-muted text-xs">Reservado</span>
        </div>
      </div>
    </div>
  );
}

const includedItems = [
  "Motorista trajado a rigor",
  "Decoração floral no veículo",
  "Flexibilidade de horário",
  "Cobertura na Serra Gaúcha",
];

export default function Investment() {
  const { data: blockedDates = [] } = useBlockedDates();
  const { data: siteConfig } = useSiteConfig();
  const whatsappUrl = getWhatsAppUrl(
    siteConfig?.whatsappNumber ?? "",
    "Olá! Gostaria de receber um orçamento personalizado para o MP Lafer no meu casamento.",
  );

  return (
    <SectionWrapper className="bg-bg-secondary">
      <div className="text-center mb-14">
        <p className="text-gold font-sans tracking-[0.3em] uppercase text-xs mb-4">
          Investimento & Disponibilidade
        </p>
        <h2 className="font-serif text-4xl md:text-5xl text-text-primary">
          Reserve sua Data
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-10 items-start">
        {/* Pricing */}
        <div className="flex flex-col gap-6">
          <div className="bg-bg-card border border-border-gold p-8">
            <p className="font-sans text-text-muted text-xs tracking-widest uppercase mb-3">
              Investimento
            </p>
            <p className="font-serif text-5xl text-gold mb-1">R$ 2.600</p>
            <p className="font-sans text-text-secondary text-sm mb-8">
              valor de entrada — orçamento final conforme data e serviço
            </p>

            <div className="divider-gold mb-8" />

            <ul className="space-y-3 mb-8">
              {includedItems.map((item) => (
                <li key={item} className="flex items-center gap-3 font-sans text-text-secondary text-sm">
                  <span className="text-gold text-xs">✦</span>
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-3 bg-gold text-black font-semibold uppercase tracking-widest text-sm py-4 transition-all duration-300 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(201,168,76,0.5)] active:scale-[0.97]"
            >
              <FaWhatsapp size={18} />
              Receber Orçamento
            </a>
          </div>

          <p className="font-sans text-text-muted text-xs text-center leading-relaxed">
            Os sábados marcados no calendário já estão reservados.
            <br />
            Verifique sua data e entre em contato para garantir.
          </p>
        </div>

        {/* Calendar */}
        <CalendarWidget blockedDates={blockedDates} />
      </div>
    </SectionWrapper>
  );
}
