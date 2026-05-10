import SectionWrapper from "@/components/ui/SectionWrapper";

const testimonials = [
  {
    stars: 5,
    text: "Contratar o MP Lafer foi a melhor decisão do nosso casamento. A chegada da noiva foi emocionante demais, todo mundo chorou! Obrigada por tornar esse sonho real.",
    couple: "Ana Carolina & Rodrigo",
    date: "casamento em março 2024",
  },
  {
    stars: 5,
    text: "O carro é simplesmente lindo e o serviço foi impecável. As fotos ficaram cinematográficas, parecia cena de filme. Superou todas as expectativas!",
    couple: "Juliana & Felipe",
    date: "casamento em outubro 2023",
  },
  {
    stars: 5,
    text: "Desde o primeiro contato até o dia do casamento, tudo foi perfeito. O MP Lafer deu um charme único à chegada da noiva. Recomendo demais!",
    couple: "Mariana & Bruno",
    date: "casamento em janeiro 2024",
  },
];

export default function Testimonials() {
  return (
    <SectionWrapper className="bg-bg-primary">
      <div className="text-center mb-14">
        <h2 className="font-serif text-4xl md:text-5xl text-text-primary mb-4">
          O Que Dizem as Noivas
        </h2>
        <div className="w-12 h-px bg-gold mx-auto" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div
            key={t.couple}
            className="bg-bg-card border border-border-subtle p-8 flex flex-col"
          >
            {/* Stars */}
            <div className="flex gap-1 mb-5">
              {Array.from({ length: t.stars }).map((_, i) => (
                <span key={i} className="text-gold text-sm">★</span>
              ))}
            </div>

            {/* Quote */}
            <p className="font-sans text-text-secondary text-sm leading-relaxed mb-6 flex-1">
              &ldquo;{t.text}&rdquo;
            </p>

            {/* Attribution */}
            <div>
              <p className="font-serif text-gold text-base">{t.couple}</p>
              <p className="font-sans text-text-muted text-xs mt-1">{t.date}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
