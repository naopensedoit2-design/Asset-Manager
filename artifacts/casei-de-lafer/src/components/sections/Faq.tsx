"use client";

import { useState } from "react";
import SectionWrapper from "@/components/ui/SectionWrapper";

const faqs = [
  {
    question: "O que acontece se chover no dia do casamento?",
    answer:
      "O MP Lafer possui capota dobrável e pode ser operado com ela fechada em caso de chuva leve. Para chuvas mais intensas, colocamos a capota antecipadamente sem prejuízo ao visual do carro. Sua chegada será protegida e elegante em qualquer condição climática.",
  },
  {
    question: "Qual é a área de cobertura do serviço?",
    answer:
      "Atendemos toda a Serra Gaúcha, incluindo Bento Gonçalves, Gramado, Canela, Caxias do Sul, Flores da Cunha, Nova Prata e municípios vizinhos. Para localidades fora da Serra, consulte disponibilidade — avaliamos caso a caso com um custo adicional de deslocamento.",
  },
  {
    question: "Qual é a tolerância de atraso na cerimônia?",
    answer:
      "Trabalhamos com uma tolerância de até 30 minutos além do horário contratado, sem custo adicional. Sabemos que casamentos têm imprevistos, por isso o motorista estará sempre à postos e comunicado sobre a situação em tempo real.",
  },
  {
    question: "Como funciona o agendamento e confirmação da data?",
    answer:
      "O agendamento é feito diretamente via WhatsApp. Para confirmar a data, solicitamos um sinal de 50% do valor total. O restante é pago na semana do evento. A data só é bloqueada na agenda após a confirmação do sinal.",
  },
  {
    question: "É possível utilizar o MP Lafer para ensaio fotográfico?",
    answer:
      "Sim! O ensaio pré-wedding é uma de nossas especialidades. O veículo pode ser locado por período determinado (mínimo 2 horas) para sessões fotográficas em locações escolhidas por vocês na região. Entre em contato para montar o roteiro perfeito.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionWrapper className="bg-bg-primary">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-serif text-4xl md:text-5xl text-text-primary mb-4">
            Perguntas Frequentes
          </h2>
          <div className="w-12 h-px bg-gold mx-auto" />
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="border border-border-subtle hover:border-border-gold transition-colors duration-200"
              >
                <button
                  className="w-full flex items-center justify-between gap-4 p-6 text-left cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-text-primary text-lg leading-snug">
                    {faq.question}
                  </span>
                  <span
                    className={`text-gold flex-shrink-0 text-xl transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="font-sans text-text-secondary text-sm leading-relaxed px-6 pb-6">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}
